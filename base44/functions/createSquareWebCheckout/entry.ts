import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { upsertSmsConsent, SMS_CONSENT_VERSION } from '../../shared/smsConsent.ts';
import { verifyOrderPricing } from '../../shared/verifyOrderPricing.ts';
import { validateRewardDiscount } from '../../shared/squareLoyalty.ts';
import { findBlock } from '../../shared/blockedContacts.ts';
import { normalizeReferralCode } from '../../shared/referral.ts';
import { customerLinkFields } from '../../shared/customerLink.ts';

// The website checkout's order creation.
//
// The whole validation front half lives here and is unchanged: blocked customers,
// the loyalty phone check, reward validation against the live rewards program, and
// the authoritative re-pricing of the entire cart. Once the order is verified and
// saved, the customer is handed to OUR OWN payment page (flavor-isle.com/pay-square),
// where Square's card form runs inside our page — no processor hosted page, no
// redirect off the site. The charge is made there, server-side, against this saved
// order's own total.
const PAY_PAGE_ORIGIN = 'https://flavor-isle.com';

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
    // The authoritative discount is what the charge uses.
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

    // ── Persist the Order ──
    // The tip is chosen in checkout before the customer reaches the payment page,
    // so it is part of the total saved here: the amount charged on our payment
    // page is exactly this total, to the cent.
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
        payment_provider: 'square',
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
      console.error('Order.create failed — no payment page created:', dbError.message);
      return Response.json({ error: 'Could not save your order. No charge was made — please try again.' }, { status: 500 });
    }

    // ── Hand the customer to our own payment page ──
    // No processor page is involved: this URL is our own page, with Square's card
    // form embedded in it. `tip=included` tells the page the tip is already inside
    // the saved total, so it does not offer a second one.
    const payUrl = `${PAY_PAGE_ORIGIN}/pay-square?order_number=${orderNumber}&tip=included`;
    try {
      await base44.asServiceRole.entities.Order.update(order.id, {
        payment_provider: 'square',
        payment_url: payUrl,
        manual_pay_required: false,
      });
    } catch (linkErr) {
      // Nothing payable exists, so the pending order is removed instead of left
      // stranded on the register. No charge was made.
      console.error(`Could not record the payment page for order ${orderNumber}:`, (linkErr as Error).message);
      try {
        await base44.asServiceRole.entities.Order.delete(order.id);
      } catch (cleanupErr) {
        console.error(`Failed to remove stranded pending order ${orderNumber}:`, (cleanupErr as Error).message);
      }
      return Response.json({ error: 'We could not open the secure payment page, so nothing was charged. Please tap Continue to Payment again.' }, { status: 502 });
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
        console.error(`SMS consent upsert threw for order ${orderNumber} (${customer.phone}):`, smsError.message);
      }
    }

    return Response.json({
      provider: 'square',
      orderNumber,
      payment_url: payUrl,
      total: pricing.total,
      smsConsentStored,
    });
  } catch (error) {
    console.error('createSquareWebCheckout error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}