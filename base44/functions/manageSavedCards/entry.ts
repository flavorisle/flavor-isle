import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Manages a signed-in customer's saved payment methods (cards) in Stripe,
// mirrored to the SavedPaymentMethod entity so the app can list/select them
// without a Stripe call on every checkout.
//
// Actions:
//   setup   → create/reuse the Stripe Customer, return a SetupIntent client
//            secret + publishable key so the client can collect a new card.
//   save    → after the client confirms the SetupIntent (or a PaymentIntent
//            with setup_future_usage), persist the PaymentMethod as a card.
//   list    → return the caller's saved cards from the entity (fast path).
//   detach  → detach the PaymentMethod from Stripe and delete the record.
//   setDefault → mark one card as the default for one-tap checkout.
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
  const publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');

  try {
    const user = await base44.auth.me();
    if (!user?.email) {
      return Response.json({ error: 'Sign in to manage saved cards' }, { status: 401 });
    }
    const email = (user.email || '').toLowerCase().trim();
    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'list';

    // Find or create the Stripe Customer for this user. Reuse an existing
    // card record's customer id when present so we don't duplicate customers.
    const getOrCreateCustomer = async (): Promise<string> => {
      const existing = await base44.asServiceRole.entities.SavedPaymentMethod
        .filter({ email }).catch(() => []);
      if (existing?.length && existing[0].stripe_customer_id) {
        return existing[0].stripe_customer_id;
      }
      const customer = await stripe.customers.create({
        email,
        name: user.full_name || undefined,
        metadata: { base44_user_id: user.id },
      });
      return customer.id;
    };

    if (action === 'setup') {
      const customerId = await getOrCreateCustomer();
      const setupIntent = await stripe.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
        usage: 'on_session',
        metadata: { base44_user_id: user.id, email },
      });
      return Response.json({
        clientSecret: setupIntent.client_secret,
        publishableKey,
        customerId,
      });
    }

    if (action === 'save') {
      const { paymentMethodId } = body || {};
      if (!paymentMethodId) {
        return Response.json({ error: 'paymentMethodId is required' }, { status: 400 });
      }
      const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
      if (!pm?.card) {
        return Response.json({ error: 'Payment method is not a card' }, { status: 400 });
      }
      const customerId = pm.customer as string | undefined || await getOrCreateCustomer();
      // Attach to the customer if it isn't already (SetupIntent confirmation
      // attaches automatically, but a PM from a PaymentIntent may not be).
      if (!pm.customer) {
        await stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
      }

      // Upsert the entity record — dedupe by stripe_payment_method_id.
      const dupe = await base44.asServiceRole.entities.SavedPaymentMethod
        .filter({ email, stripe_payment_method_id: paymentMethodId })
        .catch(() => []);
      const cardData = {
        user_id: user.id,
        email,
        stripe_customer_id: customerId,
        stripe_payment_method_id: paymentMethodId,
        brand: pm.card.brand,
        last4: pm.card.last4,
        exp_month: pm.card.exp_month,
        exp_year: pm.card.exp_year,
      };

      let record;
      if (dupe?.length) {
        record = await base44.asServiceRole.entities.SavedPaymentMethod.update(dupe[0].id, cardData);
      } else {
        // First card becomes the default automatically.
        const allCards = await base44.asServiceRole.entities.SavedPaymentMethod.filter({ email }).catch(() => []);
        record = await base44.asServiceRole.entities.SavedPaymentMethod.create({
          ...cardData,
          is_default: !allCards || allCards.length === 0,
        });
      }
      return Response.json({ card: record });
    }

    if (action === 'list') {
      const cards = await base44.asServiceRole.entities.SavedPaymentMethod
        .filter({ email }, '-created_date', 50).catch(() => []);
      return Response.json({ cards: cards || [], customerId: cards?.[0]?.stripe_customer_id || null });
    }

    if (action === 'detach') {
      const { paymentMethodId } = body || {};
      if (!paymentMethodId) {
        return Response.json({ error: 'paymentMethodId is required' }, { status: 400 });
      }
      try {
        await stripe.paymentMethods.detach(paymentMethodId);
      } catch (detachErr) {
        // The PM may already be detached or deleted in Stripe — still remove
        // the local record so the UI stays consistent.
        console.warn('Stripe detach failed (continuing to delete record):', detachErr.message);
      }
      await base44.asServiceRole.entities.SavedPaymentMethod
        .deleteMany({ email, stripe_payment_method_id: paymentMethodId })
        .catch((e) => console.error('delete record failed:', e.message));
      return Response.json({ success: true });
    }

    if (action === 'setDefault') {
      const { paymentMethodId } = body || {};
      if (!paymentMethodId) {
        return Response.json({ error: 'paymentMethodId is required' }, { status: 400 });
      }
      const cards = await base44.asServiceRole.entities.SavedPaymentMethod.filter({ email }).catch(() => []);
      await Promise.all((cards || []).map((c) =>
        base44.asServiceRole.entities.SavedPaymentMethod.update(c.id, {
          is_default: c.stripe_payment_method_id === paymentMethodId,
        })
      ));
      return Response.json({ success: true });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('manageSavedCards error:', error.message);
    return Response.json({ error: error.message || 'Could not manage saved cards' }, { status: 500 });
  }
});