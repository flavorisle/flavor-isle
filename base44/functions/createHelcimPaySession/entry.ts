import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createHelcimCheckoutLink, helcimConfigured, HELCIM_NOT_CONFIGURED } from '../../shared/helcimCheckout.ts';
import { resolvePayableOrder, round2 } from '../../shared/helcimPayableOrder.ts';

// Mint the HelcimPay.js session for one order, at the exact amount that is about to
// be charged: the order's own saved total, plus the tip picked on our own pay page (a
// website checkout order already carries its tip inside its total and sends none).
//
// This is the processor's own secure form, used for any order our own card fields
// cannot take (an account with no Helcim.js configuration yet) so a customer is never
// left with a checkout that cannot be paid.
//
// Public on purpose — the customer arrives from a text link or a redirect — and
// deliberately narrow: the amount comes from the STORED order (see
// shared/helcimPayableOrder.ts), and holding an order number never proves payment and
// never moves money.
//
// Session token expires 60 minutes after it is created, which is why the pay page
// mints a fresh one on each attempt instead of reusing a link that was texted hours ago.
const PAY_PAGE_ORIGIN = 'https://flavor-isle.com';

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    if (!helcimConfigured()) {
      console.error('createHelcimPaySession: HELCIM_API_KEY is missing, so no session can be created');
      return Response.json({ error: HELCIM_NOT_CONFIGURED }, { status: 503 });
    }

    const resolved = await resolvePayableOrder(base44, body?.order_number, body?.tip);
    if ('error' in resolved) {
      console.warn(`createHelcimPaySession: refusing ${body?.order_number} — ${resolved.error}`);
      return Response.json(
        resolved.paid ? { error: resolved.error, paid: true } : { error: resolved.error },
        { status: resolved.status },
      );
    }

    const { kind, record, orderNumber, amountCents, tipCents, tipProvided } = resolved.payable;
    const amountUsd = round2(amountCents / 100);

    const link = await createHelcimCheckoutLink({
      invoiceNumber: record.id,
      orderNumber,
      amountUsd,
      payPageOrigin: PAY_PAGE_ORIGIN,
      fromCheckout: !tipProvided,
    });

    // The saved total is what will be charged, so a picked tip is written onto the
    // record before the session exists: settlement checks the payment against that
    // total to the cent, and the kitchen ticket carries the tip.
    const updates = {
      payment_provider: 'helcim',
      helcim_checkout_id: link.checkoutToken,
      payment_url: link.url,
      ...(kind === 'food' ? { manual_pay_required: false } : {}),
      ...(kind === 'food' && tipProvided ? { tip: round2(tipCents / 100), total: amountUsd } : {}),
    };
    try {
      const entity = kind === 'merch' ? base44.asServiceRole.entities.MerchOrder : base44.asServiceRole.entities.Order;
      await entity.update(record.id, updates);
    } catch (dbError) {
      // The session exists but the record does not know about it: refuse rather than
      // hand out a way to pay an amount nothing is watching for.
      console.error(`createHelcimPaySession: could not record the session on order ${orderNumber}:`, (dbError as Error).message);
      return Response.json({ error: 'We could not open the secure payment page. Please try again.' }, { status: 500 });
    }

    console.log(`Card session created for ${kind} order ${orderNumber}: $${amountUsd.toFixed(2)}`);

    return Response.json({
      ok: true,
      order_number: orderNumber,
      checkout_token: link.checkoutToken,
      total: amountUsd,
      ...(kind === 'merch' ? { merch: true } : {}),
    });
  } catch (error) {
    console.error('createHelcimPaySession error:', (error as Error).message);
    return Response.json(
      { error: 'We could not open the secure payment page. Please try again, or call us at (270) 563-4618.' },
      { status: 500 },
    );
  }
}