import { Resend } from 'npm:resend@3.2.0';
import { brandedEmailHtml } from './sendOrderEmails.ts';

const FROM = 'Flavor Isle <smashie@flavor-isle.com>';

function itemsTable(order) {
  const rows = (order.items || []).map(item => {
    const qty = item.quantity || 1;
    const variant = item.variant_name || item.size || '';
    return `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0e8d0;">${item.name}${qty > 1 ? ` x${qty}` : ''}${variant ? `<div style="font-size:12px;color:#666;margin:2px 0 0;">${variant}</div>` : ''}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0e8d0;text-align:right;">$${((item.price || 0) * qty).toFixed(2)}</td>
    </tr>`;
  }).join('');

  return `<table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
    <thead><tr>
      <th style="text-align:left;padding:8px 0;border-bottom:2px solid #C0392B;color:#141414;font-size:13px;">ITEM</th>
      <th style="text-align:right;padding:8px 0;border-bottom:2px solid #C0392B;color:#141414;font-size:13px;">PRICE</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
    <tr><td style="padding:4px 0;color:#666;font-size:14px;">Subtotal</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.subtotal || 0).toFixed(2)}</td></tr>
    <tr><td style="padding:4px 0;color:#666;font-size:14px;">Shipping</td><td style="text-align:right;color:#666;font-size:14px;">$${(order.shipping || 0).toFixed(2)}</td></tr>
    <tr><td style="padding:8px 0 0;color:#141414;font-size:16px;font-weight:bold;border-top:2px solid #f0e8d0;">Total</td><td style="text-align:right;padding:8px 0 0;color:#C0392B;font-size:18px;font-weight:bold;border-top:2px solid #f0e8d0;">$${(order.total || 0).toFixed(2)}</td></tr>
  </table>`;
}

function addressBlock(order) {
  const a = order.shipping_address || {};
  const lines = [
    a.name || order.customer_name,
    a.address1,
    a.address2,
    [a.city, a.state_code, a.zip].filter(Boolean).join(', '),
    a.country_code,
  ].filter(Boolean);
  return `<div style="background:#f5edd6;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
    <p style="margin:0 0 6px;font-size:13px;color:#1A3A5C;font-weight:bold;">SHIPPING TO</p>
    ${lines.map(l => `<p style="margin:2px 0;font-size:14px;color:#1A3A5C;">${l}</p>`).join('')}
  </div>`;
}

// Order confirmation — sent the moment a Tasty Threads merch order is paid.
export async function sendMerchConfirmationEmail(order) {
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  const html = brandedEmailHtml(`
    <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey fam,</p>
    <h2 style="color:#141414;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 4px;">${order.customer_name || 'Friend'} — your Tasty Threads order is in! 👕</h2>
    <p style="color:#141414;font-size:17px;line-height:1.5;margin:6px 0 24px;">We're getting your gear printed and packed. You'll get another email with tracking the second it ships.</p>

    <div style="background:#1A3A5C;color:white;border-radius:12px;padding:14px 20px;margin-bottom:24px;text-align:center;letter-spacing:3px;font-family:'Oswald',Arial,sans-serif;font-size:15px;font-weight:bold;">
      ORDER CONFIRMED · #${order.order_number || ''}
    </div>

    ${itemsTable(order)}
    ${addressBlock(order)}

    <p style="color:#666;margin:0;font-size:14px;">— Smashie & The Flavor Isle Team 🍔</p>
  `);

  const { error } = await resend.emails.send({
    from: FROM,
    to: order.customer_email,
    subject: `Tasty Threads order confirmed — #${order.order_number || ''} 👕`,
    html,
  });
  if (error) console.error('Merch confirmation email error:', error);
  else console.log(`Merch confirmation sent to ${order.customer_email}`);
}

