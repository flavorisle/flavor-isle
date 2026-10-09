import { Resend } from 'npm:resend@3.2.0';
import { sendOrderStatusSms } from './sendOrderStatusSms.ts';
import { brandedEmailHtml, merchPromoHtml, foodHeroHtml, starsEarnedHtml, accountCtaHtml, isRegisteredUser } from './sendOrderEmails.ts';
import { accrueForOrder, redeemReward, toE164Phone } from './squareLoyalty.ts';
import { referralCodeForPhone } from './referral.ts';
import { sendPushToEmail } from './sendPush.ts';
import { checkSmsConsent, markSmsSent } from './smsConsent.ts';
import { getSmashieSettings } from './smashieSettings.ts';
import { formatItemModifiers } from './ticketFormat.ts';

// Log every attempt to push an order to Square POS so admins can see exactly
// why an order might fail to sync. Best-effort — never blocks fulfillment.
async function logSquareSyncAttempt(base44, order, status, squareOrderId = null, errorMessage = null) {
  try {
    await base44.asServiceRole.entities.SquareSyncLog.create({
      order_id: order.id,
      order_number: order.order_number,
      customer_name: order.customer_name,
      customer_email: order.customer_email,
      total: order.total,
      status,
      square_order_id: squareOrderId,
      error_message: errorMessage,
    });
  } catch (logErr) {
    console.error('Failed to log Square sync attempt:', logErr.message);
  }
}

// Shared order-fulfillment logic used by both the Stripe webhook and the
// client-side confirmOnlinePayment fallback. Centralizing it guarantees both
// paths push the order to Square POS, fire the kitchen printer, and send the
// customer/staff notifications identically — so orders reach the kitchen even
// when the Stripe webhook stops delivering events.

// Referral share block for the paid-order confirmation email (issue #83, Part
// A). Sits between the order summary and the closing lines. Only orders whose
// phone normalizes to E.164 get one — with no phone there is no code to share.
function referralBlockHtml(code: string) {
  return `<div style="background:#f5edd6;border-radius:12px;padding:22px 20px;margin:0 0 24px;text-align:center;">
    <img src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/b05945903_smashiehead.png" alt="Smashie" width="72" height="72" style="border-radius:50%;display:block;margin:0 auto 10px;object-fit:cover;border:2px solid #F5A623;" />
    <h3 style="color:#1A3A5C;font-family:'Oswald',Arial,sans-serif;font-size:19px;letter-spacing:1px;margin:0 0 8px;">SHARE THE ISLE, EARN 50 STARS</h3>
    <p style="color:#141414;font-size:15px;line-height:1.5;margin:0 0 16px;">Send your link to a friend. When they place their first order, 50 bonus Stars land in your Star Rewards account.</p>
    <a href="https://flavor-isle.com/?ref=${code}" style="display:inline-block;background:#C0392B;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:999px;font-family:'Oswald',Arial,sans-serif;font-size:15px;letter-spacing:1px;">SEND YOUR LINK</a>
  </div>`;
}

