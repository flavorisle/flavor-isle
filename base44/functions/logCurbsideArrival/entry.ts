import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { Twilio } from 'npm:twilio@5.3.3';

// Logs a curbside arrival from the order status page and notifies the kitchen
// via Smashie's SMS line. Special notes (extra ketchup, napkins, etc.) are
// rendered in their own clearly-marked section so the crew can't miss them.
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

    // Smashie's kitchen notification — notes get their own loud section.
    let kitchenMessage =
      `\n═══════════════════` +
      `\n🚗 CURBSIDE ARRIVAL — ORDER #${order.order_number}` +
      `\n═══════════════════` +
      `\n👤 CUSTOMER: ${order.customer_name || 'N/A'}` +
      `\n📍 ZONE: ${zone || 'Not specified'}` +
      `\n🚘 VEHICLE: ${vehicle || 'Not specified'}`;

    if (cleanNotes) {
      kitchenMessage +=
        `\n───────────────────` +
        `\n⚠️⚠️ SPECIAL NOTES ⚠️⚠️` +
        `\n${cleanNotes.toUpperCase()}` +
        `\n───────────────────`;
    }

    kitchenMessage += `\n⏰ RUN IT OUT — Smashie` + `\n═══════════════════`;

    const client = new Twilio(
      Deno.env.get('TWILIO_ACCOUNT_SID'),
      Deno.env.get('TWILIO_AUTH_TOKEN')
    );

    await client.messages.create({
      from: Deno.env.get('TWILIO_PHONE_NUMBER'),
      to: '+12705634618', // Kitchen phone number (Flavor Isle main line)
      body: kitchenMessage,
    });

    console.log(`Curbside arrival logged for order #${order.order_number}, zone: ${zone}, notes: ${cleanNotes || 'none'}`);
    return Response.json({ success: true, arrived_at: arrivedAt });
  } catch (error) {
    console.error('logCurbsideArrival error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}