// In production — sent the first time Printful reports the order is being printed.
export async function sendMerchInProductionEmail(order) {
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  const html = brandedEmailHtml(`
    <p style="color:#666;margin:0 0 10px;font-size:16px;">Heads up,</p>
    <h2 style="color:#141414;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 4px;">${order.customer_name || 'Friend'} — your gear is being printed! 🎨</h2>
    <p style="color:#141414;font-size:17px;line-height:1.5;margin:6px 0 24px;">Order #${order.order_number || ''} just hit the print floor. Ink's going down as we speak — next stop is packing, then it's on its way to you.</p>

    <div style="background:#1A3A5C;color:white;border-radius:12px;padding:14px 20px;margin-bottom:24px;text-align:center;letter-spacing:3px;font-family:'Oswald',Arial,sans-serif;font-size:15px;font-weight:bold;">
      IN PRODUCTION · #${order.order_number || ''}
    </div>

    ${itemsTable(order)}
    ${addressBlock(order)}

    <p style="color:#666;margin:0;font-size:14px;">— Smashie & The Flavor Isle Team 🍔</p>
  `);

  const { error } = await resend.emails.send({
    from: FROM,
    to: order.customer_email,
    subject: `Your Tasty Threads gear is being printed 🎨 #${order.order_number || ''}`,
    html,
  });
  if (error) console.error('Merch in-production email error:', error);
  else console.log(`Merch in-production email sent to ${order.customer_email}`);
}

// Fulfilled — printing is done, order is being packed for shipment.
export async function sendMerchFulfilledEmail(order) {
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  const html = brandedEmailHtml(`
    <p style="color:#666;margin:0 0 10px;font-size:16px;">Almost there,</p>
    <h2 style="color:#141414;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 4px;">${order.customer_name || 'Friend'} — printing's done, packing's next! 📦</h2>
    <p style="color:#141414;font-size:17px;line-height:1.5;margin:6px 0 24px;">Order #${order.order_number || ''} came off the press looking sharp. It's getting boxed up now — you'll get tracking the second it ships.</p>

    <div style="background:#1A3A5C;color:white;border-radius:12px;padding:14px 20px;margin-bottom:24px;text-align:center;letter-spacing:3px;font-family:'Oswald',Arial,sans-serif;font-size:15px;font-weight:bold;">
      PRINTED &amp; PACKING · #${order.order_number || ''}
    </div>

    ${itemsTable(order)}
    ${addressBlock(order)}

    <p style="color:#666;margin:0;font-size:14px;">— Smashie & The Flavor Isle Team 🍔</p>
  `);

  const { error } = await resend.emails.send({
    from: FROM,
    to: order.customer_email,
    subject: `Printing's done — your Tasty Threads order is packing up 📦 #${order.order_number || ''}`,
    html,
  });
  if (error) console.error('Merch fulfilled email error:', error);
  else console.log(`Merch fulfilled email sent to ${order.customer_email}`);
}

// Shipping notification — sent when Printful hands over tracking info.
export async function sendMerchShippedEmail(order) {
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  const trackBtn = order.tracking_url
    ? `<div style="text-align:center;margin:0 0 24px;">
        <a href="${order.tracking_url}" style="display:inline-block;background:#C0392B;color:#fff;text-decoration:none;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;font-size:15px;padding:14px 32px;border-radius:999px;">TRACK MY PACKAGE</a>
      </div>`
    : '';

  const html = brandedEmailHtml(`
    <p style="color:#666;margin:0 0 10px;font-size:16px;">Good news,</p>
    <h2 style="color:#141414;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 4px;">${order.customer_name || 'Friend'} — your gear is on the way! 📦</h2>
    <p style="color:#141414;font-size:17px;line-height:1.5;margin:6px 0 24px;">Order #${order.order_number || ''} just shipped out.</p>

    ${order.tracking_number ? `<div style="background:#1A3A5C;color:white;border-radius:12px;padding:14px 20px;margin-bottom:20px;text-align:center;font-family:'Oswald',Arial,sans-serif;font-size:15px;font-weight:bold;">
      TRACKING · ${order.tracking_number}
    </div>` : ''}
    ${trackBtn}

    ${itemsTable(order)}
    ${addressBlock(order)}

    <p style="color:#666;margin:0;font-size:14px;">— Smashie & The Flavor Isle Team 🍔</p>
  `);

  const { error } = await resend.emails.send({
    from: FROM,
    to: order.customer_email,
    subject: `Your Tasty Threads order shipped! 📦 #${order.order_number || ''}`,
    html,
  });
  if (error) console.error('Merch shipped email error:', error);
  else console.log(`Merch shipping email sent to ${order.customer_email}`);
}