export async function sendOrderConfirmationEmail(base44, order, loyalty = null) {
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

  const hasAccount = await isRegisteredUser(base44, order.customer_email);

  const itemsHtml = (order.items || []).map(item => {
    const mods = formatItemModifiers(item);
    const modsHtml = mods.length > 0
      ? `<div style="font-size:13px;color:#888;padding-left:10px;line-height:1.5;padding-top:2px;">${mods.map(m => `<div>• ${m}</div>`).join('')}</div>`
      : '';
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0e8d0;vertical-align:top;">
        ${item.name}${(item.quantity || 1) > 1 ? ` x${item.quantity}` : ''}
        ${modsHtml}
      </td>
      <td style="padding:8px 0;border-bottom:1px solid #f0e8d0;text-align:right;vertical-align:top;">$${(item.price * (item.quantity || 1)).toFixed(2)}</td>
    </tr>`;
  }).join('');

  const orderTypeLabel = { pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-In' }[order.order_type] || order.order_type;
  const fulfillmentLine = order.order_type === 'delivery' && order.delivery_address
    ? `Delivery to ${order.delivery_address}`
    : order.order_type === 'dine_in' && order.table_number
      ? `Dine-In · Table ${order.table_number}`
      : orderTypeLabel;
  const estTime = order.estimated_time ? `${order.estimated_time} min` : '—';

  const referrerPhone = toE164Phone(order.customer_phone);
  const referralCode = referrerPhone ? await referralCodeForPhone(referrerPhone) : null;

  const html = brandedEmailHtml(`
        <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey fam,</p>
        <h2 style="color:#141414;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 4px;">${order.customer_name} — your order is locked in. 🎉</h2>
        <p style="color:#141414;font-size:17px;line-height:1.5;margin:6px 0 24px;">Everything's lined up just how you like it, and the crew's already firing up the grill. 🔥</p>

        <div style="background:#1A3A5C;color:white;border-radius:12px;padding:14px 20px;margin-bottom:24px;text-align:center;letter-spacing:3px;font-family:'Oswald',Arial,sans-serif;font-size:15px;font-weight:bold;">
          ORDER CONFIRMED · #${order.order_number || ''}
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px 0;border-bottom:2px solid #C0392B;color:#141414;font-size:13px;">ITEM</th>
              <th style="text-align:right;padding:8px 0;border-bottom:2px solid #C0392B;color:#141414;font-size:13px;">PRICE</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding:4px 0;color:#666;font-size:14px;">Subtotal</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.subtotal || 0).toFixed(2)}</td></tr>
          ${order.delivery_fee > 0 ? `<tr><td style="padding:4px 0;color:#666;font-size:14px;">Delivery Fee</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.delivery_fee || 0).toFixed(2)}</td></tr>` : ''}
          <tr><td style="padding:4px 0;color:#666;font-size:14px;">Tax</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.tax || 0).toFixed(2)}</td></tr>
          <tr><td style="padding:8px 0 0;color:#141414;font-size:16px;font-weight:bold;border-top:2px solid #f0e8d0;">Total</td><td style="text-align:right;padding:8px 0 0;color:#C0392B;font-size:18px;font-weight:bold;border-top:2px solid #f0e8d0;">$${(order.total || 0).toFixed(2)}</td></tr>
        </table>

        <div style="background:#f5edd6;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
          <p style="margin:0;font-size:14px;color:#1A3A5C;"><strong>Pickup/Delivery:</strong> ${fulfillmentLine}</p>
          ${order.pay_cash_on_pickup && order.payment_status !== 'paid' ? `<p style="margin:6px 0 0;font-size:14px;color:#1A3A5C;"><strong>Payment:</strong> Pay $${Number(order.total).toFixed(2)} in cash at the counter at pickup.</p>` : ''}
          <p style="margin:6px 0 0;font-size:14px;color:#1A3A5C;"><strong>Order Time:</strong> ~${estTime}</p>
          ${order.special_instructions ? `<p style="margin:6px 0 0;font-size:14px;color:#1A3A5C;"><strong>Notes:</strong> ${order.special_instructions}</p>` : ''}
        </div>

        ${referralCode ? referralBlockHtml(referralCode) : ''}

        <p style="color:#141414;font-size:17px;margin:0 0 10px;">You're all set — we'll hit you up the second it's ready. 🔔</p>
        <p style="color:#666;margin:0;font-size:14px;">— Smashie & The Flavor Isle Team 🍔</p>
        ${await foodHeroHtml(base44)}
        ${loyalty && loyalty.pointsEarned > 0 ? starsEarnedHtml(loyalty) : ''}
        ${hasAccount ? '' : accountCtaHtml()}
        ${await merchPromoHtml()}
  `);

  // Retry the Resend send up to 3 times so a transient API failure
  // doesn't silently drop the customer's order confirmation email.
  let sent = false;
  for (let attempt = 1; attempt <= 3 && !sent; attempt++) {
    try {
      const { error } = await resend.emails.send({
        from: 'Flavor Isle <smashie@flavor-isle.com>',
        to: order.customer_email,
        subject: `Order locked in — #${order.order_number} 🍔`,
        html,
      });
      if (error) {
        console.error(`Resend email error (attempt ${attempt}):`, error);
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
      } else {
        console.log(`Order confirmation email sent to ${order.customer_email} (attempt ${attempt})`);
        sent = true;
      }
    } catch (sendErr) {
      console.error(`Resend send exception (attempt ${attempt}):`, sendErr.message);
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
    }
  }
  return sent;
}

