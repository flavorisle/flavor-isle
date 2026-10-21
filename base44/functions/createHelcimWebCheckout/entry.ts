import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { upsertSmsConsent, SMS_CONSENT_VERSION } from '../../shared/smsConsent.ts';
import { verifyOrderPricing } from '../../shared/verifyOrderPricing.ts';
import { validateRewardDiscount } from '../../shared/squareLoyalty.ts';
import { findBlock } from '../../shared/blockedContacts.ts';
import { normalizeReferralCode } from '../../shared/referral.ts';
import { customerLinkFields } from '../../shared/customerLink.ts';
import { getSmashieSettings, webPaymentProvider } from '../../shared/smashieSettings.ts';
import { helcimPayPageUrl, helcimCanTakePayment } from '../../shared/helcimCheckout.ts';
import { todaysMilkshakePrize } from '../../shared/findSmashiePrize.ts';

// The website's secure payment page when the owner's switch is set to Helcim.
//
// This is createSquareWebCheckout's twin, kept deliberately parallel so the two
// hosted paths cannot drift: the same validation front half (blocked customers,
// loyalty phone check, reward validation, authoritative re-pricing) and the same
// saved order before any payable page exists.
//
// The order is saved with the tip already inside its total, and the customer is
// sent to OUR OWN page (/pay-helcim), where HelcimPay takes the card for exactly
// that saved total. The payment session itself is minted on that page, so an
// abandoned checkout never leaves a stray invoice in the owner's Helcim account.
//
// FAIL CLOSED, then fall back: with no Helcim API token, this endpoint answers
// with the Square fallback instead of a dead checkout, and the browser opens the
// Square page — never a page that cannot be paid.
const PAY_PAGE_ORIGIN = 'https://flavor-isle.com';

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { items, orderType, pickupMethod, customer, instructions, subtotal, deliveryFee, tax, total, tip, discount, redemptionId, scheduledFor, estimatedTime, vehicle, happyHourDiscount, bundleDiscount, smsTransactionalConsent, smsConsentDisclosure, smsConsentVersion, loyaltyOptIn, referralCode, freeShakePrize } = body;

    // The owner's switch decides where the website's payment page is created.
    // If it is not on the Helcim path, this endpoint refuses rather than opening
    // a second kind of payment page.
    const settings = await getSmashieSettings(base44);
    if (webPaymentProvider(settings) !== 'helcim') {
      console.warn('createHelcimWebCheckout: refused — the website payment switch is not on this path');
      return Response.json({ error: 'This checkout is no longer available. Please refresh and order again.' }, { status: 410 });
    }

    // No Helcim credentials, or a Helcim account that cannot take a USD card right
    // now (no active terminal, an account not boarded yet): refuse outright rather
    // than opening a page that can never be paid. Nothing is charged and no order is
    // created, so the customer is told to try again or call the store.
    if (!(await helcimCanTakePayment())) {
      console.error('createHelcimWebCheckout: Helcim will not open a card payment right now — no order created, nothing charged');
      return Response.json({
        error: 'Our secure card payment is temporarily unavailable, so nothing was charged. Please try again in a moment, or call us at (270) 563-4618.',
      }, { status: 503 });
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

    // The free Find Smashie shake (issue #108). The claim is only honoured when
    // the signed-in customer genuinely holds today's unused shake win — the
    // record is read by their own user id, never from the request — and the money
    // itself is priced from the catalog inside verifyOrderPricing. A forged flag
    // therefore buys nothing.
    const freeShakePrizeGranted = freeShakePrize === true && await (async () => {
      try {
        const user = await base44.auth.me();
        return !!(user && await todaysMilkshakePrize(base44, user.id));
      } catch (error) {
        console.warn('createHelcimWebCheckout: free-shake prize check failed — no discount applied:', (error as Error).message);
        return false;
      }
    })();
    if (freeShakePrize === true && !freeShakePrizeGranted) {
      console.warn('createHelcimWebCheckout: free-shake prize claimed but not held by this signed-in customer — ignored');
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
    // The tip was chosen in our own checkout, so it stays inside the saved total:
    // the secure page charges exactly this amount and settlement checks it to the cent.
    const chargeTotal = round2(pricing.total);
    const customerLink = await customerLinkFields(base44, { phone: customer?.phone, email: customer?.email });

    // ── Retry guard: a resubmit reopens the customer's own still-pending order ──
    // The checkout page loses its saved order on a refresh or back-button, so a
    // resubmit used to mint a second unpaid order for the same cart (Oct 21:
    // Barry Craddock — #688719 abandoned beside paid #727169). Before saving a
    // new order, look for THIS customer's own pending/unpaid Helcim order from
    // the last 10 minutes with the same item count and the same saved total,
    // and reopen that one instead. Fail-open: any lookup problem falls through
    // and creates a fresh order exactly as before.
    try {
      const guardPhone = customerLink.normalized_phone;
      const guardEmail = String(customer?.email || '').trim().toLowerCase();
      if (guardPhone || guardEmail) {
        const dupFilter = guardPhone
          ? { normalized_phone: guardPhone, status: 'pending', payment_status: 'pending' }
          : { customer_email: guardEmail, status: 'pending', payment_status: 'pending' };
        const recent = await base44.asServiceRole.entities.Order.filter(dupFilter, '-created_date', 20);
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        const match = (recent || []).find((o) =>
          o.payment_provider === 'helcim'
          && new Date(o.created_date).getTime() >= tenMinutesAgo
          && (o.items?.length || 0) === items.length
          && round2(Number(o.total)) === chargeTotal
        );
        if (match) {
          console.log(`createHelcimWebCheckout: retry guard — reopening pending order ${match.order_number} instead of creating a second order`);
          let reuseUrl = match.payment_url && String(match.payment_url).includes('/pay?order_number=')
            ? match.payment_url
            : null;
          if (!reuseUrl) {
            reuseUrl = helcimPayPageUrl(PAY_PAGE_ORIGIN, match.order_number, true);
            await base44.asServiceRole.entities.Order.update(match.id, { payment_url: reuseUrl });
          }
          return Response.json({
            provider: 'helcim',
            orderNumber: match.order_number,
            payment_url: reuseUrl,
            total: round2(Number(match.total)),
            smsConsentStored: true,
            reused: true,
          });
        }
      }
    } catch (guardError) {
      console.error('createHelcimWebCheckout: retry-guard lookup failed — creating a new order as before:', (guardError as Error).message);
    }

    // ── Persist the Order BEFORE opening a payable page ──
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
        payment_provider: 'helcim',
        normalized_phone: customerLink.normalized_phone,
        customer_id: customerLink.customer_id,
        items: items.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url || '', selectedModifiers: i.selectedModifiers || [], catalog_object_id: i.catalog_object_id || '', square_item_id: i.square_item_id || '', isBuildShake: !!i.isBuildShake, deluxeLabel: i.deluxeLabel || '', deluxeToppings: i.deluxeToppings || [], allergyNote: i.allergyNote || '' })),
        subtotal: pricing.subtotal,
        tax: pricing.tax,
        delivery_fee: pricing.deliveryFee,
        tip: round2(pricing.tip || 0),
        // The free shake is recorded with the reward discount, exactly as the
        // reward path does — the same order-level discount the customer paid
        // against, and never an item or a changed item price. redemption_id stays
        // empty unless a Star Reward was actually redeemed.
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
      console.error('Order.create failed — no Helcim payment page created:', (dbError as Error).message);
      return Response.json({ error: 'Could not save your order. No charge was made — please try again.' }, { status: 500 });
    }

    // ── Attach our own secure page, keyed to this order ──
    const payPageUrl = helcimPayPageUrl(PAY_PAGE_ORIGIN, orderNumber, true);
    try {
      await base44.asServiceRole.entities.Order.update(order.id, {
        payment_provider: 'helcim',
        payment_url: payPageUrl,
        manual_pay_required: false,
      });
    } catch (linkErr) {
      // Nothing payable exists: remove the pending order rather than leaving it
      // stranded, and tell the customer. No charge was made.
      console.error(`Helcim pay page could not be attached to order ${orderNumber}:`, (linkErr as Error).message);
      try {
        await base44.asServiceRole.entities.Order.delete(order.id);
      } catch (cleanupErr) {
        console.error(`Failed to remove stranded pending order ${orderNumber}:`, (cleanupErr as Error).message);
      }
      return Response.json({
        error: 'We could not open the secure payment page, so nothing was charged. Please tap Continue to Payment again, or call us at (270) 563-4618.',
      }, { status: 503 });
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
      provider: 'helcim',
      orderNumber,
      payment_url: payPageUrl,
      total: chargeTotal,
      smsConsentStored,
    });
  } catch (error) {
    console.error('createHelcimWebCheckout error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}