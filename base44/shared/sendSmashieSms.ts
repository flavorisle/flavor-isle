// Normalize a phone string to E.164 (Twilio requirement).
// Handles US 10/11-digit, strips everything but digits and a leading +.
export function normalizePhone(phone) {
  if (!phone) return null;
  let cleaned = phone.trim().replace(/[^0-9+]/g, '');
  if (cleaned.startsWith('+')) return cleaned;
  if (cleaned.length === 10) return `+1${cleaned}`;
  if (cleaned.length === 11 && cleaned.startsWith('1')) return `+${cleaned}`;
  if (cleaned.length > 0) return `+${cleaned}`;
  return null;
}

// Send an outbound SMS to a customer using the app's Twilio credentials.
// Returns true on success, false on any failure (so callers can log + move on).
// Calls the Twilio REST API directly — the npm SDK throws
// "Unsupported cache mode: default" under Deno.
export async function sendSmashieSms(to, body, audit = {}) {
  const record = async (patch) => {
    if (audit.base44 && audit.logId) await audit.base44.asServiceRole.entities.SmsDeliveryLog.updateMany(
      { id: audit.logId, status: 'pending' },
      { $set: { ...patch, status_at: new Date().toISOString() } }
    );
  };
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const from = Deno.env.get('TWILIO_PHONE_NUMBER');

  if (!accountSid || !authToken || !from) {
    console.error('sendSmashieSms: Twilio credentials not set — SMS skipped');
    await record({ status: 'failed', reason: 'Twilio credentials are missing' });
    return false;
  }

  const normalizedTo = normalizePhone(to);
  if (!normalizedTo) {
    console.warn(`sendSmashieSms: invalid phone "${to}" — SMS skipped`);
    await record({ status: 'skipped', reason: 'Invalid phone number' });
    return false;
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams({
      From: from,
      To: normalizedTo,
      Body: body,
    });
    if (audit.logId) params.set('StatusCallback', `https://taste-isle-express.base44.app/functions/twilioSmsStatus?log_id=${encodeURIComponent(audit.logId)}`);
    const auth = btoa(`${accountSid}:${authToken}`);
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error(`sendSmashieSms: failed to send to ${normalizedTo}: Twilio ${res.status} ${text}`);
      let details = {};
      try { details = JSON.parse(text); } catch { /* Non-JSON Twilio failure. */ }
      await record({ status: 'failed', reason: String(details.message || text).slice(0, 1000), error_code: String(details.code || res.status) });
      return false;
    }
    const data = await res.json();
    await record({ status: data.status || 'queued', message_sid: data.sid });
    console.log(`sendSmashieSms: sent to ${normalizedTo} (sid ${data.sid})`);
    return true;
  } catch (err) {
    console.error(`sendSmashieSms: failed to send to ${normalizedTo}:`, err.message);
    await record({ status: 'failed', reason: err.message });
    return false;
  }
}

// Pre-written Smashie-toned order-status SMS bodies.
export const smashieSmsTemplates = {
  // Fired right after payment is confirmed.
  confirmed: (order) =>
    `Flavor Isle: Hey ${order.customer_name || 'fam'}! Order #${order.order_number} is locked in — the crew's firing the grill right now. We'll text you the second it's ready. 🔥`,

  // Fired when the order hits the kitchen.
  preparing: (order) =>
    `Flavor Isle: Order #${order.order_number} just hit the grill! 🔥 The crew's cooking it up fresh — we'll text you the second it's ready.`,

  // Fired when the order hits ready-for-pickup.
  ready: (order) => {
    const line = order.order_type === 'delivery'
      ? `We're rolling it your way ${order.delivery_address ? 'to ' + order.delivery_address : 'now'}`
      : `Slide through Flavor Isle — 103 N Main St, Smiths Grove whenever you're ready`;
    return `Flavor Isle: Order #${order.order_number} is READY, fam! 🍔 Bag sealed, fries hot, vibes immaculate. ${line}. Questions? (270) 563-4618`;
  },

  // Fired when the order is fully wrapped / completed.
  completed: (order) =>
    `Flavor Isle: Order #${order.order_number} is all wrapped — hope you ate good! 🍔 Thanks for rolling with us, fam. We'd love to see you back soon. Questions? (270) 563-4618`,
};