export async function sendAdminReceiptEmail(order) {
  const ADMIN_ALERT_EMAILS = ['wesleyrbooker1@gmail.com', 'ashleybooker29@gmail.com'];
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));

  const itemsHtml = (order.items || []).map(item => {
    const qty = item.quantity || 1;
    const mods = formatItemModifiers(item);
    const modLine = mods.map(m => `<div style="font-size:12px;color:#666;margin:2px 0 0;">+ ${m}</div>`).join('');
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0e8d0;">${item.name}${qty > 1 ? ` x${qty}` : ''}${modLine}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0e8d0;text-align:right;">$${(item.price * qty).toFixed(2)}</td>
    </tr>`;
  }).join('');

  const orderTypeLabel = { pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-In' }[order.order_type] || order.order_type;
  const fulfillmentLine = order.order_type === 'delivery' && order.delivery_address
    ? `Delivery to ${order.delivery_address}`
    : order.order_type === 'dine_in' && order.table_number
      ? `Dine-In · Table ${order.table_number}`
      : orderTypeLabel;
  const estTime = order.estimated_time ? `${order.estimated_time} min` : '—';
  const scheduled = order.scheduled_for ? new Date(order.scheduled_for).toLocaleString('en-US', { timeZone: 'America/Chicago', weekday: 'short', hour: 'numeric', minute: '2-digit' }) : 'ASAP';

  const html = brandedEmailHtml(`
        <h2 style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 4px;">🧾 New Online Order</h2>
        <p style="color:#141414;font-size:17px;line-height:1.5;margin:6px 0 20px;">${order.pay_cash_on_pickup ? 'A phone pickup order is confirmed. Collect $' + Number(order.total).toFixed(2) + ' in cash at pickup — NOT PAID yet.' : 'A web order just came in and was paid online.'}</p>

        <div style="background:#1A3A5C;color:white;border-radius:12px;padding:14px 20px;margin-bottom:20px;text-align:center;letter-spacing:3px;font-family:'Oswald',Arial,sans-serif;font-size:15px;font-weight:bold;">
          ORDER #${order.order_number || ''}
        </div>

        <table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
          <tr><td style="padding:3px 0;color:#666;font-size:14px;">Customer</td><td style="text-align:right;color:#141414;font-size:14px;">${order.customer_name || '—'}</td></tr>
          <tr><td style="padding:3px 0;color:#666;font-size:14px;">Email</td><td style="text-align:right;color:#141414;font-size:14px;">${order.customer_email || '—'}</td></tr>
          <tr><td style="padding:3px 0;color:#666;font-size:14px;">Phone</td><td style="text-align:right;color:#141414;font-size:14px;">${order.customer_phone || '—'}</td></tr>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px 0;border-bottom:2px solid #C0392B;color:#141414;font-size:13px;">ITEM</th>
              <th style="text-align:right;padding:8px 0;border-bottom:2px solid #C0392B;color:#141414;font-size:13px;">PRICE</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>

        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr><td style="padding:4px 0;color:#666;font-size:14px;">Subtotal</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.subtotal || 0).toFixed(2)}</td></tr>
          ${order.delivery_fee > 0 ? `<tr><td style="padding:4px 0;color:#666;font-size:14px;">Delivery Fee</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.delivery_fee || 0).toFixed(2)}</td></tr>` : ''}
          ${order.tip > 0 ? `<tr><td style="padding:4px 0;color:#666;font-size:14px;">Tip</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.tip || 0).toFixed(2)}</td></tr>` : ''}
          ${order.discount > 0 ? `<tr><td style="padding:4px 0;color:#666;font-size:14px;">Discount</td><td style="text-align:right;color:#666;font-size:14px;">−$${(order.discount || 0).toFixed(2)}</td></tr>` : ''}
          <tr><td style="padding:4px 0;color:#666;font-size:14px;">Tax</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.tax || 0).toFixed(2)}</td></tr>
          <tr><td style="padding:8px 0 0;color:#141414;font-size:16px;font-weight:bold;border-top:2px solid #f0e8d0;">Total Paid</td><td style="text-align:right;padding:8px 0 0;color:#C0392B;font-size:18px;font-weight:bold;border-top:2px solid #f0e8d0;">$${(order.total || 0).toFixed(2)}</td></tr>
        </table>

        <div style="background:#f5edd6;border-radius:12px;padding:16px 20px;margin-bottom:8px;">
          <p style="margin:0;font-size:14px;color:#1A3A5C;"><strong>Fulfillment:</strong> ${fulfillmentLine}</p>
          <p style="margin:6px 0 0;font-size:14px;color:#1A3A5C;"><strong>Ready:</strong> ${scheduled} (~${estTime})</p>
          ${order.special_instructions ? `<p style="margin:6px 0 0;font-size:14px;color:#1A3A5C;"><strong>Notes:</strong> ${order.special_instructions}</p>` : ''}
        </div>
  `);

  // Retry the Resend send up to 3 times so a transient API failure
  // doesn't silently drop the staff alert. Each recipient is tracked on its
  // own, so one address failing never blocks the other.
  let sent = false;
  for (const recipient of ADMIN_ALERT_EMAILS) {
    let delivered = false;
    for (let attempt = 1; attempt <= 3 && !delivered; attempt++) {
      try {
        const { error } = await resend.emails.send({
          from: 'Flavor Isle <smashie@flavor-isle.com>',
          to: recipient,
          subject: `🧾 New online order #${order.order_number || ''} — $${(order.total || 0).toFixed(2)}`,
          html,
        });
        if (error) {
          console.error(`Admin receipt email error for ${recipient} (attempt ${attempt}):`, error);
          if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
        } else {
          console.log(`Admin receipt sent to ${recipient} for order ${order.order_number} (attempt ${attempt})`);
          delivered = true;
        }
      } catch (sendErr) {
        console.error(`Admin receipt send exception for ${recipient} (attempt ${attempt}):`, sendErr.message);
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
      }
    }
    if (delivered) sent = true;
  }
  return sent;
}

