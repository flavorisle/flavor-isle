import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SQUARE_VERSION = '2024-01-18';
const DETAILS_KEY = { PICKUP: 'pickup_details', DELIVERY: 'delivery_details', SHIPMENT: 'shipment_details' };

// Cancels an order in the app AND voids its saved Square ticket (if it still
// exists and is open) so nothing lingers on the register.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { order_id } = await req.json();
    if (!order_id) return Response.json({ error: 'order_id is required' }, { status: 400 });

    const order = await base44.asServiceRole.entities.Order.get(order_id);
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    let squareCancelled = false;
    let squareNote = 'No Square ticket linked';

    if (order.square_order_id) {
      const connection = await base44.asServiceRole.connectors.getConnection('square');
      const sqHeaders = {
        'Authorization': `Bearer ${connection.accessToken}`,
        'Square-Version': SQUARE_VERSION,
        'Content-Type': 'application/json',
      };

      const getRes = await fetch(`https://connect.squareup.com/v2/orders/${order.square_order_id}`, { headers: sqHeaders });
      const getData = await getRes.json();
      if (!getRes.ok) throw new Error(getData.errors?.[0]?.detail || 'Could not load the Square ticket');
      const sq = getData.order;

      if (sq.state === 'OPEN') {
        // Fulfillments must be cancelled alongside the order or Square rejects it.
        const fulfillments = (sq.fulfillments || [])
          .filter((f) => !['COMPLETED', 'CANCELED', 'FAILED'].includes(f.state))
          .map((f) => {
            const patch = { uid: f.uid, state: 'CANCELED' };
            const key = DETAILS_KEY[f.type];
            if (key) patch[key] = { cancel_reason: 'Cancelled by Flavor Isle staff' };
            return patch;
          });

        const updRes = await fetch(`https://connect.squareup.com/v2/orders/${order.square_order_id}`, {
          method: 'PUT',
          headers: sqHeaders,
          body: JSON.stringify({
            idempotency_key: crypto.randomUUID(),
            order: { location_id: sq.location_id, version: sq.version, state: 'CANCELED', ...(fulfillments.length ? { fulfillments } : {}) },
          }),
        });
        const updData = await updRes.json();
        if (!updRes.ok) {
          console.error('Square cancel error:', JSON.stringify(updData.errors || updData));
          throw new Error(updData.errors?.[0]?.detail || 'Square refused to cancel the ticket');
        }
        squareCancelled = true;
        squareNote = 'Square ticket cancelled';
      } else if (sq.state === 'CANCELED') {
        squareCancelled = true;
        squareNote = 'Square ticket was already cancelled';
      } else {
        squareNote = `Square ticket is ${sq.state.toLowerCase()} and was left as-is — refund through Square if payment was taken`;
      }
    }

    await base44.asServiceRole.entities.Order.update(order.id, { status: 'cancelled' });

    return Response.json({ success: true, square_cancelled: squareCancelled, message: squareNote });
  } catch (error) {
    console.error('cancelSquareOrder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}