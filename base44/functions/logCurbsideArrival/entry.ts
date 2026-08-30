import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import twilio, { Twilio } from 'npm:twilio@5.3.3';

// Logs a curbside arrival from the order status page and notifies the kitchen
// by CALLING the counter phone in Smashie's voice. Special notes (extra
// ketchup, napkins, etc.) get their own clearly-spoken section, and the whole
// announcement repeats once so the crew can't miss it.
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

    const arrivedAt = new Date().toISOString();
    const cleanNotes = (notes || '').trim().substring(0, 500);

    // Persist arrival on the order so admins can see it in the dashboard.
    await base44.asServiceRole.entities.Order.update(order.id, {
      arrival_details: {
        arrived_at: arrivedAt,
        zone: zone || '',
        car_color: car_color || '',
        car_make: car_make || '',
        car_model: car_model || '',
        notes: cleanNotes,
      },
    });

    const vehicle = [car_color, car_make, car_model].filter(Boolean).join(' ');

    // Spoken announcement — order number read digit by digit so it's clear.
    const spokenOrderNumber = String(order.order_number).split('').join(', ');
    let announcement =
      `Heads up crew, curbside arrival! Order number ${spokenOrderNumber}. ` +
      `Customer: ${order.customer_name || 'unknown'}. ` +
      `Parked at ${zone || 'an unspecified zone'}. ` +
      `Vehicle: ${vehicle || 'not specified'}. `;
    if (cleanNotes) {
      announcement += `Special notes: ${cleanNotes}. `;
    }
    announcement += `Run it out!`;

    // Speak in Smashie's voice via the TTS endpoint, and repeat once.
    const ttsUrl = new URL('https://crave.flavor-isle.com/functions/smashieTts');
    ttsUrl.searchParams.set('text', announcement);
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