// Loyalty: consume any applied legacy reward, then accrue Square Star Rewards
// points for the paid Square order into the customer's loyalty account.
async function processLoyalty(base44, order, squareOrderId) {
  let loyaltyResult = null;
  try {
    if (order.redemption_id) {
      try {
        await redeemReward({
          email: order.customer_email,
          phone: order.customer_phone,
          rewardTierId: order.redemption_id,
          idempotencyKey: `${order.id}:${order.redemption_id}`,
        });
        console.log(`Reward tier ${order.redemption_id} redeemed for order ${order.order_number}`);
      } catch (redeemErr) {
        console.error('Square loyalty redemption failed:', redeemErr.message);
      }
    }

    if (!squareOrderId || !order.customer_email) return null;

    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    let accrued = false;
    for (let attempt = 1; attempt <= 3 && !accrued; attempt++) {
      try {
        if (attempt > 1) await sleep(3000);
        loyaltyResult = await accrueForOrder({ squareOrderId, email: order.customer_email, phone: order.customer_phone, enroll: order.loyalty_opt_in === true, directWebOrderId: order.direct_web_rewards_v2 === true ? order.id : undefined });
        accrued = true;
        console.log(`Square Star Rewards points accrued for order ${order.order_number} (attempt ${attempt})`);
      } catch (accrueErr) {
        console.error(`Loyalty accrual attempt ${attempt} failed for order ${order.order_number}:`, accrueErr.message);
      }
    }

    if (accrued) {
      try {
        await base44.asServiceRole.entities.Order.update(order.id, { loyalty_accrued: true });
      } catch (markErr) {
        console.error('Failed to mark loyalty_accrued:', markErr.message);
      }
    }
  } catch (err) {
    console.error('Square loyalty accrual failed:', err.message);
  }
  return loyaltyResult;
}

