import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHelcimCheckoutLink, helcimConfigured, HELCIM_NOT_CONFIGURED } from '../../shared/helcimCheckout.ts';

// Mint the HelcimPay.js session for one order, at the exact amount that is about
// to be charged: the order's own saved total, plus the tip picked on our own pay
// page (a website checkout order already carries its tip inside its total and
// sends none).
//
// Public on purpose — the customer arrives from a text link or a redirect — and
// deliberately narrow: it only ever works for an order this app set up to pay
// through Helcim, it refuses anything already paid, closed or cash-at-pickup, and
// the amount is computed from the STORED order, never from a number the browser
// sends. Holding an order number never proves payment and never moves money.
//
// Session token expires 60 minutes after it is created, which is why the pay page
// mints a fresh one on each attempt instead of reusing a link that was texted
// hours ago.
const PAY_PAGE_ORIGIN = 'https://flavor-isle.com';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const orderNumber = String(body?.order_number || '').trim().toUpperCase();
    if (!orderNumber) {
      return Response.json({ error: 'order_number is required' }, { status: 400 });
    }

    if (!helcimConfigured()) {
      console.error('createHelcimPaySession: HELCIM_API_KEY is missing, so no session can be created');
      return Response.json({ error: HELCIM_NOT_CONFIGURED }, { status: 503 });
    }

    // The order number is not unique on its own, so the newest Helcim order with
    // that number is the one being paid.
    const orders = await base44.asServiceRole.entities.Order.filter({ order_number: orderNumber }, '-created_date', 10);
    const order = (orders || []).find((o) => o.payment_provider === 'helcim');
    if (!order) {
      // Tasty Threads merch lives in its own record with its own saved total, and a
      // merch order never carries a tip: the card is taken for exactly what was
      // saved, and the session is recorded on the merch order so settlement can
      // match Helcim's payment back to it.
      const merchOrders = await base44.asServiceRole.entities.MerchOrder.filter({ order_number: orderNumber }, '-created_date', 10);
      const merch = (merchOrders || [])[0];
      if (!merch) {
        console.warn(`createHelcimPaySession: no Helcim order found for ${orderNumber}`);
        return Response.json({ error: 'That order does not pay through this page.' }, { status: 404 });
      }
      if (merch.payment_status === 'paid') {
        return Response.json({ error: 'This order is already paid.', paid: true }, { status: 409 });
      }
      if (merch.fulfillment_status === 'canceled' || merch.payment_status === 'refunded') {
        return Response.json({ error: 'This order is no longer open.' }, { status: 409 });
      }
      const merchTotal = round2(Number(merch.total) || 0);
      if (!(merchTotal > 0)) {
        return Response.json({ error: 'That order has no amount to pay.' }, { status: 409 });
      }

      const merchLink = await createHelcimCheckoutLink({
        invoiceNumber: merch.id,
        orderNumber: merch.order_number,
        amountUsd: merchTotal,
        payPageOrigin: PAY_PAGE_ORIGIN,
        fromCheckout: false,
      });
      try {
        await base44.asServiceRole.entities.MerchOrder.update(merch.id, {
          payment_provider: 'helcim',
          helcim_checkout_id: merchLink.checkoutToken,
          payment_url: merchLink.url,
        });
      } catch (dbError) {
        // The session exists but the merch order does not know about it: refuse
        // rather than hand out a way to pay an amount nothing is watching for.
        console.error(`createHelcimPaySession: could not record the session on merch order ${orderNumber}:`, (dbError as Error).message);
        return Response.json({ error: 'We could not open the secure payment page. Please try again.' }, { status: 500 });
      }

      console.log(`HelcimPay session created for merch order ${orderNumber}: $${merchTotal.toFixed(2)}`);
      return Response.json({
        ok: true,
        order_number: merch.order_number,
        checkout_token: merchLink.checkoutToken,
        total: merchTotal,
        merch: true,
      });
    }
    if (order.payment_status === 'paid') {
      return Response.json({ error: 'This order is already paid.', paid: true }, { status: 409 });
    }
    if (order.status === 'cancelled' || order.payment_status === 'refunded') {
      return Response.json({ error: 'This order is no longer open.' }, { status: 409 });
    }
    if (order.pay_cash_on_pickup) {
      return Response.json({ error: 'This order is paid in cash at the counter.' }, { status: 409 });
    }

    // A tip picked on our page is added on top of the order's own total and is
    // capped the same way the phone flow caps it: at the food subtotal, or $10 on
    // a tiny order. When none is sent, the order is charged exactly as saved.
    const pickedTip = body?.tip !== undefined && body?.tip !== null && body?.tip !== '';
    const baseCents = Math.round((Number(order.total) || 0) * 100);
    const tipCents = pickedTip ? Math.round((Number(body.tip) || 0) * 100) : 0;
    const tipCapCents = Math.max(Math.round((Number(order.subtotal) || 0) * 100), 1000);
    if (tipCents < 0 || tipCents > tipCapCents) {
      return Response.json({ error: 'That tip amount is not valid.' }, { status: 400 });
    }
    const chargeCents = baseCents + tipCents;

    const link = await createHelcimCheckoutLink({
      invoiceNumber: order.id,
      orderNumber: order.order_number,
      amountUsd: round2(chargeCents / 100),
      payPageOrigin: PAY_PAGE_ORIGIN,
      fromCheckout: !pickedTip,
    });

    // The order's total is what will be charged, so a picked tip is written onto
    // it before the session exists: settlement checks Helcim's payment against
    // the saved total to the cent, and the kitchen ticket carries the tip.
    const updates = {
      payment_provider: 'helcim',
      helcim_checkout_id: link.checkoutToken,
      payment_url: link.url,
      manual_pay_required: false,
      ...(pickedTip ? { tip: round2(tipCents / 100), total: round2(chargeCents / 100) } : {}),
    };
    try {
      await base44.asServiceRole.entities.Order.update(order.id, updates);
    } catch (dbError) {
      // The session exists but the order does not know about it: refuse rather
      // than hand out a way to pay an amount nothing is watching for.
      console.error(`createHelcimPaySession: could not record the session on order ${orderNumber}:`, (dbError as Error).message);
      return Response.json({ error: 'We could not open the secure payment page. Please try again.' }, { status: 500 });
    }

    console.log(`HelcimPay session created for order ${orderNumber}: $${round2(chargeCents / 100).toFixed(2)}`);

    return Response.json({
      ok: true,
      order_number: order.order_number,
      checkout_token: link.checkoutToken,
      total: round2(chargeCents / 100),
    });
  } catch (error) {
    console.error('createHelcimPaySession error:', (error as Error).message);
    return Response.json(
      { error: 'We could not open the secure payment page. Please try again, or call us at (270) 563-4618.' },
      { status: 500 },
    );
  }
}