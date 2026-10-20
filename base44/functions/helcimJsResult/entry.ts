import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { helcimCheckoutTotals } from '../../shared/helcimCheckout.ts';
import { settleHelcimCheckoutOrder, settleHelcimMerchOrder } from '../../shared/helcimSettlement.ts';

// Where our own card fields hand their result back.
//
// The customer typed the card into fields on OUR checkout, and the processor's script
// sent it straight from their browser to the processor; when the transaction is done
// that script submits this form to this endpoint. Nothing in that submission is
// trusted: the processor is asked what it actually took, and only an approved USD
// payment for the exact amount of the saved order — on a transaction no other order has
// been settled with — marks the order paid and releases it to the kitchen.
const APPROVAL = /approv/i;
const FALLBACK_ORIGIN = 'https://flavor-isle.com';

function clean(value: unknown): string {
  return String(value ?? '').trim();
}

// Only one of our own origins may be landed on after the payment: the customer's own
// address when it is ours, otherwise the live site.
function safeOrigin(raw: string): string {
  try {
    const url = new URL(raw);
    const host = url.hostname.toLowerCase();
    if (host === 'flavor-isle.com' || host.endsWith('.flavor-isle.com')) return url.origin;
    if (host.endsWith('.base44.app')) return url.origin;
    if (host === 'localhost') return url.origin;
    return '';
  } catch {
    return '';
  }
}

// Where the customer was typing, so a refused card sends them back to it — a path on
// our own site, never another host.
function safePath(raw: string): string {
  if (!raw.startsWith('/') || raw.startsWith('//')) return '';
  return raw;
}

function pageHtml(headline: string, body: string, href: string, label: string) {
  return new Response(
    '<!doctype html><html lang="en"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width,initial-scale=1">' +
      `<title>${headline} — Flavor Isle</title></head>` +
      '<body style="margin:0;background:#FDF6E3;font-family:system-ui,-apple-system,sans-serif;color:#003366">' +
      '<div style="max-width:32rem;margin:0 auto;padding:4rem 1.5rem;text-align:center">' +
      `<h1 style="font-size:1.75rem;margin:0 0 .75rem">${headline}</h1>` +
      `<p style="margin:0 0 1.75rem;line-height:1.6">${body}</p>` +
      `<a href="${href}" style="display:inline-block;background:#CC3300;color:#fff;padding:.9rem 1.75rem;border-radius:999px;font-weight:700;text-decoration:none">${label}</a>` +
      '</div></body></html>',
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } },
  );
}

// A payment may settle one order and no other: a transaction that another order already
// carries is refused rather than counted twice.
async function transactionAlreadySettled(base44: any, transactionId: string, recordId: string) {
  const [food, merch] = await Promise.all([
    base44.asServiceRole.entities.Order.filter({ helcim_transaction_id: transactionId }, '-created_date', 5).catch(() => []),
    base44.asServiceRole.entities.MerchOrder.filter({ helcim_transaction_id: transactionId }, '-created_date', 5).catch(() => []),
  ]);
  const others = [...(food || []), ...(merch || [])].filter((row: any) => row.id !== recordId);
  if (others.length > 0) {
    console.error(`Card fields: transaction ${transactionId} already settled order ${others[0].order_number}`);
    return true;
  }
  return false;
}

// ── The record of a card that did not go through ──
//
// A refused card reaches us long before any charge exists, so the card system's own words
// are the ONLY account of why it did not go through. Each of those attempts is written
// down, verbatim, so the crew can read the exact reason in Admin → Card Declines.
async function recordCardLog(req: Request, row: any) {
  try {
    await createClientFromRequest(req).asServiceRole.entities.CardPaymentLog.create(row);
  } catch (logError) {
    // Bookkeeping must never break the customer's page.
    console.error('helcimJsResult: could not record the card attempt:', (logError as Error).message);
  }
}

