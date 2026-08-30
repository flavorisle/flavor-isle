import { Resend } from 'npm:resend@3.2.0';
import { getLiveBusyness } from './liveBusyness.ts';

const LOGO_URL = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';

// Public app URL used for in-email call-to-action links (reviews, merch) —
// always the branded custom domain, never the base44.app address.
const APP_URL = 'https://crave.flavor-isle.com';

// Build a click-tracked link. Routes the email CTA through the trackEmailClick
// endpoint so each click is counted, then redirects to `path`. `linkId` labels
// the link in the EmailClick stats; `orderId` ties order-specific links (review
// requests) back to the order they came from.
function trackedLink(path: string, linkId: string, orderId?: string) {
  const to = encodeURIComponent(path);
  let url = `${APP_URL}/functions/trackEmailClick?link=${linkId}&to=${to}`;
  if (orderId) url += `&order_id=${encodeURIComponent(orderId)}`;
  return url;
}

// Tasty Threads merch promo block — appended to order emails to drive merch sales.
export function merchPromoHtml() {
  return `
  <div style="margin:24px 0 8px;border:2px dashed #C0392B;border-radius:14px;padding:20px;background:#FFF8E7;">
    <p style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:18px;margin:0 0 6px;letter-spacing:2px;">🛍️ TASTY THREADS — NOW SHIPPING</p>
    <p style="color:#141414;font-size:14px;margin:0 0 14px;line-height:1.5;">Rock the Flavor Isle look. Tees, hoodies & more — printed fresh and shipped straight to your door.</p>
    <a href="${trackedLink('/merch', 'merch_promo')}" style="display:inline-block;background:#C0392B;color:#fff;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:10px 22px;border-radius:999px;font-size:13px;">SHOP THE COLLECTION →</a>
  </div>`;
}

// Review CTA block — appended to the thank-you email to collect ratings.
export function reviewCtaHtml(orderId?: string) {
  const dest = orderId ? `/feedback?order=${orderId}` : '/feedback';
  const url = trackedLink(dest, 'review_request', orderId);
  return `
  <div style="margin:24px 0 8px;border-radius:14px;padding:20px;background:#1A3A5C;color:#fff;">
    <p style="font-family:'Oswald',Arial,sans-serif;font-size:18px;margin:0 0 6px;letter-spacing:2px;">⭐ HOW'D WE DO?</p>
    <p style="margin:0 0 14px;font-size:14px;color:rgba(255,255,255,0.85);line-height:1.5;">Loved your order? Drop a quick review and help your neighbors find their next favorite meal.</p>
    <a href="${url}" style="display:inline-block;background:#F5A623;color:#1A3A5C;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:10px 22px;border-radius:999px;font-size:13px;font-weight:bold;">LEAVE A REVIEW →</a>
  </div>`;
}

// "What to expect" block — links to the live busyness guide so customers
// waiting on their order can see the current kitchen level and wait times.
export function whatToExpectHtml() {
  return `
  <div style="margin:18px 0 8px;border-radius:14px;padding:18px 20px;background:#EAF1F8;border:1px solid #C9D8E8;">
    <p style="color:#1A3A5C;font-family:'Oswald',Arial,sans-serif;font-size:16px;margin:0 0 6px;letter-spacing:2px;">⏱ WHAT TO EXPECT WHILE YOU WAIT</p>
    <p style="color:#141414;font-size:14px;margin:0 0 12px;line-height:1.5;">Curious how busy we are? Check our live kitchen status — it breaks down each level and the wait to expect.</p>
    <a href="${trackedLink('/what-to-expect', 'what_to_expect')}" style="display:inline-block;background:#1A3A5C;color:#fff;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:10px 22px;border-radius:999px;font-size:13px;">SEE LIVE STATUS →</a>
  </div>`;
}

