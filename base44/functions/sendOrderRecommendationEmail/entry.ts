import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { Resend } from 'npm:resend@3.2.0';
import { brandedEmailHtml } from '../../shared/sendOrderEmails.ts';

const APP_URL = 'https://flavor-isle.com';
const FROM = 'Flavor Isle <smashie@order.flavor-isle.com>';

// Internal/test emails that should never receive a recommendation email.
const SKIP_EMAILS = new Set([
  'square-pos@flavorisle.com',
  'wesley@flavor-isle.com',
  'wesleyrbooker1@gmail.com',
  'test@example.com',
]);

function isSkipEmail(email) {
  if (!email) return true;
  const e = email.toLowerCase().trim();
  if (SKIP_EMAILS.has(e)) return true;
  if (e.endsWith('@flavorisle.com')) return true;
  return false;
}

// Bucket a menu item into MAIN / SIDE / DESSERT / DRINK / OTHER using its
// category field plus name keywords (covers custom & special items).
function bucketItem(item) {
  const name = (item.name || '').toLowerCase();
  const cat = (item.category || item.square_category || item.display_category || '').toLowerCase();

  // DESSERTS — check first so shakes/sundaes never get caught by drink rules
  if (cat === 'shakes') return 'DESSERT';
  if (/ice ?cream|sundae|cake|milkshake|\bshake\b|\bmalt\b|float|bliss|\bpie\b|brownie|cookie|banana split|hot fudge|apple pie|caramel apple/.test(name)) return 'DESSERT';

  // SIDES
  if (cat === 'sides') return 'SIDE';
  if (/fries|tots|onion rings|appetizer|nuggets|mozzarella|jalapeno|loaded|cheese fries|curly fries|chips/.test(name)) return 'SIDE';

  // DRINKS
  if (cat === 'drinks') return 'DRINK';
  if (/coke|pepsi|sprite|dr ?pepper|tea|lemonade|water|juice|coffee|soda|bottled|fountain|mt ?dew|root beer/.test(name)) return 'DRINK';

  // MAINS
  if (cat === 'burgers' || cat === 'chicken' || cat === 'breakfast') return 'MAIN';
  if (/burger|sandwich|melt|hot ?dog|hamburger ?steak|chicken|tender|basket|combo|deluxe|cravewave/.test(name)) return 'MAIN';

  // Specials — infer from the item name
  if (cat === 'specials') {
    if (/burger|sandwich|chicken|hot ?dog|melt/.test(name)) return 'MAIN';
    if (/fries|tots|onion|nuggets/.test(name)) return 'SIDE';
    if (/shake|sundae|cake|pie|bliss/.test(name)) return 'DESSERT';
    if (/coke|tea|lemonade|water|drink/.test(name)) return 'DRINK';
  }

  return 'OTHER';
}

// One short line of diner-voice copy for a recommended item.
function itemCopy(item) {
  const name = (item.name || '').toLowerCase();
  const bucket = item._bucket;
  if (bucket === 'DESSERT') {
    if (/shake|malt/.test(name)) return 'Hand-spun and thick enough to make your straw work for it.';
    if (/sundae|banana split/.test(name)) return 'Piled high with toppings — the perfect sweet ending.';
    if (/cake|brownie|pie|fudge/.test(name)) return 'Rich, homemade, and worth saving room for.';
    return 'Sweet, fresh, and calling your name.';
  }
  if (bucket === 'MAIN') {
    if (/burger|cheeseburger/.test(name)) return 'Fresh, hand-patted, and smashed to order.';
    if (/chicken/.test(name)) return 'Crispy, juicy, and fried fresh just for you.';
    return 'A regular favorite the locals swear by.';
  }
  if (bucket === 'SIDE') return 'Hot, crispy, and the perfect partner for any main.';
  return "A Flavor Isle favorite you've got to try.";
}

// Click-tracked link through the existing trackEmailClick endpoint.
function trackedLink(path, linkId, orderId) {
  const to = encodeURIComponent(path);
  let url = `${APP_URL}/functions/trackEmailClick?link=${linkId}&to=${to}`;
  if (orderId) url += `&order_id=${encodeURIComponent(orderId)}`;
  return url;
}

