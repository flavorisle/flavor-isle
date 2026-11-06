# Item-level refunds — issue #116, Part F

**Approved by:** Wesley, Oct 23 2026 and again Nov 5 2026 ("Approved all but Ashley order alerts")
**Issue:** GitHub #116, Part F (Parts A–E untouched)
**Build:** `npm run build` → exit 0
**Refunds issued during this build:** none. No test order was created.

## What this adds

Refund one bad item without cancelling the ticket, money back on the original
payment method, to the cent.

| File | Change |
|---|---|
| `base44/shared/itemRefund.ts` | **new** — `refundOrderItem` + the register-refund detector |
| `base44/functions/refundOrderItem/entry.ts` | **new** — admin-only endpoint |
| `base44/shared/squareRefund.ts` | new export `refundSquareOrderItem` |
| `base44/functions/syncSquareOrderStatus/entry.ts` | reads Square's refunds for item-level matches |
| `base44/entities/Order.jsonc` | `item_refunds`, `cash_back_needed`, `item_refund_alerted_at` |
| `src/pages/AdminOrders.jsx` | "Item refunds" block + cash-back badge (step 5) |

Step 5 was edited in **`src/pages/AdminOrders.jsx`** — the `OrderCard` that
already renders `square_refund_amount`. Nothing else on that page changed.

## How the money moves

1. **Amount guard.** A line's refund is `item.price × quantity` plus that line's
   share of the order's tax (`line × order.tax / order.subtotal`, only when both
   are above zero). If the request does not equal that within one cent, nothing
   is refunded: `item_refund_alerted_at` is stamped and Wesley is emailed the
   order number, item, requested amount and computed amount.
2. **Square** → `refundSquareOrderItem` sends an exact partial refund against the
   payment that paid the order, never more than Square still holds on it.
3. **Base44 Payments (Wix)** → the existing `refundWixAmount` helper on main
   already refunds an exact amount, not just a whole order, so an item goes back
   through it with its own idempotency key. No partial charge is improvised and
   no dashboard step is needed, so the `wix_partial_unavailable` branch never
   fires with the helper that is actually on main. If that helper ever regresses
   to whole-order-only, the item must go back as `cash_back_needed` instead.
4. **Cash orders / retired processors / Helcim-era numbers** (`080862`, `386862`,
   `843902`, `069737`, `727169`, `093585`, `014472`) → `cash_back_needed`, Wesley
   emailed, nothing refunded on a card.
5. **A refund that came from the register** (actor `square-pos`) is already done:
   it is recorded and the customer is told, but no processor is called a second
   time. Without that, detection would refund the same item twice.

On success the order gets an `item_refunds` entry, `square_refund_amount` grows
by the amount, the customer gets a short Smashie email through the same Resend
sender and from-address the order emails use, plus the order text *only* with
transactional consent, and Wesley gets a one-line record. Both notices are
logged on one `SmsDeliveryLog` row, the way the status path records a text and
the email beside it — that entity was not modified (its milestone field accepts
the new `item_refund` value, verified live before writing).

## Final module, verbatim — `base44/shared/itemRefund.ts`

