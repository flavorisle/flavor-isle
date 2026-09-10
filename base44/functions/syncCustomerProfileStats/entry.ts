import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Keeps CustomerProfile.total_orders / total_spent in sync when an order
// completes as paid. Invoked by the "Sync Customer Profile Stats" workflow
// (entity trigger on Order update → completed + paid), so there is no user
// auth context — all entity work runs as the service role.
//
// Rules (per the owner's spec):
//   1. Match the order's customer_email to a profile (case-insensitive).
//   2. Increment total_orders by 1 and add order.total to total_spent.
//   3. If no profile exists for the email, create one from the order.
//   4. Skip square-pos@flavorisle.com (POS walk-ins) and any order that is
//      not status="completed" with payment_status="paid".
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const orderId = body.order_id;
    if (!orderId) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    // Re-fetch server-side so we act on the current record, not the trigger
    // payload (which can be truncated for very large orders).
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Defense in depth: the workflow already gates on these, but re-check so
    // a manual invoke or a future caller can't inflate stats incorrectly.
    if (order.status !== 'completed' || order.payment_status !== 'paid') {
      return Response.json({ skipped: true, reason: 'not_completed_or_paid' });
    }

    const rawEmail = (order.customer_email || '').trim();
    const emailKey = rawEmail.toLowerCase();
    if (!emailKey) {
      return Response.json({ skipped: true, reason: 'no_customer_email' });
    }

    // Skip POS walk-in orders.
    if (emailKey === 'square-pos@flavorisle.com') {
      return Response.json({ skipped: true, reason: 'pos_walkin' });
    }

    const orderTotal = Number(order.total) || 0;

    // Case-insensitive match: the SDK filter is case-sensitive, so try the
    // exact stored email and the lowercased form. Covers the common cases
    // (profiles created from the order's own email, or seeded with mixed case).
    let profile = null;
    const byExact = await base44.asServiceRole.entities.CustomerProfile.filter({ email: rawEmail });
    if (byExact && byExact.length > 0) {
      profile = byExact[0];
    } else if (rawEmail !== emailKey) {
      const byLower = await base44.asServiceRole.entities.CustomerProfile.filter({ email: emailKey });
      if (byLower && byLower.length > 0) profile = byLower[0];
    }

    if (profile) {
      const newTotalOrders = (profile.total_orders || 0) + 1;
      const newTotalSpent = Number(((profile.total_spent || 0) + orderTotal).toFixed(2));
      await base44.asServiceRole.entities.CustomerProfile.update(profile.id, {
        total_orders: newTotalOrders,
        total_spent: newTotalSpent,
      });
      return Response.json({
        action: 'updated',
        profile_id: profile.id,
        email: profile.email,
        total_orders: newTotalOrders,
        total_spent: newTotalSpent,
      });
    }

    // No existing profile — create one from the order.
    const created = await base44.asServiceRole.entities.CustomerProfile.create({
      name: order.customer_name || '',
      email: rawEmail,
      total_orders: 1,
      total_spent: Number(orderTotal.toFixed(2)),
    });
    return Response.json({
      action: 'created',
      profile_id: created.id,
      email: created.email,
      total_orders: 1,
      total_spent: Number(orderTotal.toFixed(2)),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}