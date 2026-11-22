import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Public by design: the customer worth watching is usually not signed in. The page
// writes only its own checkout progress — never an order, a price or a payment
// state — and only the watchdog reads these rows, with the service role.
//
// Issue #352: a customer can be stopped on checkout page 1 and never reach the
// payment page (a modifier rule the server refuses, a missing field, a delivery
// quote). No order is created in that case, so no order-based check can see them.
// One row per checkout visit answers "did they get through, and what stopped them".
const STAGES = ['details', 'payment', 'paid'];
const STAGE_RANK = { details: 0, payment: 1, paid: 2 };

function text(value: unknown, max: number): string {
  return String(value ?? '').trim().slice(0, max);
}

function money(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const sessionId = text(body?.session_id, 80);
    // The page's own random id. Anything else is refused rather than written.
    if (!/^[A-Za-z0-9_-]{8,80}$/.test(sessionId)) {
      return Response.json({ ok: false, error: 'A checkout session id is required' }, { status: 400 });
    }

    const stage = STAGES.includes(body?.stage) ? body.stage : 'details';
    const reason = text(body?.blocked_reason, 500);
    const nowIso = new Date().toISOString();
    const db = base44.asServiceRole.entities;

    const existingPage = await db.CheckoutAttempt.filter({ session_id: sessionId }, { sort: '-created_date', limit: 1 });
    const existing = (Array.isArray(existingPage) ? existingPage : existingPage?.items || [])[0] || null;

    const fresh = {
      order_type: text(body?.order_type, 30),
      item_count: Math.max(0, Math.round(Number(body?.item_count) || 0)),
      subtotal: money(body?.subtotal),
      items_summary: text(body?.items_summary, 600),
      customer_name: text(body?.customer_name, 120),
      customer_email: text(body?.customer_email, 200),
      order_number: text(body?.order_number, 60),
    };

    if (!existing) {
      await db.CheckoutAttempt.create({
        session_id: sessionId,
        stage,
        ...fresh,
        blocked_reason: reason,
        blocked_count: reason ? 1 : 0,
        blocked_at: reason ? nowIso : '',
        reached_payment_at: stage === 'details' ? '' : nowIso,
        last_seen_at: nowIso,
        user_agent: text(req.headers.get('user-agent'), 300),
      });
      return Response.json({ ok: true, created: true });
    }

    // Only the fields this ping carries, and never a step backwards: a late
    // heartbeat from page 1 must not undo "reached the payment page".
    const patch: Record<string, unknown> = { last_seen_at: nowIso };
    for (const [key, value] of Object.entries(fresh)) {
      if (value) patch[key] = value;
    }
    if (STAGE_RANK[stage] > STAGE_RANK[existing.stage || 'details']) {
      patch.stage = stage;
      patch.reached_payment_at = nowIso;
    }
    if (reason) {
      patch.blocked_reason = reason;
      patch.blocked_at = nowIso;
      patch.blocked_count = (Number(existing.blocked_count) || 0) + 1;
    }
    await db.CheckoutAttempt.update(existing.id, patch);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('logCheckoutAttempt error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}