```ts
import { refundSquareOrderItem } from './squareRefund.ts';
import { refundWixAmount } from './wixRefund.ts';
import { sendOrderStatusEmail } from './sendOrderEmails.ts';
import { checkSmsConsent, markSmsSent } from './smsConsent.ts';
import { normalizePhone, sendSmashieSms } from './sendSmashieSms.ts';

// Item-level refunds — GitHub issue #116, Part F. Approved by Wesley Oct 23 2026
// and again Nov 5 2026 ("Approved all but Ashley order alerts").
//
// One bad item goes back on the original payment method, to the cent, without
// cancelling the ticket. Three rules decide how the money moves:
//
//   1. The amount is computed here, never taken on trust. A line is its own
//      price × quantity plus that line's share of the order's tax. If the
//      request does not match that to the cent, nothing is refunded and Wesley
//      is emailed the numbers instead.
//   2. Card refunds go back the way they came: Square for Square-paid orders,
//      the platform's own refund API for Base44 Payments (Wix) orders.
//   3. Everything else is cash-back-by-hand: cash orders, retired processors,
//      and the Helcim-era tickets below. A card refund there would invent money.
//
// A refund that arrived from the register (actorEmail 'square-pos') is already
// done: it is recorded and the customer is told, but no processor is called a
// second time.

const ALERT_TO = 'wesleyrbooker1@gmail.com';

// Helcim-era order numbers: always cash back, whatever payment_provider says.
const HELCIM_ERA_ORDER_NUMBERS = new Set([
  '080862', '386862', '843902', '069737', '727169', '093585', '014472',
]);

const money = (value: any) => `$${(Number(value) || 0).toFixed(2)}`;
const toCents = (value: any) => Math.round((Number(value) || 0) * 100);

// What a line item is worth back: its price × quantity, plus that line's share
// of the tax. Tax is shared across the subtotal, never guessed.
export function itemRefundAmount(order: any, item: any, quantity: number) {
  const line = (Number(item?.price) || 0) * Math.max(1, Math.floor(Number(quantity) || 1));
  const subtotal = Number(order?.subtotal) || 0;
  const tax = Number(order?.tax) || 0;
  const share = subtotal > 0 && tax > 0 ? line * (tax / subtotal) : 0;
  return Math.round((line + share) * 100) / 100;
}

// First item whose name matches (case-insensitive), preferring one that still
// has enough quantity left to cover the request.
function findOrderItem(order: any, itemName: string, quantity: number) {
  const wanted = String(itemName || '').trim().toLowerCase();
  if (!wanted) return null;
  const items = Array.isArray(order?.items) ? order.items : [];
  const named = items.filter((item: any) => String(item?.name || '').trim().toLowerCase() === wanted);
  if (named.length === 0) return null;
  return named.find((item: any) => Number(item?.quantity || 1) >= quantity) || named[0];
}

async function alertWesley(subject: string, lines: string[]) {
  try {
    await sendOrderStatusEmail(ALERT_TO, subject, lines.filter(Boolean).join('\n'), 'Flavor Isle Refunds');
  } catch (error: any) {
    console.error('Item refund alert email failed:', error?.message || error);
  }
}

// Cash-back paths all end here: flag the order so the admin view shows the
// badge, tell Wesley exactly what to hand over, and refund nothing on a card.
async function cashBackNeeded(base44: any, order: any, { item, quantity, amount, why }: any) {
  await base44.asServiceRole.entities.Order.update(order.id, { cash_back_needed: true });
  await alertWesley(`CASH BACK NEEDED — order #${order.order_number || order.id}`, [
    `Order #${order.order_number || order.id} (${order.customer_name || 'unknown customer'})`,
    `Item: ${quantity > 1 ? `${quantity}x ` : ''}${item.name}`,
    `Amount to hand back: ${money(amount)}`,
    `Why: ${why}`,
    '',
    'This one cannot go back on a card. Hand the money back and clear the badge on the order.',
  ]);
  return { ok: false, reason: 'cash_back_needed', amount };
}

