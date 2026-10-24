import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { upsertSmsConsent, SMS_CONSENT_VERSION } from '../../shared/smsConsent.ts';
import { verifyOrderPricing } from '../../shared/verifyOrderPricing.ts';
import { validateRewardDiscount } from '../../shared/squareLoyalty.ts';
import { findBlock } from '../../shared/blockedContacts.ts';
import { normalizeReferralCode } from '../../shared/referral.ts';
import { customerLinkFields } from '../../shared/customerLink.ts';
import { getSmashieSettings, webPaymentProvider } from '../../shared/smashieSettings.ts';
import { todaysMilkshakePrize } from '../../shared/findSmashiePrize.ts';
import { openWixCheckoutSession, resolveAppUrl, wixCheckoutConfigured } from '../../shared/wixCheckout.ts';
import { openSquareFallbackForOrder } from '../../shared/checkoutFallback.ts';

// The website's secure card checkout on Base44 Payments (Wix) — the primary path
// (issue #116, Part A step 2). This is createSquareWebCheckout's twin and keeps the
// same front half: blocked customers, loyalty phone check, reward validation and
// authoritative server-side re-pricing. The order is saved with its tip already
// inside its total, and then the platform checkout session is opened for exactly
// that saved total.
//
// Returns { orderNumber, checkoutUrl } — the browser redirects to checkoutUrl.
//
// If the session cannot be opened for any reason, the SAME saved order is given its
// Square checkout link (Part C) and the fallback is recorded on the order, so the
// customer is never left on a dead button.
const PAY_PAGE_ORIGIN = 'https://flavor-isle.com';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { items, orderType, pickupMethod, customer, instructions, subtotal, deliveryFee, tax, total, tip, discount, redemptionId, scheduledFor, estimatedTime, vehicle, happyHourDiscount, bundleDiscount, smsTransactionalConsent, smsConsentDisclosure, smsConsentVersion, loyaltyOptIn, referralCode, freeShakePrize } = body;

    // The owner's switch decides which system backs the website's payment page. If it
    // is not on the Base44 Payments path, this endpoint refuses rather than opening a
    // second kind of payment page.
    const settings = await getSmashieSettings(base44);
    if (webPaymentProvider(settings) !== 'wix') {
      console.warn('createWixWebCheckout: refused — the website payment switch is not on the Base44 Payments path');
      return Response.json({ error: 'This checkout is no longer available. Please refresh and order again.' }, { status: 410 });
    }

    if (!items || items.length === 0) {
      return Response.json({ error: 'No items provided' }, { status: 400 });
    }

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

    // The free Find Smashie shake (issue #108): only honoured when the signed-in
    // customer genuinely holds today's unused shake win.
    const freeShakePrizeGranted = freeShakePrize === true && await (async () => {
      try {
        const user = await base44.auth.me();
        return !!(user && await todaysMilkshakePrize(base44, user.id));
      } catch (error) {
        console.warn('createWixWebCheckout: free-shake prize check failed — no discount applied:', (error as Error).message);
        return false;
      }
    })();
    if (freeShakePrize === true && !freeShakePrizeGranted) {
      console.warn('createWixWebCheckout: free-shake prize claimed but not held by this signed-in customer — ignored');
    }

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
      freeShakePrize: freeShakePrizeGranted,
    });
    if (!pricing.ok) {
      return Response.json({ error: pricing.error || 'Price verification failed' }, { status: 400 });
    }

    const orderNumber = Date.now().toString().slice(-6);
    // The tip chosen in our own checkout stays inside the saved total: the secure
    // page charges exactly this amount and settlement checks it to the cent.
    const chargeTotal = round2(pricing.total);
    const customerLink = await customerLinkFields(base44, { phone: customer?.phone, email: customer?.email });
    const appUrl = resolveAppUrl(req);

    // ── Retry guard (issue #113) ──
    // A refresh or back-button loses the saved order, so a resubmit used to mint a
    // second unpaid order for the same cart. Before saving a new order, look for THIS
    // customer's own pending/unpaid order from the last 10 minutes with the same item
    // count and the same saved total, and re-open that one instead. Fail-open.
    try {
      const guardPhone = customerLink.normalized_phone;
      const guardEmail = String(customer?.email || '').trim().toLowerCase();
      if (guardPhone || guardEmail) {
        const dupFilter = guardPhone
          ? { normalized_phone: guardPhone, status: 'pending', payment_status: 'pending' }
          : { customer_email: guardEmail, status: 'pending', payment_status: 'pending' };
        const recent = await base44.asServiceRole.entities.Order.filter(dupFilter, '-created_date', 20);
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        const match = (recent || []).find((o: any) =>
          (o.payment_provider === 'wix' || o.payment_provider === 'square')
          && new Date(o.created_date).getTime() >= tenMinutesAgo
          && (o.items?.length || 0) === items.length
          && round2(Number(o.total)) === chargeTotal
        );
        if (match) {
          // A Square fallback order already has a working link: hand it back rather
          // than opening a second payable page for the same cart.
          if (match.payment_provider === 'square' && match.payment_url) {
            console.log(`createWixWebCheckout: retry guard — reopening square order ${match.order_number}`);
            return Response.json({
              provider: 'square',
              orderNumber: match.order_number,
              checkoutUrl: match.payment_url,
              total: round2(Number(match.total)),
              smsConsentStored: true,
              reused: true,
            });
          }
          console.log(`createWixWebCheckout: retry guard — reopening pending order ${match.order_number} instead of creating a second order`);
          const name = splitName(customer?.name);
          const session = await openWixCheckoutSession(base44, {
            orderNumber: match.order_number,
            amount: round2(Number(match.total)),
            appUrl,
            thankYouPath: `/order-confirmation?order_number=${encodeURIComponent(match.order_number)}&wix=1&from=checkout`,
            appUserId: null,
            buyer: { email: customer?.email, phone: customer?.phone, ...name },
          });
          const reuseUrl = `${PAY_PAGE_ORIGIN}/pay?order_number=${encodeURIComponent(match.order_number)}`;
          await base44.asServiceRole.entities.Order.update(match.id, {
            payment_url: reuseUrl,
            wix_checkout_session_id: session.checkoutSessionId,
          });
          return Response.json({
            provider: 'wix',
            orderNumber: match.order_number,
            checkoutUrl: session.redirectUrl,
            payment_url: reuseUrl,
            total: round2(Number(match.total)),
            smsConsentStored: true,
            reused: true,
          });
        }
      }
    } catch (guardError) {
      console.error('createWixWebCheckout: retry-guard lookup failed — creating a new order as before:', (guardError as Error).message);
    }

    // ── Persist the Order BEFORE opening a payable page ──
    // payment_provider starts on the primary path; the fallback below repoints it if
    // the session cannot be opened, so the record always names where the customer paid.
    let order: any = null;
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
        items: items.map((i: any) => ({ name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url || '', selectedModifiers: i.selectedModifiers || [], catalog_object_id: i.catalog_object_id || '', square_item_id: i.square_item_id || '', isBuildShake: !!i.isBuildShake, deluxeLabel: i.deluxeLabel || '', deluxeToppings: i.deluxeToppings || [], allergyNote: i.allergyNote || '' })),
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        delivery_fee: pricing.deliveryFee,
        tip: round2(pricing.tip || 0),
        discount: round2((pricing.discount || 0) + (pricing.freeShakeDiscount || 0)),
        happy_hour_discount: pricing.happyHourDiscount,
        bundle_discount: pricing.bundleDiscount || 0,
        bundle_id: (pricing.bundleDiscount || 0) > 0 ? 'school-night-lifesaver' : '',
        redemption_id: redemptionId || '',
        loyalty_opt_in: loyaltyOptIn === true,
        referral_code: normalizeReferralCode(referralCode),
        direct_web_rewards_v2: true,
        total: chargeTotal,
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

    // ── Open the secure payment page for exactly the saved total ──
    const name = splitName(customer?.name);
    let checkoutUrl = '';
    let provider = 'wix';
    let sessionId = '';
    try {
      if (!wixCheckoutConfigured()) throw new Error('Base44 Payments is not configured yet');
      const session = await openWixCheckoutSession(base44, {
        orderNumber,
        amount: chargeTotal,
        appUrl,
        thankYouPath: `/order-confirmation?order_number=${encodeURIComponent(orderNumber)}&wix=1&from=checkout`,
        appUserId: null,
        buyer: { email: customer?.email, phone: customer?.phone, ...name },
      });
      checkoutUrl = session.redirectUrl;
      sessionId = session.checkoutSessionId;
      await base44.asServiceRole.entities.Order.update(order.id, {
        payment_url: `${PAY_PAGE_ORIGIN}/pay?order_number=${encodeURIComponent(orderNumber)}`,
        wix_checkout_session_id: sessionId,
        manual_pay_required: false,
      });
    } catch (sessionError) {
      // ── Part C: the automatic Square fallback for the SAME saved order ──
      console.error(`createWixWebCheckout: secure page failed for order ${orderNumber} — falling back to Square:`, (sessionError as Error).message);
      try {
        const link = await openSquareFallbackForOrder(base44, order, appUrl);
        checkoutUrl = link.url;
        provider = 'square';
        console.log(`createWixWebCheckout: order ${orderNumber} moved to the Square payment page (fallback logged on the order)`);
      } catch (fallbackError) {
        // Nothing payable exists at all: remove the pending order rather than leaving
        // it stranded, and tell the customer. No charge was made.
        console.error(`createWixWebCheckout: Square fallback also failed for order ${orderNumber}:`, (fallbackError as Error).message);
        try {
          await base44.asServiceRole.entities.Order.delete(order.id);
        } catch (cleanupErr) {
          console.error(`Failed to remove stranded pending order ${orderNumber}:`, (cleanupErr as Error).message);
        }
        return Response.json({
          error: 'We could not open the secure payment page, so nothing was charged. Please tap Continue to Payment again, or call us at (270) 563-4618.',
        }, { status: 503 });
      }
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

    return Response.json({
      provider,
      orderNumber,
      // The browser redirects here: the platform's hosted page on the primary path,
      // the Square page when the fallback took over.
      checkoutUrl,
      payment_url: checkoutUrl,
      total: chargeTotal,
      smsConsentStored,
    });
  } catch (error) {
    console.error('createWixWebCheckout error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}