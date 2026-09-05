import { secrets } from 'base44:runtime';

// Returns the Stripe publishable key so the client can render the
// Apple Pay / Google Pay (Payment Request) button before a payment intent
// exists. Publishable keys are safe to expose to the browser.
export default async function(req: Request): Promise<Response> {
  try {
    const publishableKey = secrets.get('STRIPE_PUBLISHABLE_KEY');
    if (!publishableKey) {
      return Response.json({ error: 'Stripe publishable key not configured' }, { status: 500 });
    }
    return Response.json({ publishableKey });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}