export async function refundOrderItem(base44: any, {
  orderId, itemName, quantity, amount, reason, actorEmail, refundId,
}: {
  orderId: string;
  itemName: string;
  quantity?: number;
  amount: number;
  reason?: string;
  actorEmail?: string;
  refundId?: string;
}) {
  const order = await base44.asServiceRole.entities.Order.get(orderId).catch(() => null);
  if (!order) return { ok: false, reason: 'order_not_found' };

  const refId = String(refundId || '').trim();
  const existingRefunds = Array.isArray(order.item_refunds) ? order.item_refunds : [];

  // (a) One refundId, one refund — a retried call is a no-op.
  if (refId && existingRefunds.some((entry: any) => String(entry?.refund_id || '') === refId)) {
    return { ok: true, duplicate: true };
  }

  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  const requested = Math.round((Number(amount) || 0) * 100) / 100;
  const orderNumber = String(order.order_number || '').trim();
  const fromPos = String(actorEmail || '').trim().toLowerCase() === 'square-pos';

  const item = findOrderItem(order, itemName, qty);
  if (!item) {
    console.error(`Item refund: "${itemName}" is not on order ${orderNumber}`);
    return { ok: false, reason: 'item_not_found' };
  }

  // (b) Amount guard — the computed value must equal the request to the cent.
  const computed = itemRefundAmount(order, item, qty);
  if (Math.abs(toCents(computed) - toCents(requested)) > 1) {
    await base44.asServiceRole.entities.Order.update(order.id, {
      item_refund_alerted_at: new Date().toISOString(),
    });
    await alertWesley(`Item refund amount does NOT match — order #${orderNumber || order.id}`, [
      `Order #${orderNumber || order.id} (${order.customer_name || 'unknown customer'})`,
      `Item: ${qty}x ${item.name}`,
      `Requested: ${money(requested)}`,
      `The ticket says: ${money(computed)}`,
      '',
      'Nothing was refunded. Check the item and the amount before refunding by hand.',
    ]);
    return { ok: false, reason: 'amount_unmatched', requested_amount: requested, computed_amount: computed };
  }

  let processor = '';
  let refundIdOut = null;

  if (fromPos) {
    // (3) The register already put the money back. Record it, never refund again.
    processor = 'square';
    refundIdOut = refId || null;
  } else if (HELCIM_ERA_ORDER_NUMBERS.has(orderNumber)) {
    // (e) Helcim-era tickets are cash-back only, whatever the record says.
    return cashBackNeeded(base44, order, {
      item, quantity: qty, amount: requested,
      why: 'Helcim-era order number — that money was taken in cash.',
    });
  } else if (order.pay_cash_on_pickup === true || order.cash_payment_id) {
    // (d) Cash orders never take a card refund.
    return cashBackNeeded(base44, order, {
      item, quantity: qty, amount: requested,
      why: 'This order was paid in cash.',
    });
  } else if (order.payment_provider === 'square') {
    // (c) Square-hosted payment: an exact partial refund on that payment.
    try {
      const refund = await refundSquareOrderItem(base44, order, requested, null);
      if (!refund?.ok) {
        return { ok: false, reason: 'processor_error', error: 'Square did not accept the refund' };
      }
      processor = 'square';
      refundIdOut = refund.refund_id || null;
    } catch (error: any) {
      console.error(`Square item refund failed for order ${orderNumber}:`, error?.message || error);
      return { ok: false, reason: 'processor_error', error: String(error?.message || error) };
    }
  } else if (order.payment_provider === 'wix') {
    // (c) Base44 Payments refunds an exact amount, so an item goes back the
    // same way a whole order would — same payment, same idempotency key.
    try {
      const refund = await refundWixAmount(
        base44, order, toCents(requested), `item-refund-${refId || `${order.id}-${toCents(requested)}`}`,
      );
      processor = 'wix';
      refundIdOut = refund?.refundId || null;
    } catch (error: any) {
      console.error(`Base44 Payments item refund failed for order ${orderNumber}:`, error?.message || error);
      return { ok: false, reason: 'processor_error', error: String(error?.message || error) };
    }
  } else {
    // (c) helcim, null, or any legacy value: never card-refund.
    return cashBackNeeded(base44, order, {
      item, quantity: qty, amount: requested,
      why: `Paid through a retired processor (${order.payment_provider || 'none recorded'}).`,
    });
  }

  // (f) Record the refund on the order, then tell the customer and Wesley.
  const entry = {
    item_name: item.name || itemName,
    quantity: qty,
    amount: requested,
    processor,
    refund_id: refundIdOut || refId || '',
    method: 'card',
    refunded_at: new Date().toISOString(),
  };
  await base44.asServiceRole.entities.Order.update(order.id, {
    item_refunds: [...existingRefunds, entry],
    square_refund_amount: Math.round((Number(order.square_refund_amount || 0) + requested) * 100) / 100,
  });

  const itemLabel = `${qty > 1 ? `${qty}× ` : ''}${entry.item_name}`;
  const amountText = money(requested);
  const subject = `A refund is on its way — Order #${orderNumber || order.id}`;
  const body = [
    `Hey ${order.customer_name || 'friend'},`,
    '',
    `We've put ${amountText} back on your card for the ${itemLabel} from order #${orderNumber || order.id}. Same card you paid with — it usually lands in 5–10 business days.`,
    '',
    "Sorry about that one. Come see us again and we'll make it right.",
    '',
    '— Smashie & The Flavor Isle Team',
  ].join('\n');

  const emailed = await sendOrderStatusEmail(order.customer_email, subject, body, 'Smashie at Flavor Isle')
    .catch((error: any) => {
      console.error(`Item refund email failed for order ${orderNumber}:`, error?.message || error);
      return false;
    });

  // The text goes out only with transactional consent, on the same gate every
  // other order text uses.
  let textStatus = 'skipped';
  let textReason = '';
  let textBody = '';
  if (!order.customer_phone) {
    textReason = 'No customer phone number';
  } else {
    const consent = await checkSmsConsent(base44, order.customer_phone, 'transactional');
    if (!consent.ok) {
      textReason = consent.reason;
    } else {
      textBody = `Flavor Isle: we've put ${amountText} back on your card for the ${itemLabel} on order #${orderNumber || order.id}. Questions? (270) 563-4618`;
      try {
        const sent = await sendSmashieSms(order.customer_phone, textBody, { base44 });
        textStatus = sent ? 'sent' : 'failed';
        if (sent) await markSmsSent(base44, order.customer_phone, 'transactional');
        else textReason = 'Text send failed';
      } catch (error: any) {
        textStatus = 'failed';
        textReason = String(error?.message || error);
      }
    }
  }

  // Both notices live on one SmsDeliveryLog line, the way the status path
  // records a text and the email beside it.
  try {
    await base44.asServiceRole.entities.SmsDeliveryLog.create({
      order_id: order.id,
      order_number: orderNumber,
      customer_name: order.customer_name || '',
      phone: normalizePhone(order.customer_phone) || '',
      milestone: 'item_refund',
      body: textBody,
      status: textStatus,
      reason: textReason || undefined,
      status_at: new Date().toISOString(),
      email_fallback: emailed ? 'sent' : 'failed',
      email_fallback_at: new Date().toISOString(),
      email_fallback_note: emailed
        ? 'Item refund email sent to the customer'
        : 'Item refund email could not be sent',
    });
  } catch (error: any) {
    console.error(`Item refund log write failed for order ${orderNumber}:`, error?.message || error);
  }

  await alertWesley(`Item refunded — order #${orderNumber || order.id}`, [
    `${money(requested)} back on ${processor} for ${itemLabel} on order #${orderNumber || order.id} (${order.customer_name || 'unknown customer'}). Refund id ${refundIdOut || 'not reported'}.`,
    `Customer email: ${emailed ? 'sent' : 'NOT sent'}. Customer text: ${textStatus}${textReason ? ` (${textReason})` : ''}.`,
  ]);

  return {
    ok: true,
    refund_id: refundIdOut,
    amount: requested,
    processor,
    item_name: entry.item_name,
    quantity: qty,
    customer_emailed: emailed,
    customer_texted: textStatus === 'sent',
  };
}

