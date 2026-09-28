import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { upsertSmsConsent, SMS_CONSENT_VERSION } from '../../shared/smsConsent.ts';
import { verifyOrderPricing } from '../../shared/verifyOrderPricing.ts';

// Group / split payment:
// Creates ONE order record for the whole group (so the kitchen sees a single
// ticket and the group is charged a single delivery fee + tax), but splits the
// charge into N per-person Stripe PaymentIntents whose amounts sum to the total.
// Each person pays their own card; the group still only pays one fee.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      items, orderType, pickupMethod, vehicle, customer, instructions,
      subtotal, deliveryFee, tax, total, tip,
      scheduledFor, estimatedTime,
      splits, // [{ person_name, subtotal, tax, deliveryFee, tip, total }]
      groupName,
      happyHourDiscount,
      smsTransactionalConsent, smsConsentDisclosure, smsConsentVersion,
    } = body;

    if (!items || items.length === 0) {
      return Response.json({ error: 'No items provided' }, { status: 400 });
    }
    if (!splits || splits.length === 0) {
      return Response.json({ error: 'No payment splits provided' }, { status: 400 });
    }

    // ── Trusted pricing: recompute the GROUP total authoritatively ──
    const pricing = await verifyOrderPricing(base44, {
      items,
      orderType,
      deliveryAddress: customer?.address || '',
      clientSubtotal: subtotal,
      clientDeliveryFee: deliveryFee,
      clientTax: tax,
      clientTotal: total,
      clientTip: tip,
      clientDiscount: 0, // group/separate flow does not apply a reward
      clientHappyHourDiscount: happyHourDiscount,
    });
    if (!pricing.ok) {
      return Response.json({ error: pricing.error || 'Price verification failed' }, { status: 400 });
    }

    // ── Validate the splits sum to the authoritative group total ──
    const splitsSum = round2(splits.reduce((s: number, sp: any) => s + (Number(sp.total) || 0), 0));
    if (Math.abs(splitsSum - pricing.total) * 100 > 1) {
      return Response.json({ error: `Split amounts (${splitsSum.toFixed(2)}) do not match the order total (${pricing.total.toFixed(2)}). Please refresh and try again.` }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    const publishableKey = Deno.env.get('STRIPE_PUBLISHABLE_KEY');

    const orderNumber = Date.now().toString().slice(-6);

    // ── Persist the shared Order BEFORE creating any payable intent ──
    // A failed Order.create now returns an error (no intents created) so there
    // is never a payable flow without a recoverable persisted Order.
    let groupOrderId = '';
    try {
      const groupOrder = await base44.asServiceRole.entities.Order.create({
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
        items: items.map(i => ({
          name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url || '',
          selectedModifiers: i.selectedModifiers || [], person_name: i.person_name || '',
          catalog_object_id: i.catalog_object_id || '', square_item_id: i.square_item_id || '',
          isBuildShake: !!i.isBuildShake, deluxeLabel: i.deluxeLabel || '', deluxeToppings: i.deluxeToppings || [], allergyNote: i.allergyNote || '',
        })),
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        delivery_fee: pricing.deliveryFee,
        tip: pricing.tip,
        discount: 0,
        happy_hour_discount: pricing.happyHourDiscount,
        total: pricing.total,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone || '',
        delivery_address: customer.address || '',
        special_instructions: (instructions || '') + (groupName ? `\n[Group Order: ${groupName}]` : ''),
        table_number: customer.table || '',
        stripe_session_id: 'GROUP',
        scheduled_for: scheduledFor || '',
        estimated_time: typeof estimatedTime === 'number' ? estimatedTime : 20,
      });
      groupOrderId = groupOrder.id;
    } catch (dbError) {
      console.error('Group Order.create failed — no intents created:', dbError.message);
      return Response.json({ error: 'Could not save your group order. No charge was made — please try again.' }, { status: 500 });
    }

    // ── SMS consent: inspect the result, never claim enrollment on failure ──
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
          console.error(`SMS consent upsert failed for group order ${orderNumber} (${customer.phone}): ${result?.error || 'unknown'}`);
        }
      } catch (smsError) {
        smsConsentStored = false;
        console.error(`SMS consent upsert threw for group order ${orderNumber} (${customer.phone}):`, smsError.message);
      }
    }

    // ── Create one PaymentIntent per person ──
    // If any intent creation fails, cancel every already-created intent so no
    // partial payable set is left dangling, then return an error. Each created
    // intent is also recorded as a GroupPaymentShare (admin-only) so the Stripe
    // webhook and the browser fallback can settle the parent order ONLY when
    // ALL shares succeed at the correct amounts — independently of the client.
    const intents: any[] = [];
    const shareRecords: any[] = [];
    for (const split of splits) {
      const amountCents = Math.round((Number(split.total) || 0) * 100);
      if (amountCents <= 0) continue;
      try {
        const pi = await stripe.paymentIntents.create({
          amount: amountCents,
          currency: 'usd',
          automatic_payment_methods: { enabled: true },
          metadata: {
            base44_app_id: Deno.env.get('BASE44_APP_ID'),
            order_number: orderNumber,
            order_type: orderType,
            person_name: split.person_name || '',
            customer_name: customer.name,
            customer_email: customer.email,
          },
        });
        intents.push({
          person_name: split.person_name || 'Guest',
          clientSecret: pi.client_secret,
          amount: split.total,
          intentId: pi.id,
        });
        shareRecords.push({
          order_id: groupOrderId,
          order_number: orderNumber,
          intent_id: pi.id,
          person_name: split.person_name || 'Guest',
          expected_amount: Number(split.total) || 0,
          status: 'pending',
        });
      } catch (intentErr) {
        // Compensate: cancel all already-created (unconfirmed) intents.
        console.error(`Group intent creation failed for order ${orderNumber}; canceling ${intents.length} created intents:`, intentErr.message);
        for (const created of intents) {
          try {
            await stripe.paymentIntents.cancel(created.intentId);
          } catch (cancelErr) {
            console.error(`RECONCILIATION: failed to cancel group intent ${created.intentId}:`, cancelErr.message);
          }
        }
        // Record the canceled shares so admin can see the failed setup.
        try {
          await base44.asServiceRole.entities.GroupPaymentShare.bulkCreate(
            shareRecords.map((r) => ({ ...r, status: 'canceled', settled_at: new Date().toISOString() })),
          );
        } catch (shareErr) {
          console.error('Failed to record canceled group shares:', shareErr.message);
        }
        return Response.json({ error: 'Could not start one of the split payments. No charge was made — please try again.' }, { status: 500 });
      }
    }

    // ── Persist the group payment shares (admin-only settlement ledger) ──
    // The webhook matches group intents by intent_id against these records and
    // settles the parent order only when every share is succeeded at the
    // expected amount. Non-fatal if this fails — the browser fallback can still
    // reconcile via Stripe intent retrieval, but admin visibility is degraded.
    try {
      await base44.asServiceRole.entities.GroupPaymentShare.bulkCreate(shareRecords);
    } catch (shareErr) {
      console.error('Failed to persist group payment shares:', shareErr.message);
    }

    return Response.json({
      orderNumber,
      publishableKey,
      intents,
      smsConsentStored,
    });
  } catch (error) {
    console.error('createGroupPayment error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}