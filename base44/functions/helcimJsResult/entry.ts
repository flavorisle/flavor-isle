import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { helcimPaymentByTransaction } from '../../shared/helcimCheckout.ts';
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

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const params = new URLSearchParams(await req.text().catch(() => ''));
    const field = (name: string) => clean(params.get(name));

    const orderNumber = field('order_number').toUpperCase();
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

    // Read the transaction back from the processor — retrying briefly, because its
    // record can lag the approval by a moment. What the browser says is never enough.
    let payment: any = null;
    for (let attempt = 0; attempt < 4 && !payment; attempt += 1) {
      const read = await helcimPaymentByTransaction(transactionId).catch(() => null);
      if (read && read.status === 'APPROVED' && read.currency === 'USD') {
        payment = read;
        break;
      }
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const matchesOrder = !!payment && payment.amountCents - payment.tipCents === expectedCents;
    const alreadySettledElsewhere = matchesOrder
      ? await transactionAlreadySettled(base44, transactionId, record.id)
      : false;

    if (matchesOrder && !alreadySettledElsewhere) {
      // The transaction is written onto the order first, so a later attempt — the
      // confirmation page, the sweeper, an admin retry — verifies this same payment
      // even if this request dies before it finishes.
      try {
        const entity = merchOrder ? base44.asServiceRole.entities.MerchOrder : base44.asServiceRole.entities.Order;
        await entity.update(record.id, { helcim_transaction_id: transactionId });
      } catch (claimError) {
        console.error(
          `Card fields: could not record transaction ${transactionId} on order ${orderNumber}:`,
          (claimError as Error).message,
        );
      }
      try {
        if (merchOrder) {
          const result = await settleHelcimMerchOrder(base44, merchOrder, transactionId);
          console.log(`Merch order ${orderNumber} settled from the card fields: ${JSON.stringify(result)}`);
        } else {
          const paid = await settleHelcimCheckoutOrder(base44, foodOrder, transactionId);
          console.log(`Order ${orderNumber} settled from the card fields: payment_status=${paid?.payment_status}`);
        }
      } catch (settleError) {
        console.error(`Card fields: settling order ${orderNumber} failed:`, (settleError as Error).message);
      }
    } else {
      console.warn(
        `Card fields: order ${orderNumber} left unsettled (transaction ${transactionId}, expected ${expectedCents}c, the processor reports ${payment ? payment.amountCents : 'nothing'})`,
      );
    }

    // Either way the customer lands on their own confirmation page, which re-checks the
    // payment and shows the order as it really is.
    const confirmation = merchOrder
      ? `${origin}/merch-confirmation?order_number=${encodeURIComponent(orderNumber)}&card=1`
      : `${origin}/order-confirmation?order_number=${encodeURIComponent(orderNumber)}&card=1${returnPath.startsWith('/checkout') ? '&from=checkout' : ''}`;
    return Response.redirect(confirmation, 303);
  } catch (error) {
    console.error('helcimJsResult error:', (error as Error).message);
    return Response.json(
      { error: 'We could not read that payment. Please call us at (270) 563-4618.' },
      { status: 500 },
    );
  }
}