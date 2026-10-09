import { notifyOrderCancelled } from './cancelOrderFlow.ts';

// POS-side cancellations and refunds.
//
// The crew kills orders at the Square register all day: a refund rung up there,
// a ticket cancelled on the POS. Square leaves a refunded order COMPLETED, so
// neither showed up in the app — the money went back, the card still read paid,
// and an order still on the board had to be cancelled again on the website
// before the customer was told.
//
// Nothing here writes to Square or moves money: the register already did both.
// It reads what Square reports and brings the app's order in line.

export const POS_CANCEL_REASON = 'Cancelled at the register.';

// Statuses a register cancellation can still take down. Completed orders are
// history: a refund on one is money, not a cancellation.
export const CANCELABLE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];

const SQUARE_API = 'https://connect.squareup.com/v2';
const SQUARE_VERSION = '2026-09-16';
// Walk-in tickets carry a placeholder address and Square's own orders carry
// none — there is nobody to email.
const PLACEHOLDER_EMAIL = /@flavorisle\.(com|local)$/i;

function customerReachable(order: any): boolean {
  if (order?.order_source === 'in_store') return false;
  const email = String(order?.customer_email || '').trim();
  return Boolean(email) && !PLACEHOLDER_EMAIL.test(email);
}

// Square's default reason for a register refund ("Canceled Order") tells a
// customer nothing, so it is not passed on. Anything the crew actually typed is.
function typedRefundReason(refund: any): string | null {
  const typed = String(refund?.reason || '').trim();
  if (!typed) return null;
  return /^cancell?ed order$/i.test(typed) ? null : typed;
}

export async function listRecentSquareRefunds(accessToken: string, locationId: string, sinceIso: string) {
  const res = await fetch(
    `${SQUARE_API}/refunds?location_id=${encodeURIComponent(locationId)}&begin_time=${encodeURIComponent(sinceIso)}&sort_order=DESC&limit=100`,
    { headers: { Authorization: `Bearer ${accessToken}`, 'Square-Version': SQUARE_VERSION } },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = (data?.errors || []).map((e: any) => e?.detail || e?.code).filter(Boolean).join('; ');
    throw new Error(`Square refunds read failed: ${detail || res.status}`);
  }
  // A rejected or failed refund never moved money.
  return (data.refunds || []).filter((r: any) => !['REJECTED', 'FAILED'].includes(r?.status));
}

// One ticket can be refunded more than once (an item, then the rest), so add
// them up per Square order. Amounts stay in cents, the way Square reports them.
export function refundsByOrder(refunds: any[]): Map<string, { cents: number; reason: string }> {
  const totals = new Map<string, { cents: number; reason: string }>();
  for (const refund of refunds || []) {
    const squareOrderId = refund?.order_id;
    if (!squareOrderId) continue;
    const prev = totals.get(squareOrderId);
    totals.set(squareOrderId, {
      cents: (prev?.cents || 0) + Math.round(Number(refund?.amount_money?.amount || 0)),
      reason: typedRefundReason(refund) || prev?.reason || POS_CANCEL_REASON,
    });
  }
  return totals;
}

// Bring an order in line with a cancellation that already happened at the
// register, and tell the customer unless the ticket was a walk-in. The register
// did the Square cancel and the refund, so this only writes our side.
export async function mirrorPosCancellation(
  base44: any,
  order: any,
  { reason = POS_CANCEL_REASON, refunded = false, extra = {} }: { reason?: string; refunded?: boolean; extra?: Record<string, unknown> } = {},
) {
  // Runs can overlap (the five-minute schedule plus a manual one) and the crew
  // can cancel on the website at the same moment. Whoever gets there first owns
  // the customer's notice, so nobody is told twice. A failed read must not stop
  // the cancellation itself, so it falls through.
  const fresh = await base44.asServiceRole.entities.Order.get(order.id).catch(() => null);
  if (fresh?.status === 'cancelled') {
    if (Object.keys(extra).length) await base44.asServiceRole.entities.Order.update(order.id, extra);
    return { notified: false, alreadyCancelled: true, email: null, sms: null };
  }

  const patch: Record<string, unknown> = { status: 'cancelled', cancel_reason: reason, ...extra };
  if (refunded) patch.payment_status = 'refunded';
  await base44.asServiceRole.entities.Order.update(order.id, patch);

  if (!customerReachable(order)) return { notified: false, alreadyCancelled: false, email: null, sms: null };
  const result = await notifyOrderCancelled(base44, { ...order, ...patch }, { refunded });
  return { notified: true, alreadyCancelled: false, ...result };
}

// Settle every order Square has refunded since the last run: record the money,
// and when the refund clears the whole order while it is still on the board,
// mirror the cancellation the register performed.
export async function mirrorPosRefunds(base44: any, orderBySquareId: Map<string, any>, refunds: any[]) {
  const totals = refundsByOrder(refunds);
  let recorded = 0;
  let cancelled = 0;
  let notified = 0;

  for (const [squareOrderId, { cents, reason }] of totals) {
    const order = orderBySquareId.get(squareOrderId);
    if (!order) continue;

    // Already recorded on an earlier run — this pass re-reads the same window
    // every five minutes, so it must not write or notify twice.
    const alreadyCents = Math.round(Number(order.square_refund_amount || 0) * 100);
    if (cents <= alreadyCents) continue;

    const totalCents = Math.round(Number(order.total || 0) * 100);
    const full = totalCents > 0 && cents >= totalCents - 1;
    const patch: Record<string, unknown> = { square_refund_amount: cents / 100 };

    try {
      if (full && CANCELABLE_STATUSES.includes(order.status)) {
        const { notified: told, alreadyCancelled } = await mirrorPosCancellation(base44, order, { reason, refunded: true, extra: patch });
        if (!alreadyCancelled) cancelled++;
        if (told) notified++;
      } else {
        if (full && order.payment_status !== 'refunded') patch.payment_status = 'refunded';
        await base44.asServiceRole.entities.Order.update(order.id, patch);
      }
      recorded++;
    } catch (error) {
      console.error(`Could not record the Square refund on order ${order.order_number}:`, (error as Error).message);
    }
  }

  return { recorded, cancelled, notified };
}