// Route a newly paid order to Square POS so staff can track and update its
// status, persist the returned Square order id, alert the kitchen printer,
// and email/text/push the customer. Shared by the Stripe webhook and the
// client-side confirmOnlinePayment fallback.
// Staff alert email with independent atomic dedupe. Uses staff_alert_sent_at
// as a claim field — only one concurrent call can set it (via updateMany with
// a null-condition). On send failure, the claim is released so a retry can send.
async function sendStaffAlertWithDedupe(base44, order) {
  try {
    const claim = await base44.asServiceRole.entities.Order.updateMany(
      { id: order.id, staff_alert_sent_at: null },
      { $set: { staff_alert_sent_at: new Date().toISOString() } }
    );
    if (!claim || claim.updated === 0) {
      console.log(`Order ${order.order_number} staff alert already sent — skipping`);
      return;
    }
  } catch (claimErr) {
    console.warn('Staff alert claim failed, proceeding:', claimErr.message);
  }

  let sent = false;
  try {
    sent = await sendAdminReceiptEmail(order);
  } catch (err) {
    console.error('Staff alert email failed:', err.message);
  }

  if (!sent) {
    try {
      await base44.asServiceRole.entities.Order.updateMany(
        { id: order.id, staff_alert_sent_at: { $ne: null } },
        { $unset: { staff_alert_sent_at: "" } }
      );
    } catch (releaseErr) {
      console.warn('Failed to release staff alert claim:', releaseErr.message);
    }
  }
}

// Customer confirmation email with independent atomic dedupe. Uses
// confirmation_email_sent_at as a claim field — only one concurrent call
// can set it. On send failure, the claim is released so a retry can send.
async function sendConfirmationWithDedupe(base44, order, loyalty) {
  try {
    const claim = await base44.asServiceRole.entities.Order.updateMany(
      { id: order.id, confirmation_email_sent_at: null },
      { $set: { confirmation_email_sent_at: new Date().toISOString() } }
    );
    if (!claim || claim.updated === 0) {
      console.log(`Order ${order.order_number} confirmation email already sent — skipping`);
      return;
    }
  } catch (claimErr) {
    console.warn('Confirmation email claim failed, proceeding:', claimErr.message);
  }

  let sent = false;
  try {
    sent = await sendOrderConfirmationEmail(base44, order, loyalty);
  } catch (err) {
    console.error('Order confirmation email failed:', err.message);
  }

  if (!sent) {
    try {
      await base44.asServiceRole.entities.Order.updateMany(
        { id: order.id, confirmation_email_sent_at: { $ne: null } },
        { $unset: { confirmation_email_sent_at: "" } }
      );
    } catch (releaseErr) {
      console.warn('Failed to release confirmation email claim:', releaseErr.message);
    }
  }
}