// Which line item a register refund was for. Square's refund carries the amount
// but not the item, so the name the crew typed is tried first, then an amount
// that matches exactly one line. An ambiguous refund is left alone rather than
// guessed at.
function matchRefundToItem(order: any, refund: any, amount: number) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const want = toCents(amount);
  const candidates: Array<{ name: string; quantity: number }> = [];
  for (const item of items) {
    const maxQty = Math.max(1, Math.floor(Number(item?.quantity) || 1));
    for (let q = 1; q <= maxQty; q += 1) {
      if (Math.abs(toCents(itemRefundAmount(order, item, q)) - want) <= 1) {
        candidates.push({ name: item.name, quantity: q });
      }
    }
  }
  if (candidates.length === 1) return candidates[0];
  const typed = String(refund?.reason || '').trim().toLowerCase();
  if (!typed || /^cancell?ed order$/.test(typed)) return null;
  return candidates.find((candidate) => String(candidate.name || '').trim().toLowerCase() === typed) || null;
}

// Register refunds, reflected on our side. Walk-in tickets have no Order record
// and are skipped in silence: Square already handed that money back at the
// counter. A refund already recorded is never recorded twice.
export async function recordSquarePosItemRefunds(base44: any, orderBySquareId: Map<string, any>, refunds: any[]) {
  let recorded = 0;
  for (const refund of refunds || []) {
    const squareOrderId = refund?.order_id;
    if (!squareOrderId) continue;
    const order = orderBySquareId.get(squareOrderId);
    if (!order) continue;

    const refundId = String(refund?.id || '').trim();
    if (!refundId) continue;
    if ((order.item_refunds || []).some((entry: any) => String(entry?.refund_id || '') === refundId)) continue;

    const amount = Math.round(Number(refund?.amount_money?.amount || 0)) / 100;
    if (!(amount > 0)) continue;

    const item = matchRefundToItem(order, refund, amount);
    if (!item) {
      console.log(`Refund ${refundId} on order ${order.order_number} matched no single line item — left alone.`);
      continue;
    }

    try {
      const result = await refundOrderItem(base44, {
        orderId: order.id,
        itemName: item.name,
        quantity: item.quantity,
        amount,
        reason: String(refund?.reason || 'Refunded at the register'),
        actorEmail: 'square-pos',
        refundId,
      });
      if (result?.ok) recorded++;
      else console.log(`Refund ${refundId} on order ${order.order_number} not recorded: ${result?.reason}`);
    } catch (error: any) {
      console.error(`Register item refund ${refundId} failed on order ${order.order_number}:`, error?.message || error);
    }
  }
  return { recorded };
}
```

## Final endpoint, verbatim — `base44/functions/refundOrderItem/entry.ts`

```ts
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { refundOrderItem } from '../../shared/itemRefund.ts';

