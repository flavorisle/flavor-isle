import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { upsertSmsConsent, SMS_CONSENT_VERSION } from '../../shared/smsConsent.ts';
import { verifyOrderPricing } from '../../shared/verifyOrderPricing.ts';
import { validateRewardDiscount } from '../../shared/squareLoyalty.ts';
import { findBlock } from '../../shared/blockedContacts.ts';
import { normalizeReferralCode } from '../../shared/referral.ts';
import { customerLinkFields } from '../../shared/customerLink.ts';
import { getSmashieSettings, webPaymentProvider } from '../../shared/smashieSettings.ts';
import { createSquareCheckoutLink } from '../../shared/squareWebCheckout.ts';
import { formatItemModifiers } from '../../shared/ticketFormat.ts';

// The website's secure payment page when the owner's switch is set to the
// alternate processor (issue #95).
//
// The validation front half is createPaymentIntent's, unchanged: blocked
// customers, the loyalty phone check, reward validation against the rewards
// program, and the authoritative re-pricing of the whole cart. Only once the
// order is verified do we create the hosted payment page and hand its URL back
// for the browser to follow — the customer never sees a processor name.
//
// The saved order's total is the FOOD total (subtotal − discounts + tax +
// delivery). The tip is chosen on the secure page, exactly like the pay link
// Smashie texts, so the tip the customer adds is recorded from the payment
// itself when the order settles.
const PAY_PAGE_ORIGIN = 'https://flavor-isle.com';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// The ticket note the secure page's Square order carries, in the same shape
// createSquareOrder prints for a website order, so the counter and kitchen see
// what they always see.
function checkoutFulfillmentNote({ orderType, pickupMethod, vehicle, customer, instructions }) {
  const lines: string[] = [];
  if (orderType === 'delivery') {
    lines.push('DELIVERY', customer.name || '', customer.address || '', customer.phone || '');
  } else if (orderType === 'dine_in') {
    lines.push('DINE IN', `Table: ${customer.table || 'N/A'}`, customer.name || '');
  } else {
    const curbside = pickupMethod === 'curbside' && vehicle;
    const carDesc = curbside ? [vehicle?.color, vehicle?.make, vehicle?.model].filter(Boolean).join(' ') : '';
    lines.push('CURBSIDE', customer.name || '', customer.phone || '');
    if (carDesc) lines.push(`Car: ${carDesc}`);
  }
  if (instructions) lines.push('', `NOTES: ${instructions}`);
  return lines.filter((line, index) => line !== '' || index > 0).join('\n').trim();
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { items, orderType, pickupMethod, customer, instructions, subtotal, deliveryFee, tax, total, tip, discount, redemptionId, scheduledFor, estimatedTime, vehicle, happyHourDiscount, bundleDiscount, smsTransactionalConsent, smsConsentDisclosure, smsConsentVersion, loyaltyOptIn, referralCode } = body;

    // The owner's switch is the only thing that decides where the website's
    // payment page is created. If it is back on the default path, this endpoint
    // refuses rather than opening a second kind of payment page.
    const settings = await getSmashieSettings(base44);
    if (webPaymentProvider(settings) !== 'square') {
      console.warn('createSquareWebCheckout: refused — the website payment switch is not on this path');
      return Response.json({ error: 'This checkout is no longer available. Please refresh and order again.' }, { status: 410 });
    }

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
    // exact discount, eligibility and account balance — BEFORE any payment page
    // exists. The authoritative discount is what the charge uses.
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
    // The tip is collected on the secure page, so the saved total is the food
    // total — the payment must equal it exactly for the order to settle.
    const foodTotal = round2(pricing.total - (pricing.tip || 0));

    // Customer link (issue #96, section A) — the same normalized phone + profile
    // id every other order-creation path writes.
    const customerLink = await customerLinkFields(base44, { phone: customer?.phone, email: customer?.email });

    // ── Persist the Order BEFORE opening a payable page ──
    let orderSaved = false;
    let orderSaveError: string | null = null;
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
        tip: 0,
        discount: pricing.discount,
        happy_hour_discount: pricing.happyHourDiscount,
        bundle_discount: pricing.bundleDiscount || 0,
        bundle_id: (pricing.bundleDiscount || 0) > 0 ? 'school-night-lifesaver' : '',
        redemption_id: redemptionId || '',
        loyalty_opt_in: loyaltyOptIn === true,
        referral_code: normalizeReferralCode(referralCode),
        direct_web_rewards_v2: true,
        total: foodTotal,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone || '',
        delivery_address: customer.address || '',
        special_instructions: instructions || '',
        table_number: customer.table || '',
        scheduled_for: scheduledFor || '',
        estimated_time: typeof estimatedTime === 'number' ? estimatedTime : 20,
      });
      orderSaved = true;
    } catch (dbError) {
      orderSaveError = dbError.message;
      console.error('Order.create failed — no payment page created:', dbError.message);
    }

    if (!orderSaved) {
      return Response.json({ error: 'Could not save your order. No charge was made — please try again.' }, { status: 500 });
    }

    // ── Open the secure payment page and verify Square's total to the cent ──
    // The link is idempotent per order (its key is the order id), so a retried
    // request can never mint a second payable page, and an order that already
    // carries one is reused rather than re-created.
    let link = null;
    try {
      if (order.payment_url && order.square_payment_link_id) {
        link = { url: order.payment_url, linkId: order.square_payment_link_id, orderId: order.square_checkout_order_id };
      } else {
        const emailOk = !!customer.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email);
        const discountFields = [
          pricing.discount > 0 ? { uid: 'loyalty-reward', name: 'Loyalty Reward', amountUsd: pricing.discount } : null,
          pricing.happyHourDiscount > 0 ? { uid: 'happy-hour', name: 'Happy Hour 50% Off Drinks', amountUsd: pricing.happyHourDiscount } : null,
          (pricing.bundleDiscount || 0) > 0 ? { uid: 'family-bundle', name: 'School Night Lifesaver Bundle', amountUsd: pricing.bundleDiscount } : null,
        ].filter(Boolean);
        const taxBase = round2(pricing.subtotal - pricing.discount - pricing.happyHourDiscount - (pricing.bundleDiscount || 0));

        link = await createSquareCheckoutLink(base44, {
          idempotencyKey: `web-square-${order.id}`,
          referenceId: order.id,
          sourceName: 'Flavor Isle Web',
          lineItems: items.map(i => ({
            name: i.name,
            quantity: i.quantity || 1,
            note: formatItemModifiers(i).join(', '),
            unitPriceUsd: i.price,
          })),
          discounts: discountFields,
          taxUsd: pricing.tax,
          taxBaseUsd: taxBase,
          serviceCharges: pricing.deliveryFee > 0 ? [{ uid: 'delivery-fee', name: 'Delivery Fee', amountUsd: pricing.deliveryFee }] : [],
          totalCents: Math.round(foodTotal * 100),
          redirectUrl: `${PAY_PAGE_ORIGIN}/order-confirmation?order_number=${orderNumber}&square=1${scheduledFor ? `&ready_for=${encodeURIComponent(scheduledFor)}` : ''}`,
          paymentNote: `Flavor Isle order #${orderNumber}`,
          fulfillmentNote: checkoutFulfillmentNote({ orderType, pickupMethod, vehicle, customer, instructions }),
          recipient: {
            display_name: `${customer.name} (#${orderNumber})`,
            ...(customer.phone ? { phone_number: customer.phone } : {}),
            ...(emailOk ? { email_address: customer.email } : {}),
          },
          metadata: { app_order_id: order.id, order_source: 'flavor-isle-website', order_type: orderType },
        });

        await base44.asServiceRole.entities.Order.update(order.id, {
          payment_provider: 'square',
          square_payment_link_id: link.linkId,
          square_checkout_order_id: link.orderId,
          payment_url: link.url,
          manual_pay_required: false,
        });
      }
    } catch (linkErr) {
      // Nothing payable exists, so the pending order is removed instead of left
      // stranded on the register. No charge was made.
      console.error(`Square web checkout setup failed for order ${orderNumber}:`, (linkErr as Error).message);
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
      payment_url: link.url,
      total: foodTotal,
      smsConsentStored,
    });
  } catch (error) {
    console.error('createSquareWebCheckout error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}