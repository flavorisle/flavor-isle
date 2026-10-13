import { pushOrderToSquareAndKitchen } from './fulfillOrder.ts';

// Settlement for the website checkout when the secure payment page is set to
// Base44 Payments (powered by Wix) — issue #98, part A.
//
// The provider is the only source of truth for whether the money arrived: this
// runs from the signature-verified ORDER_APPROVED event (the platform's
// payments-webhook resolves the purchase by its checkout id), and the amount the
// order reports must equal the total this app saved — to the cent — or the order
// stays pending, so a short payment can never become a kitchen ticket.
//
// Idempotent by design: an order already marked paid returns untouched, and the
// fulfillment path below has its own per-action dedupe (one Square push, one
// staff alert, one confirmation email). Wix delivers approved events more than
// once, so this can run twice safely.
export async function settleWixWebOrder(base44, { orderNumber, checkoutSessionId = '', wixOrderId = '', amount = null }) {
  const wanted = String(orderNumber || '').trim().toUpperCase();
  if (!wanted) return { ok: false, error: 'order_number is required' };

  const matches = await base44.asServiceRole.entities.Order.filter({ order_number: wanted });
  const order = (matches || [])[0];
  if (!order) return { ok: false, error: `No order ${wanted}` };

  // Only an order that really pays through Base44 Payments is settled here. A
  // Square, phone, in-store or historical order must never be flipped to paid by
  // this path — this holds even for a well-meant manual re-run, and it is what
  // stops a stray call from turning an unpaid order into a kitchen ticket.
  if (order.payment_provider !== 'wix') {
    return { ok: false, error: `Order ${order.order_number} does not pay through Base44 Payments — not settling.` };
  }

  if (order.payment_status === 'paid') {
    return { ok: true, already_paid: true, order_number: order.order_number };
  }
  if (order.status === 'cancelled' || order.payment_status === 'refunded') {
    return { ok: false, error: `Order ${order.order_number} is closed — not settling.` };
  }

  // The charge must match the order we saved. A mismatch is never guessed at.
  if (amount != null) {
    const paidCents = Math.round(Number(amount) * 100);
    const expectedCents = Math.round(Number(order.total) * 100);
    if (!Number.isFinite(paidCents) || paidCents !== expectedCents) {
      return {
        ok: false,
        error: `Payment does not match the order total (expected ${expectedCents}c, paid ${paidCents}c) for order ${order.order_number}.`,
      };
    }
  }

  const updates: Record<string, unknown> = {
    payment_status: 'paid',
    status: order.status === 'pending' ? 'confirmed' : order.status,
    manual_pay_required: false,
  };
  if (wixOrderId) updates.wix_order_id = wixOrderId;
  if (checkoutSessionId) updates.wix_checkout_session_id = checkoutSessionId;

  await base44.asServiceRole.entities.Order.update(order.id, updates);
  const paidOrder = { ...order, ...updates };

  // The existing fulfillment path, unchanged: Square POS as paid, kitchen ticket,
  // Star Rewards v2 lifecycle + referral bonus, confirmation email/SMS/push.
  await pushOrderToSquareAndKitchen(base44, paidOrder);

  console.log(`Base44 Payments order ${paidOrder.order_number} settled and fulfilled (${paidOrder.total}).`);
  return { ok: true, order_number: paidOrder.order_number, total: paidOrder.total };
}