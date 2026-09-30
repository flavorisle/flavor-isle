import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { secrets } from 'base44:runtime';
import { upsertSmsConsent, SMS_CONSENT_VERSION } from '../../shared/smsConsent.ts';
import { verifyOrderPricing } from '../../shared/verifyOrderPricing.ts';
import { validateRewardDiscount } from '../../shared/squareLoyalty.ts';
import { findBlock } from '../../shared/blockedContacts.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { items, orderType, pickupMethod, customer, instructions, subtotal, deliveryFee, tax, total, tip, discount, redemptionId, scheduledFor, estimatedTime, vehicle, stripeCustomerId, happyHourDiscount, smsTransactionalConsent, smsConsentDisclosure, smsConsentVersion, loyaltyOptIn } = body;

    if (!items || items.length === 0) {
      return Response.json({ error: 'No items provided' }, { status: 400 });
    }

    // Blocked customers cannot complete an online checkout.
    if (await findBlock(base44, { phone: customer?.phone, email: customer?.email })) {
      return Response.json({ error: 'We are not able to take this order online. Please call the store at (270) 563-4618.' }, { status: 403 });
    }
    if (loyaltyOptIn && !/^\+?1?\d{10}$/.test(String(customer?.phone || '').replace(/[\s().-]/g, ''))) {
      return Response.json({ error: 'Enter a valid phone number to join Star Rewards, or uncheck the optional box.' }, { status: 400 });
    }
    if (redemptionId && Number(happyHourDiscount) > 0) {
      return Response.json({ error: 'Star Rewards cannot be combined with Happy Hour or another discount.' }, { status: 400 });
    }
    if (!redemptionId && Number(discount) > 0) {
      return Response.json({ error: 'Choose a valid Star Reward for this discount.' }, { status: 400 });
    }

    // ── Reward validation: verify the claimed reward tier, exact discount,
    // eligibility, and account balance against Square Loyalty (keyed by the
    // customer's phone) BEFORE creating a payable intent. Rejects mismatches;
    // returns the authoritative exact discount so the charge uses it, not the
    // client value. A guest with no reward (redemptionId empty) skips this and
    // checks out normally. Square loyalty is the only rewards authority — the
    // app Loyalty table is never read or written here. The October promo stays
    // on HOLD (no promo is turned on; this only reads the live program).
    let authoritativeDiscount = Number(discount) || 0;
    if (redemptionId) {
      const reward = await validateRewardDiscount({
        phone: customer?.phone,
        email: customer?.email,
        rewardTierId: redemptionId,
        claimedDiscount: Number(discount) || 0,
        subtotal: Number(subtotal) || 0,
      });
      if (!reward.ok) {
        return Response.json({ error: reward.error || 'Reward could not be verified.' }, { status: 400 });
      }
      authoritativeDiscount = reward.exactDiscount || 0;
    }

    // ── Trusted pricing: recompute from authoritative MenuItem/MenuSetting ──
    // Rejects a mismatched client total before any Stripe intent is created so
    // a manipulated cart can never be charged. The reward discount is now the
    // authoritative exact value from validateRewardDiscount. See verifyOrderPricing
    // for the full authority map.
    const pricing = await verifyOrderPricing(base44, {
      items,
      orderType,
      deliveryAddress: customer?.address || '',
      clientSubtotal: subtotal,
      clientDeliveryFee: deliveryFee,
      clientTax: tax,
      clientTotal: total,
      clientTip: tip,
      clientDiscount: authoritativeDiscount,
      clientHappyHourDiscount: happyHourDiscount,
    });
    if (!pricing.ok) {
      return Response.json({ error: pricing.error || 'Price verification failed' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    // The publishable key is handed to the browser to initialize Stripe.js. Read
    // it the same way getStripePublishableKey does (runtime secrets, falling back
    // to the env var) and fail BEFORE creating the intent or the order: a missing
    // key used to leave the customer on a payment step they could not use, while
    // an unpaid Order sat stranded on the register.
    let publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');
    try {
      publishableKey = secrets.get('STRIPE_PUBLISHABLE_KEY') || publishableKey;
    } catch (keyErr) {
      console.error('Publishable key unavailable via runtime secrets:', keyErr.message);
    }
    if (!publishableKey) {
      return Response.json({ error: 'Payment is temporarily unavailable — nothing was charged. Please try again in a moment.' }, { status: 503 });
    }

    const orderNumber = Date.now().toString().slice(-6);
    const amountCents = Math.round(pricing.total * 100);

    // When a signed-in customer has saved cards (or wants to save this card),
    // attach the Stripe Customer so saved payment methods can be charged and
    // the card can be reused after this payment (setup_future_usage).
    const piParams = {
      amount: amountCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true },
      metadata: {
        base44_app_id: Deno.env.get('BASE44_APP_ID'),
        order_number: orderNumber,
        order_type: orderType,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone || '',
        delivery_address: customer.address || '',
        table_number: customer.table || '',
        special_instructions: instructions || '',
      },
    };
    if (stripeCustomerId) {
      piParams.customer = stripeCustomerId;
    }
    const paymentIntent = await stripe.paymentIntents.create(piParams);

    // ── Persist the Order BEFORE returning a payable intent ──
    // If the DB save fails, cancel the just-created (unconfirmed) intent so no
    // payable flow exists without a recoverable persisted Order, then return an
    // error. This closes the orphan-paid-order gap from the audit.
    let orderSaved = false;
    let orderSaveError: string | null = null;
    try {
      await base44.asServiceRole.entities.Order.create({
        order_number: orderNumber,
        order_type: orderType,
        ...(orderType === 'pickup' ? { pickup_method: pickupMethod === 'curbside' ? 'curbside' : 'counter' } : {}),
        ...(vehicle && (vehicle.color || vehicle.make || vehicle.model) ? {
          arrival_details: {
            car_color: vehicle.color || '',
            car_make: vehicle.make || '',
            car_model: vehicle.model || '',
          },
        } : {}),
        status: 'pending',
        payment_status: 'pending',
        items: items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url || '', selectedModifiers: i.selectedModifiers || [], catalog_object_id: i.catalog_object_id || '', square_item_id: i.square_item_id || '', isBuildShake: !!i.isBuildShake, deluxeLabel: i.deluxeLabel || '', deluxeToppings: i.deluxeToppings || [], allergyNote: i.allergyNote || '' })),
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        delivery_fee: pricing.deliveryFee,
        tip: pricing.tip,
        discount: pricing.discount,
        happy_hour_discount: pricing.happyHourDiscount,
        redemption_id: redemptionId || '',
        loyalty_opt_in: loyaltyOptIn === true,
        direct_web_rewards_v2: true,
        total: pricing.total,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone || '',
        delivery_address: customer.address || '',
        special_instructions: instructions || '',
        table_number: customer.table || '',
        stripe_session_id: paymentIntent.id,
        scheduled_for: scheduledFor || '',
        estimated_time: typeof estimatedTime === 'number' ? estimatedTime : 20,
      });
      orderSaved = true;
    } catch (dbError) {
      orderSaveError = dbError.message;
      console.error('Order.create failed — canceling unconfirmed intent:', dbError.message);
    }

    if (!orderSaved) {
      // Compensate: cancel the unconfirmed intent so it can never be charged.
      try {
        await stripe.paymentIntents.cancel(paymentIntent.id);
      } catch (cancelErr) {
        console.error('Failed to cancel orphan intent (logging reconciliation exception):', cancelErr.message);
      }
      // Log the reconciliation exception for admin follow-up.
      console.error(`RECONCILIATION: orphan intent ${paymentIntent.id} canceled for order ${orderNumber}; DB error: ${orderSaveError}`);
      return Response.json({ error: 'Could not save your order. No charge was made — please try again.' }, { status: 500 });
    }

    // ── SMS consent: inspect the result, never claim enrollment on failure ──
    // Only fires when the customer checked the optional, unchecked transactional
    // box. Never grants marketing; never infers consent from the phone alone.
    let smsConsentStored = true;
    if (smsTransactionalConsent && customer?.phone) {
      try {
        const result = await upsertSmsConsent(base44, {
          phone: customer.phone,
          name: customer.name,
          email: customer.email,
          transactionalConsent: true,
          marketingConsent: false,
          sourcePage: 'checkout',
          disclosureVersion: smsConsentVersion || SMS_CONSENT_VERSION,
          disclosureText: smsConsentDisclosure,
        });
        if (!result?.ok) {
          smsConsentStored = false;
          console.error(`SMS consent upsert failed for order ${orderNumber} (${customer.phone}): ${result?.error || 'unknown'}`);
        }
      } catch (smsError) {
        smsConsentStored = false;
        console.error(`SMS consent upsert threw for order ${orderNumber} (${customer.phone}):`, smsError.message);
      }
    }

    return Response.json({
      clientSecret: paymentIntent.client_secret,
      publishableKey,
      orderNumber,
      smsConsentStored,
    });
  } catch (error) {
    console.error('createPaymentIntent error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});