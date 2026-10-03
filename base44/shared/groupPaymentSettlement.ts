// Group / split-payment settlement logic, shared by the Stripe webhook and the
// browser confirmOnlinePayment fallback. Group orders use stripe_session_id
// 'GROUP' on the parent Order, so the webhook can't match them the way it
// matches single orders — instead it matches each split intent against a
// GroupPaymentShare record (created by createGroupPayment) and settles the
// parent only when ALL shares succeed at the correct amounts.
//
// Both paths call settleGroupOrderIfComplete → pushOrderToSquareAndKitchen,
// whose per-action dedupe (square_sync_claimed_at, confirmation_email_sent_at,
// staff_alert_sent_at) guarantees one Square push and one customer/staff
// confirmation per fully paid order even if the webhook and browser race.

import { pushOrderToSquareAndKitchen } from './fulfillOrder.ts';

const TERMINAL = new Set(['succeeded', 'failed', 'canceled', 'refunded']);

// Settle the parent group order ONLY when every share is 'succeeded'. Marks
// the order paid + confirmed and pushes it to Square + the kitchen. Idempotent:
// the Order.update is guarded by the current status, and pushOrderToSquareAndKitchen
// skips work already done. Never settles a partial or failed group.
export async function settleGroupOrderIfComplete(base44: any, orderId: string) {
  const shares = await base44.asServiceRole.entities.GroupPaymentShare.filter({ order_id: orderId });
  if (!shares || shares.length === 0) return { settled: false, reason: 'no shares' };
  const allSucceeded = shares.every((s: any) => s.status === 'succeeded');
  if (!allSucceeded) return { settled: false, reason: 'partial or failed', shares };
  const order = await base44.asServiceRole.entities.Order.get(orderId);
  if (!order) return { settled: false, reason: 'order not found' };
  if (order.payment_status !== 'paid' || order.status === 'pending') {
    await base44.asServiceRole.entities.Order.update(order.id, { payment_status: 'paid', status: 'confirmed' });
  }
  await pushOrderToSquareAndKitchen(base44, { ...order, payment_status: 'paid', status: 'confirmed' });
  return { settled: true };
}

// Idempotently update a share's settlement status. For 'succeeded', verify the
// received amount and currency exactly match the expected share. Stale events
// that would revert a terminal state are ignored (except succeeded→refunded).
// No-op (found:false) for single-order intents, which have no GroupPaymentShare.
export async function updateGroupShareStatus(
  base44: any,
  intentId: string,
  status: string,
  amountReceivedCents?: number | null,
  currency = 'usd',
) {
  const shares = await base44.asServiceRole.entities.GroupPaymentShare.filter({ intent_id: intentId });
  if (!shares || shares.length === 0) return { found: false };
  const share = shares[0];
  let finalStatus = status;
  if (status === 'succeeded' && amountReceivedCents != null) {
    const expectedCents = Math.round((Number(share.expected_amount) || 0) * 100);
    if (currency !== 'usd' || amountReceivedCents !== expectedCents) {
      console.error(`Group share ${intentId} amount/currency mismatch: expected ${expectedCents}c USD, received ${amountReceivedCents}c ${currency} — marking failed`);
      finalStatus = 'failed';
    }
  }
  if (share.status === finalStatus) return { found: true, share, unchanged: true };
  if (TERMINAL.has(share.status) && !(share.status === 'succeeded' && finalStatus === 'refunded')) {
    return { found: true, share, unchanged: true };
  }
  await base44.asServiceRole.entities.GroupPaymentShare.update(share.id, {
    status: finalStatus,
    settled_at: new Date().toISOString(),
  });
  return { found: true, share, updated: true, finalStatus };
}

// Browser fallback path (confirmOnlinePayment): retrieve every share's intent
// from Stripe, update each share's status with amount verification, and settle
// the parent order ONLY when all shares succeeded at the correct amounts.
// Replaces the old blind "trust the client" settle for group orders — the
// parent is never marked paid without payment evidence. Legacy group orders
// (no GroupPaymentShare records) are NOT retroactively settled.
export async function verifyAndSettleGroupOrder(base44: any, stripe: any, orderId: string) {
  const shares = await base44.asServiceRole.entities.GroupPaymentShare.filter({ order_id: orderId });
  if (!shares || shares.length === 0) {
    return { ok: false, reason: 'no group shares found (legacy group order — cannot verify without payment evidence)' };
  }
  let allSucceeded = true;
  const statuses: any[] = [];
  for (const share of shares) {
    let piStatus = 'pending';
    let amountReceivedCents: number | null = null;
    let currency = '';
    try {
      const pi = await stripe.paymentIntents.retrieve(share.intent_id);
      piStatus = pi.status;
      amountReceivedCents = pi.amount_received ?? pi.amount ?? null;
      currency = pi.currency;
    } catch (e) {
      console.warn(`Group share ${share.intent_id} retrieve failed:`, (e as Error).message);
      allSucceeded = false;
      statuses.push({ person_name: share.person_name, status: 'unknown' });
      continue;
    }
    let mapped = 'pending';
    if (piStatus === 'succeeded') mapped = 'succeeded';
    else if (piStatus === 'canceled') mapped = 'canceled';
    else if (['requires_payment_method', 'requires_action', 'requires_confirmation'].includes(piStatus)) mapped = 'pending';
    else mapped = 'failed';
    if (mapped === 'succeeded' &&
        (currency !== 'usd' || amountReceivedCents !== Math.round((Number(share.expected_amount) || 0) * 100))) {
      mapped = 'failed';
    }
    await updateGroupShareStatus(base44, share.intent_id, mapped, amountReceivedCents, currency);
    if (mapped !== 'succeeded') allSucceeded = false;
    statuses.push({ person_name: share.person_name, status: mapped });
  }
  if (!allSucceeded) return { ok: false, partial: true, shares: statuses };
  return { ok: true, ...(await settleGroupOrderIfComplete(base44, orderId)) };
}