// Who the order number belongs to, so a refusal names someone the crew can call back.
// Best effort: a missing record just leaves the entry without a name.
async function customerForOrder(base44: any, orderNumber: string) {
  try {
    const [food, merch] = await Promise.all([
      base44.asServiceRole.entities.Order.filter({ order_number: orderNumber }, '-created_date', 3),
      base44.asServiceRole.entities.MerchOrder.filter({ order_number: orderNumber }, '-created_date', 3),
    ]);
    const record = (food || [])[0] || (merch || [])[0];
    return record
      ? { customer_name: record.customer_name || '', customer_email: record.customer_email || '' }
      : {};
  } catch {
    return {};
  }
}

// The card form's own result fields, taken verbatim from the submission so what is stored
// is exactly what the card system sent — nothing re-worded, nothing guessed.
function cardAttempt(field: (name: string) => string, sourcePath: string) {
  return {
    order_number: field('order_number').toUpperCase(),
    response_code: field('response'),
    response_message: field('responseMessage'),
    notice_message: field('noticeMessage'),
    card_type: field('cardType'),
    avs_response: field('avsResponse'),
    cvv_response: field('cvvResponse'),
    amount: Number(field('amount')) || 0,
    transaction_id: field('transactionId'),
    source_path: sourcePath,
    occurred_at: new Date().toISOString(),
  };
}

