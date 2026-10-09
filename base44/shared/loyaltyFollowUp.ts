import { Resend } from 'npm:resend@3.2.0';
import { brandedEmailHtml } from './sendOrderEmails.ts';
import { excludeMaltSundae, dailyRotate } from './dessertPriority.ts';
import { getSmashieSettings } from './smashieSettings.ts';

// Mechanics for the two loyalty follow-up emails (issue #37, step 6): the Day 14
// "here's what you didn't try yet" showcase and the Day 45 nudge for customers
// who never came back. Both are wired here and switched on only from
// Admin → Communications, and the copy below is deliberately placeholder text —
// nothing goes out until the owner approves the final wording and flips the
// toggle himself.
//
// Rules carried through from the approved plan:
//   • Only customers subscribed through the existing double opt-in
//     (EmailSubscriber status 'active'); one-click unsubscribe honored.
//   • Day 14 fires 14 days after the customer's FIRST captured order; Day 45
//     fires 45 days after it, and only when no later order exists.
//   • Suggestions come from order history by email/phone, never the Loyalty
//     table; three items the customer has NOT ordered; malts and sundaes are
//     excluded and picks rotate.
//   • PULLED PORK SANDWICH and LOADED BBQ WAFFLE FRIES are discontinued and can
//     never appear.

const FROM = 'Flavor Isle <smashie@flavor-isle.com>';
const APP_URL = 'https://flavor-isle.com';
const EMAIL_TYPE = { day14: 'day14_showcase', day45: 'day45_nudge' };
const TOGGLE = { day14: 'day14ShowcaseEmailEnabled', day45: 'day45NudgeEmailEnabled' };
const DAYS = { day14: 14, day45: 45 };

// Placeholder copy — swapped for the approved wording before the toggles ever
// go on. Kept in one place so the swap is a single edit per email.
export const PLACEHOLDER_COPY = {
  day14: {
    heading: '[PLACEHOLDER COPY] Here is what you did not try yet',
    body: '[PLACEHOLDER COPY] You have ordered with us once, and these three are still waiting for you. Come see us again.',
    cta: 'See the menu',
  },
  day45: {
    heading: '[PLACEHOLDER COPY] We saved your seat',
    body: '[PLACEHOLDER COPY] It has been a while since your last order. The grill is still hot and the shakes are still spinning.',
    cta: 'Order again',
  },
};

// Discontinued items (owner, Oct 2 2026) — never promoted anywhere.
const DISCONTINUED = [/pulled\s*pork/i, /loaded\s*bbq\s*waffle/i, /waffle\s*fries\s*with\s*jalap/i];

// Internal addresses that must never receive a customer email.
function isSkipEmail(email) {
  if (!email) return true;
  const e = String(email).toLowerCase().trim();
  return e.endsWith('@flavorisle.com') || e === 'wesleyrbooker1@gmail.com' || e === 'test@example.com';
}

function isDiscontinued(item) {
  const name = String(item?.name || '');
  return DISCONTINUED.some((pattern) => pattern.test(name));
}

// Each customer's first captured online order, for first orders that landed
// between `days` and `days + 1` days ago. The daily run sees each first order in
// exactly one band.
export async function firstOrderCandidates(base44, days) {
  const now = Date.now();
  const upperBound = new Date(now - days * 24 * 60 * 60 * 1000);
  const lowerBound = new Date(now - (days + 1) * 24 * 60 * 60 * 1000);

  const orders = await base44.asServiceRole.entities.Order.filter({ order_source: 'online' }, '-created_date', 500);
  const byEmail = new Map();
  for (const order of orders || []) {
    if (!order.created_date || order.status === 'cancelled') continue;
    const email = String(order.customer_email || '').toLowerCase().trim();
    if (isSkipEmail(email)) continue;
    const known = byEmail.get(email);
    if (!known || new Date(order.created_date) < new Date(known.created_date)) byEmail.set(email, order);
  }

  const candidates = [];
  for (const [email, firstOrder] of byEmail) {
    const created = new Date(firstOrder.created_date);
    if (created <= upperBound && created >= lowerBound) candidates.push({ email, firstOrder });
  }
  return candidates;
}

// Every non-cancelled order for one address, newest first.
export async function customerOrders(base44, storedEmail) {
  const orders = await base44.asServiceRole.entities.Order.filter({ customer_email: storedEmail }, '-created_date', 200);
  return (orders || []).filter((order) => order.status !== 'cancelled');
}

function orderedNames(orders) {
  const names = new Set();
  for (const order of orders) {
    for (const item of order.items || []) {
      const name = String(item?.name || '').split(' (')[0].trim().toLowerCase();
      if (name) names.add(name);
    }
  }
  return names;
}

// Three items the customer has not ordered: available, visible, not
// discontinued, no malts or sundaes, rotated by store day.
export function showcasePicks(menuItems, ordered, count = 3) {
  const eligible = (menuItems || []).filter((item) =>
    item?.name &&
    item.is_available !== false &&
    item.is_hidden !== true &&
    !isDiscontinued(item) &&
    !ordered.has(String(item.name).trim().toLowerCase()));
  return dailyRotate(excludeMaltSundae(eligible)).slice(0, count);
}

export async function activeSubscriber(base44, email) {
  const rows = await base44.asServiceRole.entities.EmailSubscriber.filter({ email: String(email).toLowerCase().trim() });
  return (rows || []).find((row) => row.status === 'active') || null;
}

