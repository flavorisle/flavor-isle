import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Public order-status lookup by order number. Guests tracking an order are not
// signed in, so entity RLS blocks direct reads — this returns only the safe,
// non-sensitive fields needed to render the tracker.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { order_number } = await req.json();
    const q = String(order_number || '').trim();
    if (!q) {
      return Response.json({ error: 'order_number is required' }, { status: 400 });
    }

    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: q });
    const order = orders?.[0];
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    return Response.json({
      order: {
        order_number: order.order_number,
        order_type: order.order_type,
        pickup_method: order.pickup_method || null,
        status: order.status,
        estimated_time: order.estimated_time || null,
        total: order.total,
        items: (order.items || []).map((i) => ({ name: i.name, quantity: i.quantity || 1 })),
        arrival_details: order.arrival_details
          ? {
              arrived_at: order.arrival_details.arrived_at || null,
              car_color: order.arrival_details.car_color || '',
              car_make: order.arrival_details.car_make || '',
              car_model: order.arrival_details.car_model || '',
            }
          : null,
      },
    });
  } catch (error) {
    console.error('lookupOrder error:', error.message);
    return Response.json({ error: 'Lookup failed' }, { status: 500 });
  }
});