import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import twilio, { Twilio } from 'npm:twilio@5.3.3';
import { withRelayKey } from '../../shared/internalRelay.ts';

// One-way kitchen announcement for a curbside arrival whose two-way relay call
// went unanswered. Called server-to-server by the Insights agent, never by the
// customer's browser: it reads only the arrival the order already stored and
// makes the same counter call logCurbsideArrival used to make.
// Spoken text is built from fields the customer typed, so keep them to one
// short, plain line — no control characters, no newlines, nothing that could
// turn the kitchen announcement into the caller's own message.
function cleanField(value, max) {
  return String(value || '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

// Same rule as the arrival logger: one announcement per order every few minutes,
// so a repeated call for the same order cannot hammer the counter phone.
const ANNOUNCE_COOLDOWN_MS = 5 * 60 * 1000;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const orderNumber = String(body?.order_number || '').trim();

    if (!orderNumber) {
      return Response.json({ error: 'Missing order_number' }, { status: 400 });
    }

    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber });
    const order = orders?.[0];
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.pickup_method !== 'curbside') {
      return Response.json({ error: 'This order is not a curbside pickup' }, { status: 400 });
    }
    if (['cancelled', 'completed', 'delivered'].includes(order.status)) {
      return Response.json({ error: 'This order is no longer active' }, { status: 400 });
    }

    const arrival = order.arrival_details || {};
    const previousArrival = arrival.arrived_at ? new Date(arrival.arrived_at).getTime() : 0;
    if (previousArrival && Date.now() - previousArrival < ANNOUNCE_COOLDOWN_MS) {
      return Response.json({ success: true, already: true });
    }

    const cleanZone = cleanField(arrival.zone, 40);
    const cleanNotes = cleanField(arrival.notes, 200);
    const vehicle = [
      cleanField(arrival.car_color, 30),
      cleanField(arrival.car_make, 30),
      cleanField(arrival.car_model, 30),
    ].filter(Boolean).join(' ');

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

    console.log(`Curbside fallback announcement placed for order #${order.order_number}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('curbsideFallbackAnnounce error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}