function heroCardHtml(item, orderId) {
  const link = trackedLink('/menu', 'recommendation_item', orderId);
  const img = item.image_url || '';
  const price = typeof item.price === 'number' ? `$${item.price.toFixed(2)}` : '';
  const copy = itemCopy(item);
  return `
  <a href="${link}" style="text-decoration:none;color:#141414;display:block;margin-bottom:24px;">
    <img src="${img}" alt="${(item.name || '').replace(/"/g, '&quot;')}" width="500" style="width:100%;max-width:500px;border-radius:14px;display:block;object-fit:cover;aspect-ratio:4/3;background:#f5edd6;" />
    <div style="padding:14px 4px 0;">
      <div style="font-family:'Oswald',Arial,sans-serif;font-size:22px;color:#C0392B;letter-spacing:1px;">${item.name || 'Flavor Isle Favorite'}</div>
      ${price ? `<div style="font-family:'Oswald',Arial,sans-serif;font-size:18px;color:#141414;margin-top:2px;">${price}</div>` : ''}
      <p style="font-size:14px;color:#666;margin:8px 0 0;line-height:1.5;">${copy}</p>
    </div>
  </a>`;
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const { order_id } = await req.json();
    if (!order_id) return Response.json({ error: 'order_id is required' }, { status: 400 });

    // ── Load the order ──
    const order = await base44.asServiceRole.entities.Order.get(order_id);
    if (!order) return Response.json({ skipped: true, reason: 'order not found' });

    // ── Guardrails ──
    if (isSkipEmail(order.customer_email)) {
      return Response.json({ skipped: true, reason: 'skip email (POS/test/internal)' });
    }
    if (order.status === 'cancelled' || order.payment_status !== 'paid') {
      return Response.json({ skipped: true, reason: 'order cancelled or not paid' });
    }

    // Already sent for THIS order
    const existing = await base44.asServiceRole.entities.RecommendationEmail.filter({ order_id: order.id });
    if (existing && existing.length > 0) {
      return Response.json({ skipped: true, reason: 'already sent for this order' });
    }

    // Customer already received one in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recent = await base44.asServiceRole.entities.RecommendationEmail.filter({
      customer_email: order.customer_email,
    });
    if (recent && recent.some((r) => r.sent_at && new Date(r.sent_at) > sevenDaysAgo)) {
      return Response.json({ skipped: true, reason: 'customer received one in last 7 days' });
    }

    // ── Load all menu items & build lookup maps ──
    const allItems = await base44.asServiceRole.entities.MenuItem.list('-updated_date', 500);
    const byName = {};
    for (const m of allItems) {
      if (m.name) byName[m.name.toLowerCase()] = m;
    }

    // Map order items → menu items and bucket them
    const buckets = { MAIN: [], SIDE: [], DESSERT: [], DRINK: [], OTHER: [] };
    for (const oi of (order.items || [])) {
      const mi = byName[(oi.name || '').toLowerCase()] || null;
      const bucket = bucketItem(mi || oi);
      buckets[bucket].push({ orderItem: oi, menuItem: mi });
    }

    const hasMain = buckets.MAIN.length > 0;
    const hasSide = buckets.SIDE.length > 0;
    const hasDessert = buckets.DESSERT.length > 0;

    // Available items with photos, sorted fan-favorite first
    const available = (bucket) =>
      allItems
        .filter((m) => bucketItem(m) === bucket && m.is_available !== false && m.is_hidden !== true && m.image_url)
        .sort((a, b) => {
          const fa = b.is_fan_favorite ? 1 : 0;
          const fb = a.is_fan_favorite ? 1 : 0;
          if (fa !== fb) return fa - fb;
          return (a.fan_favorite_rank || 999) - (b.fan_favorite_rank || 999);
        });

    let recommendations = [];
    let emailType = '';
    let subject = '';
    let bodyLine = '';

    const orderedMainNames = buckets.MAIN.map((b) => b.menuItem?.name || b.orderItem.name).filter(Boolean);
    const orderedMainCats = buckets.MAIN.map((b) => b.menuItem?.category || '').filter(Boolean);
    const orderedNamesLower = new Set((order.items || []).map((i) => (i.name || '').toLowerCase()));

    if (hasMain && hasSide && !hasDessert) {
      // (a) MAIN + SIDE, no DESSERT → 1-2 fan-favorite desserts
      emailType = 'dessert';
      recommendations = available('DESSERT').slice(0, 2);
      const mainName = orderedMainNames[0] || 'your meal';
      const dessertName = recommendations[0]?.name || 'something sweet';
      subject = 'Save room for this 🍦';
      bodyLine = `Your ${mainName} deserved a sidekick. Next time, ${dessertName} is calling — hand-spun, thick enough to make your straw work for it.`;
    } else if (hasMain && hasSide && hasDessert) {
      // (b) Complete meal → ONE similar main they haven't ordered
      emailType = 'similar_main';
      const mainCat = orderedMainCats[0] || '';
      let mains = available('MAIN').filter((m) => !orderedNamesLower.has((m.name || '').toLowerCase()));
      if (mainCat) {
        const sameCat = mains.filter((m) => (m.category || '') === mainCat);
        if (sameCat.length > 0) mains = sameCat;
      }
      recommendations = mains.slice(0, 1);
      const orderedMain = orderedMainNames[0] || 'your burger';
      const suggested = recommendations[0]?.name || 'something new';
      subject = `Next time, try the ${suggested} 🍔`;
      if (subject.length > 45) subject = 'Next time, try something new 🍔';
      bodyLine = `You've got great taste — the ${orderedMain} is a classic. But the ${suggested} is the one the regulars whisper about.`;
    } else if (hasMain && !hasSide && !hasDessert) {
      // (c) MAIN only → fan-favorite side + dessert pairing
      emailType = 'pairing';
      recommendations = [available('SIDE')[0], available('DESSERT')[0]].filter(Boolean);
      const mainName = orderedMainNames[0] || 'your burger';
      subject = 'Complete the combo 🍟';
      bodyLine = `${mainName} is a great start — but the regulars know it's the side + sweet pairing that makes a meal. Next time, round it out.`;
    } else if (!hasMain && hasDessert && !hasSide) {
      // (d) DESSERT only → fan-favorite main
      emailType = 'pairing';
      recommendations = available('MAIN').slice(0, 1);
      subject = 'Something savory next time? 🍔';
      bodyLine = `Sweet tooth satisfied — but next time, lead with the savory. The ${recommendations[0]?.name || 'hand-patted burgers'} are what the regulars come back for.`;
    } else {
      // Fallback → fan-favorite desserts
      emailType = 'dessert';
      recommendations = available('DESSERT').slice(0, 2);
      if (recommendations.length === 0) {
        return Response.json({ skipped: true, reason: 'no recommendations available' });
      }
      subject = 'Save room for this 🍦';
      bodyLine = `Next time you're craving Flavor Isle, save room for something sweet — the regulars swear by it.`;
    }

    // Photos are mandatory — drop any without one
    recommendations = recommendations.filter((r) => r && r.image_url);
    if (recommendations.length === 0) {
      return Response.json({ skipped: true, reason: 'no recommended items with photos' });
    }

    // Tag buckets for copy generation
    recommendations = recommendations.map((r) => ({ ...r, _bucket: bucketItem(r) }));

    // ── Build email HTML ──
    const customerName = (order.customer_name || 'friend').split(' ')[0];
    const heading = subject.replace(/[🍦🍔🍟]/gu, '').trim();
    const heroCards = recommendations.map((r) => heroCardHtml(r, order.id)).join('');
    const ctaLink = trackedLink('/menu', 'recommendation_cta', order.id);

    const bodyHtml = `
      <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey ${customerName},</p>
      <h2 style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 10px;">${heading}</h2>
      <p style="color:#141414;font-size:16px;margin:0 0 24px;line-height:1.6;">${bodyLine}</p>
      ${heroCards}
      <div style="text-align:center;margin:28px 0 8px;">
        <a href="${ctaLink}" style="display:inline-block;background:#C0392B;color:#fff;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:16px 40px;border-radius:999px;font-size:16px;">ORDER AHEAD AT FLAVOR ISLE →</a>
      </div>
      <p style="color:#999;font-size:12px;margin:18px 0 0;line-height:1.5;">You're getting this because you ordered from Flavor Isle. Don't want these emails? <a href="mailto:smashie@order.flavor-isle.com?subject=Unsubscribe" style="color:#999;text-decoration:underline;">Unsubscribe</a>.</p>
    `;

    const html = brandedEmailHtml(bodyHtml);

    // ── Send via Resend ──
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const { error } = await resend.emails.send({
      from: FROM,
      to: order.customer_email,
      subject,
      html,
    });
    if (error) {
      console.error('Recommendation email send error:', error);
      return Response.json({ ok: false, error: 'email send failed' }, { status: 500 });
    }

    // ── Track it ──
    await base44.asServiceRole.entities.RecommendationEmail.create({
      order_id: order.id,
      customer_email: order.customer_email,
      sent_at: new Date().toISOString(),
      suggested_item_ids: recommendations.map((r) => r.id).filter(Boolean),
      email_type: emailType,
    });

    console.log(`Recommendation email (${emailType}) sent to ${order.customer_email} for order ${order.order_number || order.id}`);
    return Response.json({
      ok: true,
      email_type: emailType,
      suggested: recommendations.map((r) => r.name),
    });
  } catch (error) {
    console.error('sendOrderRecommendationEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}