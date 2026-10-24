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
//
// Callers hand this function either the platform's service-role client (the
// payments-webhook holds that one) or the full SDK client (the settle route and the
// payment automation). The service-role client carries entities, functions and
// integrations but has no `.asServiceRole` of its own, while everything below — and
// the shared fulfillment path — reaches for both. Pointing it at itself makes the
// two callers behave identically instead of throwing on every webhook delivery.
function sdkClient(client: any): any {
  if (client?.asServiceRole) return client;
  const shim = Object.create(client);
  shim.asServiceRole = shim;
  return shim;
}

export async function settleWixWebOrder(client: any, { orderNumber, checkoutSessionId = '', wixOrderId = '', amount = null }) {
  const base44 = sdkClient(client);
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

// The settlement check behind the pay page, the admin payment actions and the
// sweeper. It asks the platform's own purchase record whether this order's checkout
// session was paid, and only then runs the same settlement above — so an order is
// never marked paid on our say-so, only on the provider's. Never throws: a page that
// cannot read the payment shows the order as it is instead of erroring in the
// customer's face.
export async function settleWixPhonePayment(client: any, order: any) {
  const base44 = sdkClient(client);
  if (order?.payment_provider !== 'wix' || order?.payment_status === 'paid') return order;
  const checkoutId = String(order?.wix_checkout_session_id || '').trim();
  if (!checkoutId) return order;

  try {
    const page = await base44.asServiceRole.payments.listPurchases({ checkout_id: checkoutId, limit: 5 });
    const purchase = (page?.items || [])[0];
    if (!purchase || purchase.status !== 'paid') return order;

    const settled = await settleWixWebOrder(base44, {
      orderNumber: order.order_number,
      checkoutSessionId: checkoutId,
      amount: purchase.amount_total != null ? Number(purchase.amount_total) / 100 : null,
    });
    if (!settled.ok) {
      console.error(`Base44 Payments settlement check failed for order ${order.order_number}:`, settled.error);
      return order;
    }
    return await base44.asServiceRole.entities.Order.get(order.id);
  } catch (error) {
    console.error(`Base44 Payments settlement check failed for order ${order.order_number}:`, (error as Error).message);
    return order;
  }
}