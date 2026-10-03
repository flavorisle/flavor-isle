import {
  brandedEmailHtml,
  foodHeroHtml,
  whatToExpectHtml,
  merchPromoHtml,
  trackedLink,
} from './sendOrderEmails.ts';

const escapeHtml = (s: any) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

// Build a visually rich cart reminder in Smashie's voice. Shows the actual
// items (with photos when available), the stars they'll earn, a live-kitchen
// link, and a food hero — all wrapped in the branded email shell.
export async function buildCartReminderHtml(base44: any, name: string, items: any[], subtotal: number) {
  const firstName = (String(name || '').trim().split(/\s+/)[0]) || 'there';
  const finishLink = trackedLink('/menu', 'cart_abandonment');
  const starsLink = trackedLink('/rewards', 'cart_abandonment_stars');

  // Item cards with photos — up to 4 shown, rest summarized.
  const visibleItems = items.slice(0, 4);
  const itemCards = visibleItems.map((i: any) => {
    const qty = Number(i.quantity) || 1;
    const lineTotal = (Number(i.price) || 0) * qty;
    const img = i.image_url_opt || i.image_url
      ? `<img src="${i.image_url}" alt="${escapeHtml(i.name)}" width="64" height="64" style="width:64px;height:64px;border-radius:10px;object-fit:cover;display:block;flex-shrink:0;background:#f5edd6;" />`
      : `<div style="width:64px;height:64px;border-radius:10px;background:#f5edd6;display:flex;align-items:center;justify-content:center;font-size:28px;flex-shrink:0;">🍔</div>`;
    return `<div style="display:flex;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #f0e8d0;">
      ${img}
      <div style="flex:1;min-width:0;">
        <p style="margin:0;font-family:'Oswald',Arial,sans-serif;font-size:15px;color:#141414;letter-spacing:0.5px;">${escapeHtml(i.name)}${qty > 1 ? ` &times;${qty}` : ''}</p>
        <p style="margin:2px 0 0;font-size:13px;color:#C0392B;font-weight:bold;">$${lineTotal.toFixed(2)}</p>
      </div>
    </div>`;
  }).join('');
  const moreCount = items.length - visibleItems.length;
  const moreLine = moreCount > 0
    ? `<p style="font-size:13px;color:#888;margin:8px 0 0;font-style:italic;">+ ${moreCount} more item${moreCount !== 1 ? 's' : ''} waiting in your bag</p>`
    : '';

  // Star Rewards — 4 stars per $10 spent.
  const starsEarned = Math.floor(subtotal / 10) * 4;
  const starsBlock = starsEarned > 0
    ? `<div style="margin:18px 0;border-radius:12px;padding:14px 18px;background:#FFF8E7;border:2px dashed #F5A623;">
        <p style="margin:0 0 4px;font-family:'Oswald',Arial,sans-serif;font-size:15px;color:#C0392B;letter-spacing:1px;">⭐ YOU'LL EARN ${starsEarned} STAR${starsEarned === 1 ? '' : 'S'} ON THIS ORDER</p>
        <p style="margin:0;font-size:13px;color:#141414;line-height:1.5;">That's ${starsEarned} star${starsEarned === 1 ? '' : 's'} closer to free food — <a href="${starsLink}" style="color:#C0392B;text-decoration:none;font-weight:bold;">see your rewards →</a></p>
      </div>`
    : '';

  const body = `
    <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey ${escapeHtml(firstName)},</p>
    <h2 style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:24px;margin:0 0 8px;letter-spacing:1px;">Your bag's getting cold! 🛒</h2>
    <p style="color:#141414;font-size:16px;line-height:1.6;margin:0 0 6px;">Smashie here — looks like you were this close to something delicious. Your bag's still saved, and the grill's still hot. Two taps and we'll have it ready for you.</p>
    <p style="color:#141414;font-size:16px;line-height:1.6;margin:0 0 18px;">Here's what you left behind:</p>

    <div style="background:#FFFDF8;border:1px solid #f0e8d0;border-radius:14px;padding:12px 16px;margin:0 0 8px;">
      ${itemCards}
      ${moreLine}
    </div>

    <div style="display:flex;justify-content:space-between;align-items:center;padding:12px 2px 0;">
      <span style="font-family:'Oswald',Arial,sans-serif;font-size:16px;color:#141414;letter-spacing:1px;">ESTIMATED TOTAL</span>
      <span style="font-family:'Oswald',Arial,sans-serif;font-size:22px;color:#C0392B;font-weight:bold;">$${subtotal.toFixed(2)}</span>
    </div>

    ${starsBlock}

    <div style="text-align:center;margin:22px 0 6px;">
      <a href="${finishLink}" style="display:inline-block;background:#C0392B;color:#fff;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:16px 40px;border-radius:999px;font-size:16px;font-weight:bold;">FINISH MY ORDER →</a>
    </div>
    <p style="text-align:center;color:#888;font-size:13px;margin:0 0 18px;">Your bag's saved — just tap and check out. It takes less than a minute.</p>

    ${whatToExpectHtml()}
    ${await foodHeroHtml(base44)}
    ${await merchPromoHtml()}`;

  return brandedEmailHtml(body);
}