// Item-level refund (GitHub issue #116, Part F). Admin-only: this moves money,
// so it takes the same guard as refundOrder.
//
// POST { order_id, item_name, quantity, amount, reason }
// Nothing is scheduled and no sample order is created here: it runs only when
// the crew asks for it from the admin order view or the POS-detection sync.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.error) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { order_id, item_name, quantity, amount, reason } = body || {};

    if (!order_id) return Response.json({ error: 'order_id is required' }, { status: 400 });
    if (!item_name) return Response.json({ error: 'item_name is required' }, { status: 400 });
    if (!(Number(amount) > 0)) return Response.json({ error: 'amount must be greater than zero' }, { status: 400 });

    const result = await refundOrderItem(base44, {
      orderId: order_id,
      itemName: item_name,
      quantity: Math.max(1, Math.floor(Number(quantity) || 1)),
      amount: Number(amount),
      reason: reason || 'Item refunded by Flavor Isle',
      actorEmail: auth.user?.email || 'admin',
      refundId: `item-${order_id}-${Date.now()}`,
    });

    // The shared module reports why nothing moved; the crew sees it verbatim.
    return Response.json(result, { status: result?.ok ? 200 : 409 });
  } catch (error: any) {
    console.error('refundOrderItem error:', error?.message || error);
    return Response.json({ ok: false, error: String(error?.message || error) }, { status: 500 });
  }
}
```

## Diff hunks — every changed line

### `base44/entities/Order.jsonc`

```diff
@@ -176,6 +176,48 @@
       "format": "date-time",
       "description": "When the Resend bounce alert for this order was sent to Wesley (issue #159, Part 4). Set once by resendBounceWebhook before the alert goes out, so one bounced order produces one alert and never another."
     },
