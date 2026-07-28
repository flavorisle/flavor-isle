import { Resend } from 'npm:resend@3.2.0';

const LOGO_URL = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';

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

// The Sip Shack drink flavors, mirrored from the on-site accordion so the
// ready email advertises them. Email clients can't reliably run the
// click-to-expand JS, so each section is a <details> block — accordion where
// supported, gracefully expanded where it's stripped, every flavor visible.
const SIP_SECTIONS = [
  { title: 'Sugar Free Flavors', items: [['Watermelon', '🍉'], ['Strawberry', '🍓'], ['Raspberry', '🫐']] },
  { title: 'Regular Flavors', items: [['Blackberry', '🫐'], ['Rocket-Pop Vanilla', '🚀'], ['Coconut', '🥥'], ['Blue Raspberry', '🔷'], ['Peach', '🍑']] },
  { title: 'Boba Flavors', items: [['Strawberry', '🧋'], ['Peach', '🧋'], ['Watermelon', '🧋']] },
];

export function flavorsAccordionHtml() {
  const sections = SIP_SECTIONS.map(section => {
    const rows = section.items.map(([name, emoji]) => `
      <tr>
        <td style="padding:7px 12px;background:#fce4e4;border-radius:8px;">
          <span style="font-size:18px;margin-right:8px;">${emoji}</span>
          <span style="font-family:'Oswald',Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;color:#8e3a4e;font-size:13px;">${name}</span>
        </td>
      </tr>`).join('');
    return `
      <details style="margin-bottom:10px;border:1.5px solid #d85573;border-radius:12px;overflow:hidden;">
        <summary style="background:#d85573;color:#ffffff;padding:10px 14px;font-family:'Oswald',Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;font-size:13px;cursor:pointer;list-style:none;">${section.title}</summary>
        <div style="padding:10px 4px;">
          <table style="width:100%;border-collapse:separate;border-spacing:0 6px;">${rows}</table>
        </div>
      </details>`;
  }).join('');

  return `
    <div style="margin-top:28px;padding-top:24px;border-top:2px dashed #e5d8b0;">
      <p style="text-align:center;margin:0 0 6px;font-family:'Oswald',Arial,sans-serif;text-transform:uppercase;letter-spacing:3px;color:#8e3a4e;font-size:22px;">The Sip Shack</p>
      <p style="text-align:center;margin:0 0 4px;font-family:'Oswald',Arial,sans-serif;text-transform:uppercase;letter-spacing:2px;color:#FF99CC;font-size:12px;">by Ady Lee</p>
      <p style="text-align:center;margin:0 0 14px;color:#141414;font-size:14px;font-weight:600;">Grab one in store while you pick up!</p>
      <p style="text-align:center;margin:0 0 16px;">
        <span style="display:inline-block;background:#d85573;color:#ffffff;font-family:'Oswald',Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;font-size:12px;padding:6px 12px;border-radius:999px;">Lemonades · $5 · 32 oz</span>
        <span style="display:inline-block;background:#ffffff;color:#8e3a4e;border:1.5px solid #d85573;font-family:'Oswald',Arial,sans-serif;text-transform:uppercase;letter-spacing:1px;font-size:11px;padding:5px 10px;border-radius:999px;margin-left:6px;">All Flavors · $1</span>
      </p>
      ${sections}
    </div>`;
}

// Order-ready email — order status, fulfillment details, and a Sip Shack
// flavors accordion to advertise the drink menu. Reaches guest emails via
// Resend (built-in SendEmail only delivers to registered app users).
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
    ${flavorsAccordionHtml()}`;

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
    console.log(`Order ready email (with Sip Shack accordion) sent to ${order.customer_email} for order ${orderNum}`);
    return true;
  } catch (err) {
    console.error('sendOrderReadyEmail exception:', err.message);
    return false;
  }
}