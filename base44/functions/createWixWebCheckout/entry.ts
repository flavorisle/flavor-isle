import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { upsertSmsConsent, SMS_CONSENT_VERSION } from '../../shared/smsConsent.ts';
import { verifyOrderPricing } from '../../shared/verifyOrderPricing.ts';
import { validateRewardDiscount } from '../../shared/squareLoyalty.ts';
import { findBlock } from '../../shared/blockedContacts.ts';
import { normalizeReferralCode } from '../../shared/referral.ts';
import { customerLinkFields } from '../../shared/customerLink.ts';

// The website checkout's order creation when the secure payment page is set to
// Base44 Payments (powered by Wix) — issue #98, part A.
//
// This is the same order creation the Square path uses, with one difference: the
// customer is not sent to our own page but to the provider's hosted checkout,
// which is opened by the platform's create-checkout function once this order
// exists. Everything the Square path guarantees is honoured here too:
//
//   - the whole cart is re-priced server-side against the menu (never the
//     client's numbers), rewards are verified against the live program, and the
//     tip chosen at checkout is inside the saved total;
//   - the order is saved unpaid (payment_status: 'pending', provider: 'wix') so
//     nothing reaches Square POS or the kitchen until the provider confirms the
//     money, which settlement does;
//   - the order number is what the checkout carries, so the payment can be
//     matched back to this exact order;
//   - referral code, loyalty opt-in and SMS consent travel exactly as before.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { items, orderType, pickupMethod, customer, instructions, subtotal, deliveryFee, tax, total, tip, discount, redemptionId, scheduledFor, estimatedTime, vehicle, happyHourDiscount, bundleDiscount, smsTransactionalConsent, smsConsentDisclosure, smsConsentVersion, loyaltyOptIn, referralCode } = body;

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

    // ── Reward validation ── verified against the live rewards program — tier,
    // exact discount, eligibility and account balance — BEFORE the order is saved.
    let authoritativeDiscount = Number(discount) || 0;
    if (redemptionId) {
      const reward = await validateRewardDiscount({
        phone: customer?.phone,
        email: customer?.email,
        rewardTierId: redemptionId,
        claimedDiscount: Number(discount) || 0,
        subtotal: Number(subtotal) || 0,
        cartItems: items,
      });
      if (!reward.ok) {
        return Response.json({ error: reward.error || 'Reward could not be verified.' }, { status: 400 });
      }
      authoritativeDiscount = reward.exactDiscount || 0;
    }

    // ── Trusted pricing: recompute from authoritative MenuItem/MenuSetting ──
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
      clientBundleDiscount: bundleDiscount,
    });
    if (!pricing.ok) {
      return Response.json({ error: pricing.error || 'Price verification failed' }, { status: 400 });
    }

    const orderNumber = Date.now().toString().slice(-6);

    // Customer link (issue #96, section A) — the same normalized phone + profile
    // id every other order-creation path writes.
    const customerLink = await customerLinkFields(base44, { phone: customer?.phone, email: customer?.email });

    // ── Persist the Order, unpaid ──
    // The tip chosen at checkout is part of the total saved here, so the amount
    // the hosted checkout charges is exactly this total, to the cent.
    let order = null;
    try {
      order = await base44.asServiceRole.entities.Order.create({
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
        payment_provider: 'wix',
        normalized_phone: customerLink.normalized_phone,
        customer_id: customerLink.customer_id,
        items: items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url || '', selectedModifiers: i.selectedModifiers || [], catalog_object_id: i.catalog_object_id || '', square_item_id: i.square_item_id || '', isBuildShake: !!i.isBuildShake, deluxeLabel: i.deluxeLabel || '', deluxeToppings: i.deluxeToppings || [], allergyNote: i.allergyNote || '' })),
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        delivery_fee: pricing.deliveryFee,
        tip: pricing.tip || 0,
        discount: pricing.discount,
        happy_hour_discount: pricing.happyHourDiscount,
        bundle_discount: pricing.bundleDiscount || 0,
        bundle_id: (pricing.bundleDiscount || 0) > 0 ? 'school-night-lifesaver' : '',
        redemption_id: redemptionId || '',
        loyalty_opt_in: loyaltyOptIn === true,
        referral_code: normalizeReferralCode(referralCode),
        direct_web_rewards_v2: true,
        total: pricing.total,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone || '',
        delivery_address: customer.address || '',
        special_instructions: instructions || '',
        table_number: customer.table || '',
        scheduled_for: scheduledFor || '',
        estimated_time: typeof estimatedTime === 'number' ? estimatedTime : 20,
      });
    } catch (dbError) {
      console.error('Order.create failed — no payment page created:', (dbError as Error).message);
      return Response.json({ error: 'Could not save your order. No charge was made — please try again.' }, { status: 500 });
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
          console.error(`SMS consent upsert failed for order ${orderNumber} (${customer.phone}): ${result?.error || 'unknown'}`);
        }
      } catch (smsError) {
        smsConsentStored = false;
        console.error(`SMS consent upsert threw for order ${orderNumber} (${customer.phone}):`, (smsError as Error).message);
      }
    }

    // The caller now opens the hosted checkout for exactly this order (the
    // platform's create-checkout, keyed by this order number). Nothing is charged
    // until that page is completed, and nothing reaches the kitchen until the
    // payment has been verified against this total.
    return Response.json({
      provider: 'wix',
      order_number: orderNumber,
      total: pricing.total,
      smsConsentStored,
    });
  } catch (error) {
    console.error('createWixWebCheckout error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}