+    "item_refunds": {
+      "type": "array",
+      "default": [],
+      "description": "Item-level refunds issued against this order without cancelling it (issue #116, Part F). One entry per refund: which item, how many, the exact amount that went back, which processor returned it, the processor's refund id and when. Written only by shared/itemRefund.ts, and read by the POS sync to skip a Square refund that is already recorded.",
+      "items": {
+        "type": "object",
+        "properties": {
+          "item_name": { "type": "string" },
+          "quantity": { "type": "number" },
+          "amount": { "type": "number" },
+          "processor": { "type": "string" },
+          "refund_id": { "type": "string" },
+          "method": { "type": "string" },
+          "refunded_at": { "type": "string", "format": "date-time" }
+        }
+      }
+    },
+    "cash_back_needed": {
+      "type": "boolean",
+      "default": false,
+      "description": "Issue #116, Part F: this item refund could not go back on a card, so the money has to be handed back by the crew. Set by shared/itemRefund.ts for cash orders, retired processors and the Helcim-era tickets; shown as a badge on the order card in Admin → Orders."
+    },
+    "item_refund_alerted_at": {
+      "type": "string",
+      "format": "date-time",
+      "description": "When Wesley was emailed that an item refund's amount did not match the ticket (issue #116, Part F). Stamped only by the amount guard in shared/itemRefund.ts, and only when it refused the refund."
+    },
     "payment_url": {
       "type": "string"
     },
```

### `base44/shared/squareRefund.ts`

```diff
@@ -37,4 +37,41 @@
 
   if (refundedCents <= 0) throw new Error('Square reports nothing left to refund on this order');
   return { refundedCents, refunded: refundedCents / 100, refundId: lastRefundId };
+}
+
+// One line item's exact amount back, on the payment that paid this order
+// (issue #116, Part F). Same connector authorization as the full refund above;
+// the difference is the amount — this never refunds more than Square still
+// holds on that payment.
+export async function refundSquareOrderItem(base44: any, order: any, amount: number, paymentId?: string | null) {
+  const squareOrderId = order?.square_checkout_order_id || order?.square_order_id;
+  if (!squareOrderId) throw new Error('No Square order found on this order');
+
+  const api = await squarePhoneApi(base44);
+
+  let targetPaymentId = String(paymentId || '').trim();
+  if (!targetPaymentId) {
+    const squareOrder = (await api.request(`orders/${squareOrderId}`)).order;
+    targetPaymentId = (squareOrder?.tenders || []).map((tender: any) => tender.payment_id).filter(Boolean)[0] || '';
+  }
+  if (!targetPaymentId) throw new Error('Square has no payment recorded against this order');
+
+  const payment = (await api.request(`payments/${targetPaymentId}`)).payment;
+  if (payment?.status !== 'COMPLETED') throw new Error('That Square payment is not completed, so it cannot be refunded');
+
+  const refundableCents = Number(payment.total_money?.amount || 0) - Number(payment.refunded_money?.amount || 0);
+  const cents = Math.round(Number(amount) * 100);
+  if (!(cents > 0)) throw new Error('There is nothing to refund on this item');
+  if (cents > refundableCents) {
+    throw new Error(`Square only has $${(refundableCents / 100).toFixed(2)} left to refund on this payment`);
+  }
+
+  const refund = await api.request('refunds', 'POST', {
+    idempotency_key: `item-refund-${order.id}-${targetPaymentId}-${cents}`,
+    payment_id: targetPaymentId,
+    amount_money: { amount: cents, currency: 'USD' },
+    reason: 'Item refunded by Flavor Isle',
+  });
+
+  return { ok: true, refund_id: refund?.refund?.id || null, refunded: cents / 100 };
 }
```

### `base44/functions/syncSquareOrderStatus/entry.ts`

```diff
@@ -11,6 +11,7 @@ import { requireAdmin } from '../../shared/requireAdmin.ts';
 
 import { mapSquareFulfillmentStatus, advanceOrderStatus } from '../../shared/orderTrackingStatus.ts';
 import { CANCELABLE_STATUSES, mirrorPosCancellation, mirrorPosRefunds, listRecentSquareRefunds } from '../../shared/posOrderCancellation.ts';
