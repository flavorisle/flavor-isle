import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { validatePromoCode } from '../../shared/promoCode.ts';

// Issue #325 Part 3: the checkout page's own check of a promo code.
//
// Public on purpose — guest checkout has to be able to apply a code. It returns
// only what the code does to the subtotal the caller sent; the amount is always
// computed from the PromoCode record here, never accepted from the browser, and
// the order's charge is recomputed independently by the checkout function.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const code = String(body?.code || '').trim();
    if (!code) return Response.json({ ok: false, error: 'Enter a promo code.' });

    const result = await validatePromoCode(base44, {
      code,
      subtotal: Number(body?.subtotal) || 0,
      email: body?.email,
      phone: body?.phone,
    });
    if (!result.ok) return Response.json({ ok: false, error: result.error });

    return Response.json({
      ok: true,
      code: result.code,
      percent_off: result.percent_off,
      discount: result.discount,
    });
  } catch (error) {
    console.error('validatePromoCode failed:', (error as Error).message);
    return Response.json({ ok: false, error: 'That promo code could not be checked. Please try again.' }, { status: 500 });
  }
}