// "Create your account" block — shown on order emails to guests who ordered
// without signing in. Sells the benefits and links to registration.
export function accountCtaHtml() {
  return `
  <div style="margin:24px 0 8px;border:2px solid #1A3A5C;border-radius:14px;padding:20px;background:#EAF1F8;">
    <p style="color:#1A3A5C;font-family:'Oswald',Arial,sans-serif;font-size:18px;margin:0 0 6px;letter-spacing:2px;">CREATE YOUR FLAVOR ISLE ACCOUNT</p>
    <p style="color:#141414;font-size:14px;margin:0 0 12px;line-height:1.5;">You ordered as a guest — make it official for a faster, smoother next time:</p>
    <ul style="color:#141414;font-size:14px;line-height:1.7;margin:0 0 14px;padding-left:20px;">
      <li>⚡ One-tap reorder of your favorites</li>
      <li>📦 Full order history & live order tracking</li>
      <li>⭐ Track your Star Rewards balance & unlock free food</li>
      <li>💾 Saved addresses & info for checkout in seconds</li>
    </ul>
    <a href="${trackedLink('/register', 'account_cta')}" style="display:inline-block;background:#1A3A5C;color:#fff;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:10px 22px;border-radius:999px;font-size:13px;">CREATE MY ACCOUNT →</a>
  </div>`;
}

// Star Rewards block — shown when a guest order enrolled the customer in Star
// Rewards (or earned stars). `newlyEnrolled` triggers the welcome-bonus line;
// `balance` is their current star balance.
export function rewardsEnrolledHtml({ newlyEnrolled, balance }: { newlyEnrolled?: boolean; balance?: number } = {}) {
  const welcomeLine = newlyEnrolled
    ? `Welcome to Flavor Isle Star Rewards! We dropped a <strong>40-star welcome bonus</strong> into your account to get you started. `
    : '';
  return `
  <div style="margin:24px 0 8px;border-radius:14px;padding:20px;background:#FFF8E7;border:2px dashed #F5A623;">
    <p style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:18px;margin:0 0 6px;letter-spacing:2px;">⭐ YOU'RE EARNING STAR REWARDS</p>
    <p style="color:#141414;font-size:14px;margin:0 0 12px;line-height:1.5;">${welcomeLine}You just earned stars on this order — <strong>earn 4 stars for every $10 spent</strong>. Rack 'em up and trade them in for free food:</p>
    <ul style="color:#141414;font-size:13px;line-height:1.7;margin:0 0 12px;padding-left:20px;">
      <li><strong>10 stars</strong> — Free cup of sauce</li>
      <li><strong>25 stars</strong> — Free Sundae or Fry of choice</li>
      <li><strong>40 stars</strong> — 10% off (up to $5)</li>
      <li><strong>50 stars</strong> — Free Cravewave or 14 oz Milkshake</li>
      <li><strong>70 stars</strong> — 10% off, no max</li>
    </ul>
    <p style="color:#141414;font-size:14px;margin:0 0 14px;">Current balance: <strong>${balance ?? 0} stars</strong>. Track your stars and rewards any time in your Flavor Isle account.</p>
    <a href="${trackedLink('/rewards', 'rewards_track')}" style="display:inline-block;background:#F5A623;color:#1A3A5C;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:10px 22px;border-radius:999px;font-size:13px;font-weight:bold;">SEE MY REWARDS →</a>
  </div>`;
}

// Branded email shell matching the website: centered logo, cherry header,
// cream body, navy footer, Oswald headings / Open Sans body.
export function brandedEmailHtml(bodyHtml) {
  return `
  <div style="background:#F5EDD6;padding:24px 12px;font-family:'Open Sans',Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#FFFDF8;border-radius:16px;overflow:hidden;">
      <div style="background:#C0392B;padding:28px 24px;text-align:center;">
        <img src="${LOGO_URL}" alt="Flavor Isle" width="84" height="84" style="border-radius:50%;display:block;margin:0 auto 12px;" />
        <h1 style="color:#ffffff;font-family:'Oswald',Arial,sans-serif;margin:0;font-size:26px;letter-spacing:3px;">FLAVOR ISLE</h1>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:12px;letter-spacing:2px;">SMITHS GROVE, KY</p>
      </div>
      <div style="padding:28px 24px;color:#141414;font-size:16px;line-height:1.6;">${bodyHtml}</div>
      <div style="background:#1A3A5C;padding:18px 24px;text-align:center;">
        <p style="color:#ffffff;margin:0;font-size:14px;">Questions? Call <a href="tel:+12705634618" style="color:#F5EDD6;">(270) 563-4618</a></p>
        <p style="color:rgba(255,255,255,0.7);margin:6px 0 0;font-size:12px;">103 N Main St, Smiths Grove, KY 42171</p>
      </div>
    </div>
    <p style="text-align:center;color:#999;font-size:12px;margin:14px 0 0;">© 1964–2026 Flavor Isle. All rights reserved.</p>
  </div>`;
}