+import { recordSquarePosItemRefunds } from '../../shared/itemRefund.ts';
 
@@ -305,14 +306,25 @@ export default async function(req) {
     let refunds = { recorded: 0, cancelled: 0, notified: 0 };
+    let squareRefunds = [];
     try {
-      const squareRefunds = await listRecentSquareRefunds(accessToken, locationId, since);
+      squareRefunds = await listRecentSquareRefunds(accessToken, locationId, since);
       refunds = await mirrorPosRefunds(base44, orderBySquareId, squareRefunds);
     } catch (refundError) {
       console.error('Refund mirror failed:', refundError.message);
     }
 
-    return Response.json({ checked: squareOrders.length, updated, notified, profiles_synced: completedThisRun.length, refunds });
+    // Item-level refunds rung up at the register (issue #116, Part F). Its own
+    // try/catch: reading refunds can never break the milestone sync above, and
+    // a walk-in ticket with no Order record is skipped in silence.
+    let itemRefunds = { recorded: 0 };
+    try {
+      itemRefunds = await recordSquarePosItemRefunds(base44, orderBySquareId, squareRefunds);
+    } catch (itemRefundError) {
+      console.error('Register item refund detection failed:', itemRefundError.message);
+    }
+
+    return Response.json({ checked: squareOrders.length, updated, notified, profiles_synced: completedThisRun.length, refunds, item_refunds: itemRefunds });
```

### `src/pages/AdminOrders.jsx` (step 5)

Two hunks. The first adds `Banknote` to the page's existing icon import list and
touches no other icon; the second is the block itself:

```diff
@@ -156,6 +156,35 @@ function OrderCard({ order, onAdvance, onRequestCancel, onPrintBagTicket }) {
         </div>
       )}
 
+      {/* Item refunds (issue #116, Part F): what went back for a single item
+          without cancelling the ticket, and whether the crew still owes cash. */}
+      {((order.item_refunds || []).length > 0 || order.cash_back_needed) && (
+        <div className="px-5 pb-4">
+          <p className="text-[10px] font-heading uppercase tracking-wider text-muted-foreground mb-1">Item refunds</p>
+          <div className="space-y-0.5">
+            {(order.item_refunds || []).map((refund, i) => (
+              <div key={`${refund.refund_id || 'refund'}-${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs font-body text-obsidian-roast">
+                <span className="font-semibold">
+                  {refund.quantity > 1 ? `${refund.quantity}× ` : ''}{refund.item_name}
+                </span>
+                <span className="text-midnight-cherry font-semibold">${Number(refund.amount || 0).toFixed(2)}</span>
+                <span className="capitalize text-muted-foreground">
+                  {refund.method || 'card'}{refund.processor ? ` · ${refund.processor}` : ''}
+                </span>
+                {refund.refunded_at && (
+                  <span className="text-muted-foreground">{formatChicagoDateTime(refund.refunded_at)}</span>
+                )}
+              </div>
+            ))}
+          </div>
+          {order.cash_back_needed && (
+            <span className="inline-flex items-center gap-1 mt-1.5 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
+              <Banknote size={12} /> Cash back needed
+            </span>
+          )}
+        </div>
+      )}
+
       {expanded && (
```

## Verification

- `npm run build` → exit 0.
- `refundOrderItem` deploys and answers a POST: sending an order id that does
  not exist returned `409 {"ok":false,"reason":"order_not_found"}` — the admin
  guard, the request contract and the shared module all ran end to end.
- No money moved: no refund was issued, no test order created, no Square or
  Base44 Payments charge touched. The POS-detection path only runs inside the
  five-minute `syncSquareOrderStatus` run and only reads refunds Square has
  already issued.

## Scope

Untouched: Parts A–E of #116, the approval-email sender, every other Resend
send path, menu, pricing, loyalty, kitchen tickets, checkout, newsletters, the
watchdog, and every entity other than `Order`.