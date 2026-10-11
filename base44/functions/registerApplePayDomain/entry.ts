import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireAdmin } from '../../shared/requireAdmin.ts';

// Registers a domain with Stripe so Apple Pay can be used on it. Apple Pay
// via the Stripe Payment Request button only works on domains Stripe has
// verified (Stripe fetches the apple-developer-merchantid-domain-association
// file from the domain's .well-known path). This is idempotent — calling it
// again on an already-registered domain just re-confirms it.
//
// Owner-only: it mutates the store's live Stripe account, so it is an operator
// action — never something a visitor or a shopper can trigger. It is called from
// the admin side (and by hand during setup) with an admin session.
//
// Pass { "domain": "example.com" } to register a custom domain; defaults to
// the app's published base44 domain.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const body = await req.json().catch(() => ({}));
    const domain = (body.domain || 'flavor-isle.com').replace(/^https?:\/\//, '').replace(/\/.*$/, '');

    let result;
    try {
      result = await stripe.applePayDomains.create({ domain_name: domain });
    } catch (createErr) {
      // If the domain is already registered, Stripe returns an error — list
      // existing domains and report whether this one is verified.
      if (String(createErr.message).includes('already been registered')) {
        const list = await stripe.applePayDomains.list();
        const existing = list.data.find((d) => d.domain_name === domain);
        return Response.json({
          status: 'already_registered',
          domain,
          verified: existing ? existing.status === 'verified' : null,
          stripeStatus: existing ? existing.status : null,
        });
      }
      throw createErr;
    }

    return Response.json({
      status: 'registered',
      domain,
      verified: result.status === 'verified',
      stripeStatus: result.status,
    });
  } catch (error) {
    console.error('registerApplePayDomain error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}