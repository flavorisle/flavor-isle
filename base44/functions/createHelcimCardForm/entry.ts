import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { helcimConfigured } from '../../shared/helcimCheckout.ts';
import { resolvePayableOrder, round2 } from '../../shared/helcimPayableOrder.ts';
import { formatCardAmount, helcimAmountHash, helcimJsConfigured, helcimJsToken } from '../../shared/helcimJs.ts';

// What our own card fields need for one saved order.
//
// The amount and the signature that proves we set it are computed HERE from the stored
// order — the browser is told what to charge, never asked. The secret key that signs
// the amount never leaves the server; only the configuration's public token is handed
// to the page, because the processor's script needs it to read the fields.
//
// Public on purpose (a customer arrives from a text link), and deliberately narrow:
// holding an order number still proves nothing and moves nothing.
//
// When the inline configuration is not in place yet, the answer says so and the
// checkout keeps using the processor's own secure form rather than showing fields that
// cannot process anything.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Either half of the configuration missing means no card can be taken on our own page
    // right now. There is no second, third-party form to fall back to, so the checkout is
    // told plainly and shows the customer what to do instead of sending them elsewhere.
    const apiKeyReady = helcimConfigured();
    const inlineReady = helcimJsConfigured();
    if (!apiKeyReady || !inlineReady) {
      console.error(
        `createHelcimCardForm: card fields unavailable (api key ${apiKeyReady ? 'set' : 'missing'}, inline ${inlineReady ? 'set' : 'missing'})`,
      );
      return Response.json({ ok: true, available: false });
    }

    const resolved = await resolvePayableOrder(base44, body?.order_number, body?.tip);
    if ('error' in resolved) {
      console.warn(`createHelcimCardForm: refusing ${body?.order_number} — ${resolved.error}`);
      return Response.json(
        resolved.paid ? { error: resolved.error, paid: true } : { error: resolved.error },
        { status: resolved.status },
      );
    }

    const { kind, record, orderNumber, amountCents, tipCents, tipProvided } = resolved.payable;
    const amountUsd = round2(amountCents / 100);

    // A tip picked on our own pay page is written onto the order before the fields
    // exist: settlement checks the payment against the saved total to the cent, and the
    // kitchen ticket carries the tip.
    if (kind === 'food' && tipProvided) {
      try {
        await base44.asServiceRole.entities.Order.update(record.id, {
          tip: round2(tipCents / 100),
          total: amountUsd,
        });
      } catch (dbError) {
        console.error(`createHelcimCardForm: could not record the tip on order ${orderNumber}:`, (dbError as Error).message);
        return Response.json({ error: 'We could not open the card form. Please try again.' }, { status: 500 });
      }
    }

    return Response.json({
      ok: true,
      available: true,
      order_number: orderNumber,
      amount: formatCardAmount(amountUsd),
      amount_hash: await helcimAmountHash(amountUsd),
      token: helcimJsToken(),
      merch: kind === 'merch',
    });
  } catch (error) {
    console.error('createHelcimCardForm error:', (error as Error).message);
    return Response.json(
      { error: 'We could not open the card form. Please try again, or call us at (270) 563-4618.' },
      { status: 500 },
    );
  }
}