export async function pushOrderToSquareAndKitchen(base44, order) {
  // Per-action idempotency: the Square push, staff alert email, and customer
  // confirmation email each have their OWN dedupe guard. This ensures:
  //   - one Square push (via createSquareOrder atomic claim + square_order_id)
  //   - one staff alert email (via staff_alert_sent_at)
  //   - one customer confirmation email (via confirmation_email_sent_at)
  // A skipped Square push (already handled by a concurrent call) does NOT
  // suppress the emails — each fires independently exactly once.

  // --- Square push dedupe ---
  // Re-read the freshest order state. If square_order_id is already set or
  // another call has a recent claim, skip the Square push — but DON'T return
  // early. The emails below have their own dedupe and must still run.
  let skipSquarePush = false;
  try {
    const latest = await base44.asServiceRole.entities.Order.get(order.id);
    if (latest?.square_order_id) {
      console.log(`Order ${order.order_number} already pushed to Square (${latest.square_order_id}) — skipping Square push, continuing to emails`);
      skipSquarePush = true;
    } else if (latest?.square_sync_claimed_at) {
      const claimAge = Date.now() - new Date(latest.square_sync_claimed_at).getTime();
      if (claimAge < 5 * 60 * 1000) {
        console.log(`Order ${order.order_number} is being synced by another call (claimed ${Math.round(claimAge / 1000)}s ago) — skipping Square push, continuing to emails`);
        skipSquarePush = true;
      } else {
        console.log(`Order ${order.order_number} has stale sync claim (${Math.round(claimAge / 1000)}s old) — proceeding with retry`);
      }
    }
  } catch (checkErr) {
    console.warn('Idempotency re-read failed, proceeding:', checkErr.message);
  }

  let squareOrderId = null;
  let squareError = null;
  let squarePushed = false;

  if (!skipSquarePush) {
    try {
      const squareRes = await base44.functions.invoke('createSquareOrder', {
        items: order.items || [],
        orderType: order.order_type || 'pickup',
        pickupMethod: order.pickup_method || '',
        vehicle: order.arrival_details || null,
        orderNumber: order.order_number,
        orderId: order.id,
        customer: {
          name: order.customer_name,
          phone: order.customer_phone,
          email: order.customer_email,
          address: order.delivery_address,
        },
        instructions: order.special_instructions || '',
        total: order.total,
        tax: order.tax || 0,
        deliveryFee: order.delivery_fee || 0,
        tip: order.tip || 0,
        discount: order.discount || 0,
        happyHourDiscount: order.happy_hour_discount || 0,
        bundleDiscount: order.bundle_discount || 0,
      });
      squareOrderId = squareRes?.data?.order_id || squareRes?.order_id;
      const alreadySynced = squareRes?.data?.already_synced || squareRes?.already_synced;

      if (alreadySynced) {
        // Another trigger already pushed this order to Square. Skip the
        // Square push + kitchen print + SMS + push + loyalty (those are tied
        // to the push), but DON'T skip the emails — they have their own
        // independent dedupe and must fire exactly once.
        console.log(`Order ${order.order_number} was already synced by a concurrent call — skipping Square push, continuing to emails`);
      } else if (squareOrderId) {
        try {
          const latest = await base44.asServiceRole.entities.Order.get(order.id);
          if (!latest?.square_order_id) {
            await base44.asServiceRole.entities.Order.update(order.id, { square_order_id: squareOrderId });
          }
        } catch (e) {
          console.warn('Redundant square_order_id update failed:', e.message);
        }
        squarePushed = true;
        console.log(`Order ${order.order_number} sent to Square (id ${squareOrderId})`);
      } else {
        squareError = squareRes?.data?.error || squareRes?.error || 'No order_id returned from Square';
        console.error(`Order ${order.order_number} — Square returned no order_id:`, squareError);
      }
    } catch (squareErr) {
      squareError = squareErr.message;
      console.error('Failed to send order to Square:', squareErr.message);
    }
  }

  await logSquareSyncAttempt(base44, order, squarePushed ? 'success' : 'skipped', squareOrderId, squarePushed ? null : (skipSquarePush ? 'Already pushed — emails continue' : squareError));

  // Staff alert email — INDEPENDENT dedupe via staff_alert_sent_at.
  // Fires exactly once regardless of whether this call did the Square push.
  await sendStaffAlertWithDedupe(base44, order);

  // SMS — only for new pushes (tied to the Square push). Gated by BOTH the
  // SmashieSettings sms_status_updates_enabled toggle AND explicit
  // transactional consent (checkSmsConsent), fail-closed: no proof, STOP'd,
  // invalid number, or toggle disabled → no SMS. A suppressed or failed SMS
  // never blocks the checkout order flow (errors are caught + logged).
  if (squarePushed) {
    try {
      await sendOrderStatusSms(base44, order, 'confirmed');
    } catch (smsErr) {
      console.error(`Order ${order.order_number} confirmed SMS log failed:`, smsErr.message);
    }
  }

  // Push notification — only for new pushes (tied to the Square push)
  if (squarePushed && order.customer_email) {
    try {
      await sendPushToEmail(base44, order.customer_email, {
        title: '🍔 Order locked in!',
        body: `Hey ${order.customer_name || 'fam'}, order #${order.order_number || ''} is confirmed — the crew's firing up the grill. We'll ping you as it moves along!`,
        url: '/order-status',
        tag: `order-${order.id}`,
      });
    } catch (pushErr) {
      console.warn('Confirmed push failed:', pushErr.message);
    }
  }

  // Loyalty — only for new pushes (tied to the Square push)
  const loyalty = squarePushed && (!order.pay_cash_on_pickup || order.payment_status === 'paid') ? await processLoyalty(base44, order, squareOrderId) : null;

  // Customer confirmation email — INDEPENDENT dedupe via confirmation_email_sent_at.
  // Fires exactly once regardless of whether this call did the Square push.
  if (order.customer_email && order.customer_email !== 'phone-order@flavorisle.com') {
    await sendConfirmationWithDedupe(base44, order, loyalty);
  }
}