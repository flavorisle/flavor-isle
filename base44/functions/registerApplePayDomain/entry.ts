import Stripe from 'npm:stripe@14.25.0';

// Registers a domain with Stripe so Apple Pay can be used on it. Apple Pay
// via the Stripe Payment Request button only works on domains Stripe has
// verified (Stripe fetches the apple-developer-merchantid-domain-association
// file from the domain's .well-known path). This is idempotent — calling it
// again on an already-registered domain just re-confirms it.
//
// Pass { "domain": "example.com" } to register a custom domain; defaults to
// the app's published base44 domain.
Deno.serve(async (req) => {
  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const body = await req.json().catch(() => ({}));
    const domain = (body.domain || 'taste-isle-express.base44.app').replace(/^https?:\/\//, '').replace(/\/.*$/, '');

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
});