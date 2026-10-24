import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getSmashieSettings, webPaymentProvider } from '../../shared/smashieSettings.ts';

// Which system backs the website's secure payment page (issue #116: Base44 Payments
// is primary, Square is the alternative).
//
// Read-only and public, because the checkout page has to render the matching payment
// step before an order exists — a customer can never read the settings record itself.
// It reveals nothing but the switch: every amount is still re-priced and verified
// server-side, and the order's payment path is decided by the same switch on the
// server, not by this response.
//
// Fails safe to Square so a settings hiccup can never strand a checkout on a payment
// path that cannot open.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const settings = await getSmashieSettings(base44);
    return Response.json({ provider: webPaymentProvider(settings) });
  } catch (error) {
    console.error('getWebPaymentProvider error:', (error as Error).message);
    return Response.json({ provider: 'square' });
  }
}