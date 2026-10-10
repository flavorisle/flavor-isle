import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import twilio, { Twilio } from 'npm:twilio@5.3.3';
import { withRelayKey } from '../../shared/internalRelay.ts';

// Logs a curbside arrival from the order status page and notifies the kitchen
// by CALLING the counter phone in Smashie's voice. Special notes (extra
// ketchup, napkins, etc.) get their own clearly-spoken section, and the whole
// announcement repeats once so the crew can't miss it.
// Spoken text is built from customer-typed fields, so keep them to one short,
// plain line — no control characters, no newlines, nothing that could turn the
// kitchen announcement into the caller's own message.
function cleanField(value, max) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// One announcement per order every few minutes: a customer can re-request a
// while later, but an order number cannot be used to hammer the counter phone.
const ANNOUNCE_COOLDOWN_MS = 5 * 60 * 1000;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { order_number, zone, car_color, car_make, car_model, notes } = body;

    if (!order_number) {
      return Response.json({ error: 'Missing order_number' }, { status: 400 });
    }

    // Validate the order actually exists before notifying anyone.
    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: String(order_number) });
    const order = orders?.[0];
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Only a live curbside order may ring the kitchen, and only once per
    // cooldown — otherwise anyone could trigger repeated counter calls for
    // random order numbers and have chosen text read out loud.
    if (order.pickup_method !== 'curbside') {
      return Response.json({ error: 'This order is not a curbside pickup' }, { status: 400 });
    }
    if (['cancelled', 'completed', 'delivered'].includes(order.status)) {
      return Response.json({ error: 'This order is no longer active' }, { status: 400 });
    }
    const previousArrival = order.arrival_details?.arrived_at
      ? new Date(order.arrival_details.arrived_at).getTime()
      : 0;
    if (previousArrival && Date.now() - previousArrival < ANNOUNCE_COOLDOWN_MS) {
      return Response.json({ success: true, arrived_at: order.arrival_details.arrived_at, already: true });
    }

    const arrivedAt = new Date().toISOString();
    const cleanNotes = cleanField(notes, 200);
    const cleanZone = cleanField(zone, 40);
    const cleanColor = cleanField(car_color, 30);
    const cleanMake = cleanField(car_make, 30);
    const cleanModel = cleanField(car_model, 30);

    // Persist arrival on the order so admins can see it in the dashboard.
    await base44.asServiceRole.entities.Order.update(order.id, {
      arrival_details: {
        arrived_at: arrivedAt,
        zone: cleanZone,
        car_color: cleanColor,
        car_make: cleanMake,
        car_model: cleanModel,
        notes: cleanNotes,
      },
    });

    const vehicle = [cleanColor, cleanMake, cleanModel].filter(Boolean).join(' ');

    // Spoken announcement — order number read digit by digit so it's clear.
    const spokenOrderNumber = String(order.order_number).split('').join(', ');
    let announcement =
      `Heads up crew, curbside arrival! Order number ${spokenOrderNumber}. ` +
      `Customer: ${order.customer_name || 'unknown'}. ` +
      `Parked at ${cleanZone || 'an unspecified zone'}. ` +
      `Vehicle: ${vehicle || 'not specified'}. `;
    if (cleanNotes) {
      announcement += `Special notes: ${cleanNotes}. `;
    }
    announcement += `Run it out!`;

    // Speak in Smashie's voice via the TTS endpoint, and repeat once.
    const ttsUrl = new URL('https://flavor-isle.com/functions/smashieTts');
    ttsUrl.searchParams.set('text', announcement);
    withRelayKey(ttsUrl);
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.play({}, ttsUrl.toString());
    twiml.pause({ length: 1 });
    twiml.play({}, ttsUrl.toString());
    twiml.hangup();

    const client = new Twilio(
      Deno.env.get('TWILIO_ACCOUNT_SID'),
      Deno.env.get('TWILIO_AUTH_TOKEN')
    );

    await client.calls.create({
      from: Deno.env.get('TWILIO_PHONE_NUMBER'),
      to: Deno.env.get('COUNTER_PHONE_NUMBER') || '+12705634618', // Counter phone (falls back to main line)
      twiml: twiml.toString(),
    });

    console.log(`Curbside arrival logged for order #${order.order_number}, zone: ${zone}, notes: ${cleanNotes || 'none'}`);
    return Response.json({ success: true, arrived_at: arrivedAt });
  } catch (error) {
    console.error('logCurbsideArrival error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}