function unsubscribeFooter(subscriber) {
  const link = subscriber?.unsubscribe_token
    ? `<a href="${APP_URL}/unsubscribe?token=${encodeURIComponent(subscriber.unsubscribe_token)}" style="color:#999;text-decoration:underline;">Unsubscribe</a>`
    : `<a href="mailto:unsubscribe@flavor-isle.com?subject=Unsubscribe" style="color:#999;text-decoration:underline;">Unsubscribe</a>`;
  return `<p style="color:#999;font-size:12px;margin:18px 0 0;line-height:1.5;">You're getting this because you subscribed to Flavor Isle emails and you've ordered with us before. ${link}.</p>`;
}

function picksHtml(picks) {
  return picks.map((item) => {
    const photo = item.image_url_opt || item.image_url || '';
    const alt = String(item.name || 'Flavor Isle item').replace(/"/g, '&quot;');
    return `<tr>
        ${photo ? `<td style="width:72px;vertical-align:top;padding:0 12px 14px 0;"><img src="${photo}" alt="${alt}" width="72" height="72" style="width:72px;height:72px;border-radius:12px;object-fit:cover;display:block;background:#f5edd6;" /></td>` : ''}
        <td style="vertical-align:top;padding:0 0 14px;">
          <p style="margin:0;font-family:'Oswald',Arial,sans-serif;font-size:17px;color:#141414;">${item.name}</p>
          ${item.description ? `<p style="margin:3px 0 0;font-size:13px;color:#666;line-height:1.45;">${item.description}</p>` : ''}
        </td>
      </tr>`;
  }).join('');
}

export function buildFollowUpHtml({ kind, firstName, picks, subscriber }) {
  const copy = PLACEHOLDER_COPY[kind];
  const ctaLink = `${APP_URL}/menu`;
  const body = `
    <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey ${firstName},</p>
    <h2 style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 8px;">${copy.heading}</h2>
    <p style="color:#141414;font-size:16px;margin:0 0 20px;line-height:1.6;">${copy.body}</p>
    <table style="width:100%;border-collapse:collapse;margin:0 0 8px;">${picksHtml(picks)}</table>
    <div style="text-align:center;margin:22px 0 8px;">
      <a href="${ctaLink}" style="display:inline-block;background:#C0392B;color:#fff;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:16px 40px;border-radius:999px;font-size:17px;">${copy.cta} →</a>
    </div>
    ${unsubscribeFooter(subscriber)}`;
  return brandedEmailHtml(body);
}

export function subjectFor(kind) {
  return kind === 'day14'
    ? '[PLACEHOLDER COPY] Three things you haven\'t tried at Flavor Isle'
    : '[PLACEHOLDER COPY] We saved your seat at Flavor Isle';
}

async function sendEmail({ to, subject, html }) {
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) throw new Error(String(error.message || error));
}

// Runs one of the two follow-ups. Returns counts so the workflow run log shows
// exactly what happened.
export async function runLoyaltyFollowUp(base44, kind) {
  const settings = await getSmashieSettings(base44);
  if (settings[TOGGLE[kind]] !== true) {
    return { ok: true, skipped: true, reason: `${TOGGLE[kind]} is off` };
  }

  const candidates = await firstOrderCandidates(base44, DAYS[kind]);
  const menuItems = await base44.asServiceRole.entities.MenuItem.list('-updated_date', 500);
  let sent = 0;
  let skipped = 0;

  for (const { email, firstOrder } of candidates) {
    const subscriber = await activeSubscriber(base44, email);
    if (!subscriber) { skipped++; continue; }

    const already = await base44.asServiceRole.entities.LoyaltyEmail.filter({ email_type: EMAIL_TYPE[kind], customer_email: email });
    if (already && already.length) { skipped++; continue; }

    const orders = await customerOrders(base44, firstOrder.customer_email || email);
    // Day 45 only reaches customers who never ordered again.
    if (kind === 'day45' && orders.some((order) => new Date(order.created_date) > new Date(firstOrder.created_date))) {
      skipped++;
      continue;
    }

    const picks = showcasePicks(menuItems, orderedNames(orders));
    if (picks.length === 0) { skipped++; continue; }

    // Claim before sending, so a second run cannot email the same customer.
    const claim = await base44.asServiceRole.entities.LoyaltyEmail.create({
      email_type: EMAIL_TYPE[kind],
      customer_email: email,
      order_id: firstOrder.id || null,
      points_granted: 0,
      sent_at: new Date().toISOString(),
      description: 'Claimed before send; removed again if the send fails so a later run can retry.',
    });

    try {
      const firstName = (firstOrder.customer_name || 'friend').split(' ')[0] || 'friend';
      await sendEmail({
        to: email,
        subject: subjectFor(kind),
        html: buildFollowUpHtml({ kind, firstName, picks, subscriber }),
      });
      sent++;
      console.log(`${EMAIL_TYPE[kind]} sent to ${email}`);
    } catch (error) {
      console.error(`${EMAIL_TYPE[kind]} send failed for ${email}:`, error.message);
      await base44.asServiceRole.entities.LoyaltyEmail.delete(claim.id).catch(() => {});
      skipped++;
    }
  }

  return { ok: true, found: candidates.length, sent, skipped };
}