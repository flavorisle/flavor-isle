import { Resend } from 'npm:resend@3.2.0';
import { getLiveBusyness } from './liveBusyness.ts';
import { fetchStoreProducts } from './printful.ts';
import { excludeMaltSundae, fanFavoriteSort, dailyRotate } from './dessertPriority.ts';
import { formatItemModifiers } from './ticketFormat.ts';
import { GOOGLE_REVIEW_URL } from './googleReviewUrl.ts';

const LOGO_URL = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';

// Public app URL used for in-email call-to-action links (reviews, merch) —
// always the branded custom domain, never the base44.app address.
const APP_URL = 'https://flavor-isle.com';

// Backend function endpoints are NOT reachable through the custom domain
// (they return "unauthorized" there). Email clients must hit the base44.app
// function URL; the function then 302-redirects to the custom domain.
const FUNCTION_BASE = 'https://flavor-isle.com';

// Build a click-tracked link. Routes the email CTA through the trackEmailClick
// endpoint so each click is counted, then redirects to `path`. `linkId` labels
// the link in the EmailClick stats; `orderId` ties order-specific links (review
// requests) back to the order they came from.
export function trackedLink(path: string, linkId: string, orderId?: string) {
  const to = encodeURIComponent(path);
  let url = `${FUNCTION_BASE}/functions/trackEmailClick?link=${linkId}&to=${to}`;
  if (orderId) url += `&order_id=${encodeURIComponent(orderId)}`;
  return url;
}

