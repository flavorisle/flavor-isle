import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Stores a browser push subscription so order milestones can reach the device.
//
// Signed-in customers: the subscription is tied to their account email.
// Guests who just ordered: they may send the email they ordered with plus the
// order number — the pair is checked against the Order record before anything
// is stored, so nobody can subscribe someone else's email.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { endpoint, keys, email, order_number, platform } = await req.json();
    if (!endpoint || !keys) return Response.json({ error: 'Missing endpoint or keys' }, { status: 400 });

    let user = null;
    try {
      user = await base44.auth.me();
    } catch (_) {
      user = null;
    }

    let subscriberEmail = user?.email || null;
    let subscriberUserId = user?.id || null;
    let orderNumber = order_number ? String(order_number) : null;

    if (!subscriberEmail) {
      // Guest path — the order number and email must belong together.
      if (!order_number || !email) {
        return Response.json({ error: 'Sign in, or send the email and order number you ordered with.' }, { status: 400 });
      }
      const wanted = String(email).trim().toLowerCase();
      const orders = await base44.asServiceRole.entities.Order.filter({ order_number: String(order_number) });
      const match = (orders || []).find((o) => (o.customer_email || '').trim().toLowerCase() === wanted);
      if (!match) {
        return Response.json({ error: "That email doesn't match that order number. Check the email on your receipt." }, { status: 403 });
      }
      subscriberEmail = match.customer_email;
      subscriberUserId = match.customer_id || null;
      orderNumber = match.order_number || orderNumber;
    }

    // Upsert by endpoint — a browser can re-subscribe with the same endpoint.
    const existing = await base44.asServiceRole.entities.PushSubscription.filter({ endpoint });
    const payload = {
      keys,
      email: subscriberEmail,
      user_id: subscriberUserId || '',
      order_number: orderNumber || '',
      platform: platform || '',
    };
    if (existing && existing.length > 0) {
      await base44.asServiceRole.entities.PushSubscription.update(existing[0].id, payload);
    } else {
      await base44.asServiceRole.entities.PushSubscription.create({ endpoint, ...payload });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