// Send a customer status-update email through Resend directly.
//
// Guests placing web orders are NOT registered app users, so the built-in
// SendEmail integration (which only reaches registered users) silently drops
// their messages. Reach them here via Resend instead.
export async function sendOrderStatusEmail(to, subject, body, fromName = 'Flavor Isle') {
  if (!to) return false;
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  try {
    const { error } = await resend.emails.send({
      from: `${fromName} <smashie@order.flavor-isle.com>`,
      to,
      subject,
      html: brandedEmailHtml(body.replace(/\n/g, '<br>')),
    });
    if (error) {
      console.error('sendOrderStatusEmail error:', error);
      return false;
    }
    console.log(`Status email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error('sendOrderStatusEmail exception:', err.message);
    return false;
  }
}

// Order-ready email — order status and fulfillment details. Reaches guest
// emails via Resend (built-in SendEmail only delivers to registered app users).
export async function sendOrderReadyEmail(order) {
  if (!order.customer_email) return false;
  const orderNum = order.order_number || (order.id ? order.id.slice(-6).toUpperCase() : '');
  const customerName = order.customer_name || 'friend';
  const orderType = order.order_type;
  const items = (order.items || [])
    .map(i => `${i.name || 'Item'}${(i.quantity || 1) > 1 ? ` x${i.quantity}` : ''}`)
    .join(', ');
  const totalStr = `$${(order.total || 0).toFixed(2)}`;
  const locationLine = orderType === 'delivery'
    ? `Delivery to: ${order.delivery_address || 'on file'}`
    : orderType === 'dine_in'
    ? `Table: ${order.table_number || 'N/A'} — Flavor Isle`
    : `Pickup Location: Flavor Isle — Smiths Grove, KY`;
  const headline = orderType === 'delivery'
    ? `Your order is ready and on its way! 🚗`
    : orderType === 'dine_in'
    ? `Your order is ready — head to your table! 🪑`
    : `Your order is ready for pickup! ✅`;
  const closingLine = orderType === 'delivery'
    ? `It's rolling your way right now — enjoy! 🚗`
    : orderType === 'dine_in'
    ? `It's headed to your table — dig in! 🍔`
    : `Pull up whenever you're ready — we'll have it hot and waiting.`;

  const body = `
    <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey ${customerName},</p>
    <h2 style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 8px;">${headline}</h2>
    <div style="background:#1A3A5C;color:#ffffff;border-radius:12px;padding:12px 18px;margin:14px 0;letter-spacing:3px;font-family:'Oswald',Arial,sans-serif;font-size:14px;font-weight:bold;text-align:center;">ORDER READY · #${orderNum}</div>
    <p style="color:#141414;font-size:15px;margin:0 0 4px;"><strong>Items:</strong> ${items || '—'}</p>
    <p style="color:#141414;font-size:15px;margin:0 0 4px;"><strong>Total:</strong> ${totalStr}</p>
    <p style="color:#141414;font-size:15px;margin:0 0 14px;"><strong>${locationLine}</strong></p>
    <p style="color:#141414;font-size:16px;margin:0 0 6px;">${closingLine}</p>
    <p style="color:#666;margin:0 0 4px;font-size:14px;">— Smashie & The Flavor Isle Team 🍔</p>
    ${merchPromoHtml()}`;

  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const { error } = await resend.emails.send({
      from: 'Flavor Isle <smashie@order.flavor-isle.com>',
      to: order.customer_email,
      subject: `✅ Order #${orderNum} is ready!`,
      html: brandedEmailHtml(body),
    });
    if (error) {
      console.error('sendOrderReadyEmail error:', error);
      return false;
    }
    console.log(`Order ready email sent to ${order.customer_email} for order ${orderNum}`);
    return true;
  } catch (err) {
    console.error('sendOrderReadyEmail exception:', err.message);
    return false;
  }
}

// Low-level branded sender shared by the preparing + completed emails.
async function sendBrandedHtml(to: string, subject: string, bodyHtml: string, fromName = 'Flavor Isle') {
  if (!to) return false;
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  try {
    const { error } = await resend.emails.send({
      from: `${fromName} <smashie@order.flavor-isle.com>`,
      to,
      subject,
      html: brandedEmailHtml(bodyHtml),
    });
    if (error) {
      console.error(`sendBrandedHtml error:`, error);
      return false;
    }
    console.log(`Branded email sent to ${to}: ${subject}`);
    return true;
  } catch (err) {
    console.error('sendBrandedHtml exception:', err.message);
    return false;
  }
}

// "On the grill" email — sent when the order hits the kitchen. Includes the
// live kitchen wait (same number the site shows) and a Tasty Threads merch
// promo to cross-sell while the customer waits. `base44` is optional but
// recommended — when passed, the email quotes the current dynamic wait.
export async function sendOrderPreparingEmail(order: any, base44?: any) {
  if (!order.customer_email) return false;
  const orderNum = order.order_number || (order.id ? order.id.slice(-6).toUpperCase() : '');
  const customerName = order.customer_name || 'friend';

  // Pull the same live wait the site/status bar show. Falls back to a soft
  // message if the busyness lookup fails so the email still sends.
  let waitLine = "We'll hit you up the second it's ready.";
  try {
    if (base44) {
      const live = await getLiveBusyness(base44);
      if (!live.isClosed && live.estimated_wait_min > 0) {
        waitLine = `The kitchen is <strong>${live.busyness_level}</strong> right now — expect about <strong>~${live.estimated_wait_min} min</strong> until it's ready.`;
      }
    }
  } catch (e) {
    console.error('sendOrderPreparingEmail live wait lookup failed:', e.message);
  }

  const body = `
    <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey ${customerName},</p>
    <h2 style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 8px;">🍔 Order #${orderNum} is on the grill</h2>
    <p style="color:#141414;font-size:16px;margin:0 0 6px;">Order #${orderNum} just hit the kitchen — the crew's cooking it up fresh right now. 🔥</p>
    <p style="color:#141414;font-size:16px;margin:0 0 6px;">${waitLine}</p>
    <p style="color:#666;margin:0 0 4px;font-size:14px;">— Smashie & The Flavor Isle Team 🍔</p>
    ${whatToExpectHtml()}
    ${merchPromoHtml()}`;
  return sendBrandedHtml(order.customer_email, `🍔 Order #${orderNum} is on the grill`, body);
}

// Thank-you email — sent when the order is completed. Asks for a review and
// promotes the merch line.
export async function sendOrderCompletedEmail(order: any) {
  if (!order.customer_email) return false;
  const orderNum = order.order_number || (order.id ? order.id.slice(-6).toUpperCase() : '');
  const customerName = order.customer_name || 'friend';
  const body = `
    <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey ${customerName},</p>
    <h2 style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 8px;">Thanks for rolling with us! 🙌</h2>
    <p style="color:#141414;font-size:16px;margin:0 0 6px;">Order #${orderNum} is all wrapped. Hope you ate good — that's what we're here for. 🍔</p>
    <p style="color:#666;margin:0 0 4px;font-size:14px;">We'd love to see you back soon, fam.</p>
    <p style="color:#666;margin:0 0 4px;font-size:14px;">— Smashie & The Flavor Isle Team</p>
    ${reviewCtaHtml(order.id)}
    ${merchPromoHtml()}`;
  return sendBrandedHtml(order.customer_email, `Thanks for rolling with us! 🙌`, body);
}