// Tasty Threads merch promo block — appended to order emails to drive merch sales.
// Pulls two random products live from Printful so each email shows fresh gear
// with real product photos. Falls back to a generic text CTA if the catalog
// can't be reached so the email still sends.
export async function merchPromoHtml() {
  let productCards = '';
  try {
    const all = await fetchStoreProducts();
    if (Array.isArray(all) && all.length > 0) {
      // Fisher–Yates shuffle, then take 2.
      const pool = [...all];
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const picks = pool.slice(0, 2);
      productCards = `<table style="width:100%;border-collapse:separate;border-spacing:8px 0;margin:0 0 14px;"><tr>${
        picks.map(p => {
          const img = p.thumbnail_url || (p.images && p.images[0]) || '';
          const price = p.fromPrice ? `<div style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:14px;font-weight:bold;margin-top:6px;">from $${Number(p.fromPrice).toFixed(2)}</div>` : '';
          const imgHtml = img
            ? `<img src="${img}" alt="${(p.name || '').replace(/"/g, '&quot;')}" width="100%" style="width:100%;border-radius:10px;display:block;object-fit:cover;aspect-ratio:1/1;background:#f5edd6;" />`
            : `<div style="width:100%;aspect-ratio:1/1;border-radius:10px;background:#f5edd6;"></div>`;
          return `<td style="width:50%;vertical-align:top;">
            <a href="${trackedLink(`/merch?product=${p.id}`, 'merch_promo_product')}" style="text-decoration:none;color:#141414;display:block;">
              ${imgHtml}
              <div style="font-family:'Oswald',Arial,sans-serif;font-size:14px;line-height:1.3;margin-top:8px;color:#141414;">${p.name || 'Tasty Threads'}</div>
              ${price}
            </a>
          </td>`;
        }).join('')
      }</tr></table>`;
    }
  } catch (err) {
    console.error('merchPromoHtml product fetch failed:', err.message);
  }

  const headline = productCards
    ? '🛍️ TASTY THREADS — FRESH PICKS FOR YOU'
    : '🛍️ TASTY THREADS — NOW SHIPPING';
  const subline = productCards
    ? 'Two fresh picks, printed to order and shipped straight to your door. Tap a shirt to shop.'
    : 'Rock the Flavor Isle look. Tees, hoodies & more — printed fresh and shipped straight to your door.';

  return `
  <div style="margin:24px 0 8px;border:2px dashed #C0392B;border-radius:14px;padding:20px;background:#FFF8E7;">
    <p style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:18px;margin:0 0 6px;letter-spacing:2px;">${headline}</p>
    <p style="color:#141414;font-size:14px;margin:0 0 14px;line-height:1.5;">${subline}</p>
    <img src="https://files.cdn.printful.com/files/196/1969f01ea3bcd65b3ee5d20ee0897ca5_preview.png" alt="Tasty Threads tee" width="500" style="width:100%;max-width:500px;border-radius:10px;display:block;margin:0 0 14px;object-fit:cover;aspect-ratio:4/3;background:#f5edd6;" />
    ${productCards}
    <a href="${trackedLink('/merch', 'merch_promo')}" style="display:inline-block;background:#C0392B;color:#fff;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:10px 22px;border-radius:999px;font-size:13px;">SHOP THE COLLECTION →</a>
  </div>`;
}

// Food hero photo — pulls a random fan-favorite menu item with a real photo
// and renders it as a hero image block with a "try this next time" CTA.
// Uses only real Flavor Isle menu photography (MenuItem.image_url).
export async function foodHeroHtml(base44?: any) {
  if (!base44) return '';
  try {
    const items = await base44.asServiceRole.entities.MenuItem.list('-updated_date', 100);
    const withPhotos = (items || []).filter(m =>
      m.is_available !== false &&
      m.is_hidden !== true &&
      m.image_url &&
      !/pulled\s*pork|loaded\s*bbq\s*waffle|waffle\s*fries\s*with\s*jalape/i.test(m.name || '') &&
      (m.is_fan_favorite || m.is_featured)
    );
    const allowed = excludeMaltSundae(withPhotos);
    if (allowed.length === 0) return '';
    // Exclude malts/sundaes; sort by fan-favorite rank; rotate by Chicago day
    // so the "try this next time" hero varies across days.
    allowed.sort(fanFavoriteSort);
    const pick = dailyRotate(allowed)[0];
    const price = typeof pick.price === 'number' ? `$${pick.price.toFixed(2)}` : '';
    const photo = pick.image_url_opt || pick.image_url;
    const link = trackedLink('/menu', 'food_hero');
    return `
    <a href="${link}" style="text-decoration:none;color:#141414;display:block;margin:20px 0 8px;">
      <img src="${photo}" alt="${(pick.name || '').replace(/"/g, '&quot;')}" width="500" style="width:100%;max-width:500px;border-radius:14px;display:block;object-fit:cover;aspect-ratio:4/3;background:#f5edd6;" />
      <div style="padding:12px 4px 0;">
        <div style="font-family:'Oswald',Arial,sans-serif;font-size:20px;color:#C0392B;letter-spacing:1px;">${pick.name || 'Flavor Isle Favorite'}</div>
        ${price ? `<div style="font-family:'Oswald',Arial,sans-serif;font-size:16px;color:#141414;margin-top:2px;">${price}</div>` : ''}
        <p style="font-size:14px;color:#666;margin:6px 0 0;">Loved by the regulars — try it next time you order.</p>
      </div>
    </a>`;
  } catch (err) {
    console.error('foodHeroHtml failed:', err.message);
    return '';
  }
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

// True when this email address already belongs to a registered app user, so
// order emails can skip the "create your account" pitch. On lookup failure we
// return true — better to omit the block than nag an existing customer.
export async function isRegisteredUser(base44: any, email?: string) {
  if (!email) return false;
  try {
    const users = await base44.asServiceRole.entities.User.filter({ email });
    return (users || []).length > 0;
  } catch (err) {
    console.error('isRegisteredUser lookup failed:', err.message);
    return true;
  }
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

// Stars-earned block — shown on order confirmation emails with the exact
// number of stars the order earned and a link to the rewards page.
export function starsEarnedHtml({ pointsEarned, balance, newlyEnrolled }: { pointsEarned: number; balance?: number; newlyEnrolled?: boolean }) {
  const welcomeLine = newlyEnrolled
    ? ` Plus a <strong>40-star welcome bonus</strong> for joining Star Rewards!`
    : '';
  const balanceLine = typeof balance === 'number'
    ? `<p style="color:#141414;font-size:14px;margin:0 0 14px;">Your balance is now <strong>${balance} stars</strong>.</p>`
    : '';
  return `
  <div style="margin:24px 0 8px;border-radius:14px;padding:20px;background:#FFF8E7;border:2px dashed #F5A623;">
    <p style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:18px;margin:0 0 6px;letter-spacing:2px;">⭐ YOU EARNED ${pointsEarned} STAR${pointsEarned === 1 ? '' : 'S'}!</p>
    <p style="color:#141414;font-size:14px;margin:0 0 12px;line-height:1.5;">This order just added <strong>${pointsEarned} star${pointsEarned === 1 ? '' : 's'}</strong> to your Star Rewards.${welcomeLine} Rack 'em up and trade them in for free food.</p>
    ${balanceLine}
    <a href="${trackedLink('/rewards', 'stars_earned')}" style="display:inline-block;background:#F5A623;color:#1A3A5C;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:10px 22px;border-radius:999px;font-size:13px;font-weight:bold;">SEE MY REWARDS →</a>
  </div>`;
}

// Branded email shell matching the website: centered logo, cherry header,
// cream body, navy footer, Oswald headings / Open Sans body.
export function brandedEmailHtml(bodyHtml) {
  return `
  <div style="background:#F5EDD6;padding:24px 12px;font-family:'Open Sans',Arial,sans-serif;">
    <div style="max-width:600px;margin:0 auto;background:#FFFDF8;border-radius:16px;overflow:hidden;">
      <div style="background:#C0392B;padding:28px 24px;text-align:center;">
        <img src="${LOGO_URL}" alt="Flavor Isle" width="84" height="84" style="border-radius:12px;display:block;margin:0 auto 12px;object-fit:contain;" />
        <h1 style="color:#ffffff;font-family:'Oswald',Arial,sans-serif;margin:0;font-size:26px;letter-spacing:3px;">FLAVOR ISLE</h1>
        <p style="color:rgba(255,255,255,0.85);margin:4px 0 0;font-size:12px;letter-spacing:2px;">SMITHS GROVE, KY</p>
      </div>
      <div style="padding:28px 24px;color:#141414;font-size:16px;line-height:1.6;">${bodyHtml}</div>
      <div style="background:#1A3A5C;padding:18px 24px;text-align:center;">
        <img src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/b05945903_smashiehead.png" alt="Smashie" width="64" height="64" style="border-radius:50%;display:block;margin:0 auto 10px;object-fit:cover;border:2px solid #F5A623;" />
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
      from: `${fromName} <smashie@flavor-isle.com>`,
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

