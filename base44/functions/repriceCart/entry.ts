import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { verifyOrderPricing } from '../../shared/verifyOrderPricing.ts';

// Issue #360. A cart can outlive a menu change: the customer built it days ago,
// or the nightly Square sync moved a price while it sat in the bag. Checkout
// refuses a cart whose total it cannot reproduce, which is right, but the
// customer was left with "refresh the menu and try again" and no way to do it.
// This asks the guard for the authoritative price of every line, using a
// deliberately unmatched subtotal so it re-prices the cart and answers with the
// per-line numbers instead of opening a payment page. It creates no order, writes
// nothing and charges nothing.
const MAX_LINES = 60;

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const items = Array.isArray(body?.items) ? body.items : [];
    if (items.length === 0) {
      return Response.json({ ok: false, error: 'No items provided' }, { status: 400 });
    }
    if (items.length > MAX_LINES) {
      return Response.json({ ok: false, error: 'This bag is too large to price in one check.' }, { status: 400 });
    }

    const priced = await verifyOrderPricing(base44, {
      items,
      orderType: 'pickup',
      clientSubtotal: -1,
      clientDeliveryFee: 0,
      clientTax: 0,
      clientTotal: -1,
    });

    const lines = (priced as any)?.lineUnitPrices;
    if (Array.isArray(lines) && lines.length > 0) {
      return Response.json({ ok: true, lines });
    }
    // The cart cannot be priced at all: an unknown item, a choice that is no
    // longer on the menu, or a rule the catalog now sets. The sentence is the
    // guard's own, and the caller shows it without changing the cart.
    return Response.json({ ok: false, error: priced?.error || 'This bag could not be priced from the current menu.' });
  } catch (error) {
    console.error('repriceCart error:', (error as Error).message);
    return Response.json({ ok: false, error: 'The price check is unavailable right now.' }, { status: 500 });
  }
}