import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Keeps CustomerProfile.total_orders / total_spent in sync when an order
// completes as paid. Invoked by the "Sync Customer Profile Stats" workflow
// (entity trigger on Order update → completed + paid) AND called directly
// from syncSquareOrderStatus after bulkUpdate (bulk methods skip entity
// triggers, so the workflow alone is unreliable).
//
// Rules (per the owner's spec):
//   1. Match the order's customer_email to a profile (case-insensitive).
//   2. Recompute total_orders / total_spent from ALL paid+completed orders
//      for that email — not increment — so any drift self-heals.
//   3. If no profile exists, create one (name + email + preferred_communication
//      "email"), with the email normalized to lowercase.
//   4. Skip square-pos@flavorisle.com, wesleyrbooker1@gmail.com,
//      wesley@flavor-isle.com, test@example.com.
//   5. Only count orders with status="completed" AND payment_status="paid".

const SKIP_EMAILS = new Set([
  'square-pos@flavorisle.com',
  'wesleyrbooker1@gmail.com',
  'wesley@flavor-isle.com',
  'test@example.com',
]);

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

    // Defense in depth: re-check so a manual invoke can't inflate stats.
    if (order.status !== 'completed' || order.payment_status !== 'paid') {
      return Response.json({ skipped: true, reason: 'not_completed_or_paid' });
    }

    const rawEmail = (order.customer_email || '').trim();
    const emailKey = rawEmail.toLowerCase();
    if (!emailKey) {
      return Response.json({ skipped: true, reason: 'no_customer_email' });
    }

    if (SKIP_EMAILS.has(emailKey)) {
      return Response.json({ skipped: true, reason: 'skip_email' });
    }

    // The SDK filter is case-sensitive, so try multiple case variants and
    // combine. This catches profiles/orders stored with mixed case (e.g.
    // KYLAPRICE54@YAHOO.COM vs kylaprice54@yahoo.com).
    const emailVariants = Array.from(new Set([rawEmail, emailKey, rawEmail.toUpperCase()]));

    // --- Recompute totals from ALL paid+completed orders for this email ---
    // Self-heals any drift from missed syncs or manual edits.
    const orderSets = await Promise.all(
      emailVariants.map(v =>
        base44.asServiceRole.entities.Order.filter({ customer_email: v }, '-created_date', 500)
          .catch(() => [])
      )
    );
    const seenOrderIds = new Set();
    const qualifyingOrders = orderSets.flat().filter(o => {
      if (seenOrderIds.has(o.id)) return false;
      seenOrderIds.add(o.id);
      return o.status === 'completed' && o.payment_status === 'paid';
    });
    const totalOrders = qualifyingOrders.length;
    const totalSpent = Number(qualifyingOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0).toFixed(2));

    // --- Case-insensitive profile match ---
    const profileSets = await Promise.all(
      emailVariants.map(v =>
        base44.asServiceRole.entities.CustomerProfile.filter({ email: v })
          .catch(() => [])
      )
    );
    let profile = profileSets.flat().find(p => (p.email || '').toLowerCase() === emailKey) || null;

    if (profile) {
      const updates = { total_orders: totalOrders, total_spent: totalSpent };
      // Normalize stored email to lowercase if it's not already.
      if (profile.email !== emailKey) {
        updates.email = emailKey;
      }
      await base44.asServiceRole.entities.CustomerProfile.update(profile.id, updates);
      return Response.json({
        action: 'updated',
        profile_id: profile.id,
        email: emailKey,
        total_orders: totalOrders,
        total_spent: totalSpent,
      });
    }

    // No existing profile — create one with normalized lowercase email.
    const created = await base44.asServiceRole.entities.CustomerProfile.create({
      name: order.customer_name || '',
      email: emailKey,
      preferred_communication: 'email',
      total_orders: totalOrders,
      total_spent: totalSpent,
    });
    return Response.json({
      action: 'created',
      profile_id: created.id,
      email: emailKey,
      total_orders: totalOrders,
      total_spent: totalSpent,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}