// Show the birthday ask only when the order's phone-linked profile has no
// birthday. If no phone profile exists, use the order email as a fallback.
// A failed lookup omits the ask rather than risking a repeat to someone who
// has already saved their birthday.
async function birthdayAskForReadyOrder(order: any, base44?: any) {
  if (!base44) return '';
  try {
    const digits = String(order.customer_phone || '').replace(/\D/g, '').replace(/^1(?=\d{10}$)/, '');
    const phones = digits.length === 10
      ? [...new Set([order.customer_phone, digits, `+1${digits}`, `1${digits}`, `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`, `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`].filter(Boolean))]
      : (order.customer_phone ? [order.customer_phone] : []);
    let profile: any = null;
    for (const phone of phones) {
      const matches = await base44.asServiceRole.entities.CustomerProfile.filter({ phone });
      if (matches?.length) { profile = matches.find(p => p.birthday) || matches[0]; break; }
    }
    if (!profile && order.customer_email) {
      profile = (await base44.asServiceRole.entities.CustomerProfile.filter({ email: order.customer_email }))?.[0];
    }
    if (profile?.birthday) return '';
    return `<div style="margin:12px 0 14px;">
      <p style="color:#141414;font-size:14px;line-height:1.5;margin:0 0 10px;">P.S. When's your birthday? Tell us once and we'll drop 100 Stars on your Star Rewards account as your gift.</p>
      <a href="${APP_URL}/account?tab=profile" style="display:inline-block;background:#1A3A5C;color:#fff;text-decoration:none;padding:10px 22px;border-radius:999px;font-size:14px;font-weight:bold;">Add your birthday</a>
    </div>`;
  } catch (error) {
    console.error('Birthday lookup for ready email failed:', error.message);
    return '';
  }
}

// Google-review P.S. for the order-ready email (issue #37, step 1). Rendered
// only when the GOOGLE_REVIEW_URL app secret holds a real link — an unset
// secret omits the P.S. entirely so a broken link can never reach a customer.
// Sits directly after the birthday P.S. and reuses its typography.
function googleReviewPsHtml() {
  const url = String(Deno.env.get('GOOGLE_REVIEW_URL') || GOOGLE_REVIEW_URL).trim();
  return `<div style="margin:12px 0 14px;">
      <p style="color:#141414;font-size:14px;line-height:1.5;margin:0 0 10px;">How'd we do? Smashie would love 10 seconds of your time on Google: <a href="${url}" style="color:#1A3A5C;">leave a review</a>.</p>
    </div>`;
}