export default async function (req: Request) {
  // Kept outside the try so a thrown error can still be filed against its order.
  let attemptedOrder = '';
  try {
    const base44 = createClientFromRequest(req);
    const params = new URLSearchParams(await req.text().catch(() => ''));
    const field = (name: string) => clean(params.get(name));

    const orderNumber = field('order_number').toUpperCase();
    attemptedOrder = orderNumber;
    if (!orderNumber) {
      console.error('helcimJsResult: the card form result carried no order_number');
      return Response.json({ error: 'order_number is required' }, { status: 400 });
    }

    const origin = safeOrigin(field('return_url')) || FALLBACK_ORIGIN;
    const returnPath = safePath(field('return_path'));
    const approved = field('response') === '1' && APPROVAL.test(field('responseMessage'));
    const transactionId = field('transactionId');

    // A card the processor did not approve: nothing was taken, and the customer is told
    // so on their own page rather than being walked into a confirmation for money that
    // never moved.
    if (!approved || !transactionId) {
      const reason = field('responseMessage');
      console.warn(`Card fields reported no approval for order ${orderNumber}: ${reason}`);

      // The exact refusal is filed here, with the address and security-code checks that
      // usually explain it.
      await recordCardLog(req, {
        ...cardAttempt(field, returnPath),
        outcome: 'declined',
        ...(await customerForOrder(base44, orderNumber)),
      });

      // The card system's own line, shown in full and escaped. A refusal reaches us
      // long before any charge exists, so this line is the ONLY account of why a card
      // did not go through — without it, a refused payment is invisible everywhere.
      const safeReason = reason.slice(0, 300)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

      return pageHtml(
        'That card was not approved',
        'Nothing was charged. You can try another card, or pay in person at the counter.' +
          (safeReason
            ? `<br><span style="display:inline-block;margin-top:.85rem;font-size:.85rem;opacity:.75">What the card system reported: ${safeReason} (code ${field('response') || 'none'})</span>`
            : ''),
        `${origin}${returnPath}` || `${origin}/checkout`,
        'Try again',
      );
    }

    // Which saved record this is: a food order or a Tasty Threads merch order.
    const foodOrders = await base44.asServiceRole.entities.Order
      .filter({ order_number: orderNumber }, '-created_date', 10)
      .catch(() => []);
    const foodOrder = (foodOrders || []).find((row: any) => row.payment_provider === 'helcim') || null;
    let merchOrder: any = null;
    if (!foodOrder) {
      const merchOrders = await base44.asServiceRole.entities.MerchOrder
        .filter({ order_number: orderNumber }, '-created_date', 10)
        .catch(() => []);
      merchOrder = (merchOrders || [])[0] || null;
    }
    const record = foodOrder || merchOrder;
    if (!record) {
      console.error(`Card fields: no saved order ${orderNumber} to settle`);
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const expectedCents = Math.round(Number(record.total) * 100);

    // Verify the payment through the shared settlement resolver. The browser posts a
    // transaction id that is not always the card-transaction id Helcim can retrieve
    // directly (it 400s), so this falls back to the invoice lookup (the order number
    // the card form stamped) before giving up. What the browser says is never enough.
    const totals = await helcimCheckoutTotals(
      String(record.id),
      expectedCents,
      transactionId || undefined,
      orderNumber,
    );
    const verifiedTransactionId = totals.paid ? String(totals.transactionId || '') : '';
    const matchesOrder = !!totals.paid && totals.foodCents === expectedCents;
    const alreadySettledElsewhere = matchesOrder && verifiedTransactionId
      ? await transactionAlreadySettled(base44, verifiedTransactionId, record.id)
      : false;

    if (matchesOrder && !alreadySettledElsewhere) {
      // The transaction is written onto the order first, so a later attempt — the
      // confirmation page, the sweeper, an admin retry — verifies this same payment
      // even if this request dies before it finishes.
      try {
        const entity = merchOrder ? base44.asServiceRole.entities.MerchOrder : base44.asServiceRole.entities.Order;
        await entity.update(record.id, { helcim_transaction_id: verifiedTransactionId || transactionId });
      } catch (claimError) {
        console.error(
          `Card fields: could not record transaction ${transactionId} on order ${orderNumber}:`,
          (claimError as Error).message,
        );
      }
      try {
        if (merchOrder) {
          const result = await settleHelcimMerchOrder(base44, merchOrder, verifiedTransactionId || transactionId);
          console.log(`Merch order ${orderNumber} settled from the card fields: ${JSON.stringify(result)}`);
        } else {
          const paid = await settleHelcimCheckoutOrder(base44, foodOrder, verifiedTransactionId || transactionId);
          console.log(`Order ${orderNumber} settled from the card fields: payment_status=${paid?.payment_status}`);
        }
      } catch (settleError) {
        console.error(`Card fields: settling order ${orderNumber} failed:`, (settleError as Error).message);
      }
    } else {
      console.warn(
        `Card fields: order ${orderNumber} left unsettled (transaction ${transactionId}, expected ${expectedCents}c, the processor reports ${totals.paid ? totals.foodCents + 'c' : 'nothing'})`,
      );
      // Approved by the card system but not a cent-for-cent match with the saved order:
      // real money needs a human, so the attempt is written down with both figures.
      await recordCardLog(req, {
        ...cardAttempt(field, returnPath),
        outcome: 'unsettled',
        customer_name: record.customer_name || '',
        customer_email: record.customer_email || '',
        detail:
          `This order needs ${(expectedCents / 100).toFixed(2)}; the card system reports ` +
          (totals.paid ? `${(totals.foodCents / 100).toFixed(2)}` : 'no approved payment') +
          (alreadySettledElsewhere ? '. That transaction already settled a different order.' : '.'),
      });
    }

    // Either way the customer lands on their own confirmation page, which re-checks the
    // payment and shows the order as it really is.
    const confirmation = merchOrder
      ? `${origin}/merch-confirmation?order_number=${encodeURIComponent(orderNumber)}&card=1`
      : `${origin}/order-confirmation?order_number=${encodeURIComponent(orderNumber)}&card=1${returnPath.startsWith('/checkout') ? '&from=checkout' : ''}`;
    return Response.redirect(confirmation, 303);
  } catch (error) {
    console.error('helcimJsResult error:', (error as Error).message);
    // A crash in the handler is also something the crew needs to see, filed against
    // whatever order number was being handled.
    await recordCardLog(req, {
      outcome: 'error',
      order_number: attemptedOrder,
      detail: (error as Error).message,
      occurred_at: new Date().toISOString(),
    });
    return Response.json(
      { error: 'We could not read that payment. Please call us at (270) 563-4618.' },
      { status: 500 },
    );
  }
}