// Order-ready email — order status and fulfillment details. Reaches guest
// emails via Resend (built-in SendEmail only delivers to registered app users).
export async function sendOrderReadyEmail(order, base44?) {
  if (!order.customer_email) return false;
  const orderNum = order.order_number || (order.id ? order.id.slice(-6).toUpperCase() : '');
  const customerName = order.customer_name || 'friend';
  const orderType = order.order_type;
  const items = (order.items || [])
    .map(i => {
      const mods = formatItemModifiers(i);
      const modStr = mods.length > 0 ? ` (${mods.join(', ')})` : '';
      return `${i.name || 'Item'}${(i.quantity || 1) > 1 ? ` x${i.quantity}` : ''}${modStr}`;
    })
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
    : `Come on inside the dining room — your order will be ready on the counter. We don't hand orders out the window (especially for larger ones), so just head on in and we'll get you taken care of.`;

  const body = `
    <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey ${customerName},</p>
    <h2 style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 8px;">${headline}</h2>
    <div style="background:#1A3A5C;color:#ffffff;border-radius:12px;padding:12px 18px;margin:14px 0;letter-spacing:3px;font-family:'Oswald',Arial,sans-serif;font-size:14px;font-weight:bold;text-align:center;">ORDER READY · #${orderNum}</div>
    <p style="color:#141414;font-size:15px;margin:0 0 4px;"><strong>Items:</strong> ${items || '—'}</p>
    <p style="color:#141414;font-size:15px;margin:0 0 4px;"><strong>Total:</strong> ${totalStr}</p>
    <p style="color:#141414;font-size:15px;margin:0 0 14px;"><strong>${locationLine}</strong></p>
    <p style="color:#141414;font-size:16px;margin:0 0 6px;">${closingLine}</p>
    ${await birthdayAskForReadyOrder(order, base44)}
    ${googleReviewPsHtml()}
    <p style="color:#666;margin:0 0 4px;font-size:14px;">— Smashie & The Flavor Isle Team 🍔</p>
    ${await foodHeroHtml(base44)}
    ${await merchPromoHtml()}`;

  try {
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    let sent = false;
    for (let attempt = 1; attempt <= 3 && !sent; attempt++) {
      const { error } = await resend.emails.send({
        from: 'Flavor Isle <smashie@flavor-isle.com>',
        to: order.customer_email,
        subject: `✅ Order #${orderNum} is ready!`,
        html: brandedEmailHtml(body),
      });
      if (error) {
        console.error(`sendOrderReadyEmail error (attempt ${attempt}):`, error);
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
      } else {
        console.log(`Order ready email sent to ${order.customer_email} for order ${orderNum} (attempt ${attempt})`);
        sent = true;
      }
    }
    return sent;
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
    let sent = false;
    for (let attempt = 1; attempt <= 3 && !sent; attempt++) {
      const { error } = await resend.emails.send({
        from: `${fromName} <smashie@flavor-isle.com>`,
        to,
        subject,
        html: brandedEmailHtml(bodyHtml),
      });
      if (error) {
        console.error(`sendBrandedHtml error (attempt ${attempt}):`, error);
        if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
      } else {
        console.log(`Branded email sent to ${to}: ${subject} (attempt ${attempt})`);
        sent = true;
      }
    }
    return sent;
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
    ${await foodHeroHtml(base44)}
    ${whatToExpectHtml()}
    ${await merchPromoHtml()}`;
  return sendBrandedHtml(order.customer_email, `🍔 Order #${orderNum} is on the grill`, body);
}

// Thank-you email — sent when the order is completed. Asks for a review and
// promotes the merch line.
export async function sendOrderCompletedEmail(order: any, base44?: any) {
  if (!order.customer_email) return false;
  const orderNum = order.order_number || (order.id ? order.id.slice(-6).toUpperCase() : '');
  const customerName = order.customer_name || 'friend';
  const body = `
    <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey ${customerName},</p>
    <h2 style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 8px;">Thanks for rolling with us! 🙌</h2>
    <p style="color:#141414;font-size:16px;margin:0 0 6px;">Order #${orderNum} is all wrapped. Hope you ate good — that's what we're here for. 🍔</p>
    <p style="color:#666;margin:0 0 4px;font-size:14px;">We'd love to see you back soon, fam.</p>
    <p style="color:#666;margin:0 0 4px;font-size:14px;">— Smashie & The Flavor Isle Team</p>
    ${await foodHeroHtml(base44)}
    ${reviewCtaHtml(order.id)}
    ${await merchPromoHtml()}`;
  return sendBrandedHtml(order.customer_email, `Thanks for rolling with us! 🙌`, body);
}