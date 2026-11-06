import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Issue #159 Parts 4 and 5 — bounce safety net (approved by Wesley Nov 5 2026
// 8:49 PM CT, "Approved with phone read back").
//
// Resend calls this endpoint when an email bounces. The only job here is to tell
// Wesley, with enough detail to phone the customer, and to note it on their
// profile. Nobody but Wesley is emailed from this function.

const ALERT_TO = 'wesleyrbooker1@gmail.com';
const ALERT_FROM = 'Wesley Booker <wesley@order.flavor-isle.com>';
const LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

function json(payload: any, status = 200) {
  return Response.json(payload, { status });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function base64Bytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// Svix signature: HMAC-SHA256 over "id.timestamp.body" with the base64 key that
// follows the whsec_ prefix. A missing secret is logged once and not enforced.
async function signatureValid(headers: Headers, rawBody: string) {
  const secret = Deno.env.get('RESEND_WEBHOOK_SECRET');
  if (!secret) {
    console.warn('RESEND_WEBHOOK_SECRET is not set — processing the Resend bounce event without signature verification.');
    return true;
  }
  const id = headers.get('svix-id');
  const timestamp = headers.get('svix-timestamp');
  const signature = headers.get('svix-signature');
  if (!id || !timestamp || !signature) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    base64Bytes(secret.replace(/^whsec_/, '')),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`));
  const expected = bytesBase64(new Uint8Array(mac));
  return signature.split(' ').some((entry) => {
    const parts = entry.split(',');
    return parts[0] === 'v1' && parts.slice(1).join(',') === expected;
  });
}

function ctTime(value: any) {
  if (!value) return 'unknown';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'unknown';
  return date.toLocaleString('en-US', {
    timeZone: 'America/Chicago',
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

// Newest order for this address inside the 14-day window, matched
// case-insensitively on the stored customer_email.
async function newestOrderFor(base44: any, address: string) {
  const cutoff = new Date(Date.now() - LOOKBACK_MS).toISOString();
  const page = await base44.asServiceRole.entities.Order.filter(
    {
      customer_email: { $regex: `^${escapeRegex(address)}$`, $options: 'i' },
      created_date: { $gte: cutoff },
    },
    { sort: '-created_date', limit: 1 },
  );
  return (page?.items || [])[0] || null;
}

async function sendAlert(order: any, address: string, bouncedSubject: string) {
  const phone = String(order.customer_phone || '').trim();
  const fixLine = phone
    ? `Call ${phone} to confirm the order, and fix the address on the order if they give you a new one.`
    : 'No phone on the order — reach the customer another way, and fix the address on the order if you get a new one.';
  const lines = [
    `Customer: ${order.customer_name || 'unknown'}`,
    `Order number: ${order.order_number || order.id}`,
    `Phone: ${phone || 'no phone on the order'}`,
    `Bounced address: ${address}`,
    `Bounced email subject: ${bouncedSubject || 'unknown'}`,
    `Order total: $${Number(order.total || 0).toFixed(2)}`,
    `Order placed: ${ctTime(order.created_date)} CT`,
    '',
    fixLine,
  ];

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
      'User-Agent': 'FlavorIsleBounceAlert/1.0',
    },
    body: JSON.stringify({
      from: ALERT_FROM,
      to: [ALERT_TO],
      subject: `ALERT: customer email bounced — order #${order.order_number || order.id}`,
      text: lines.join('\n'),
    }),
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    console.error('Bounce alert email failed:', response.status, await response.text());
  }
}

async function appendProfileNote(base44: any, address: string) {
  const page = await base44.asServiceRole.entities.CustomerProfile.filter(
    { email: { $regex: `^${escapeRegex(address)}$`, $options: 'i' } },
    { limit: 1 },
  );
  const profile = (page?.items || [])[0];
  if (!profile) return;

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  const line = `Email bounced ${today}: ${address}`;
  const existing = String(profile.notes || '').trim();
  await base44.asServiceRole.entities.CustomerProfile.update(profile.id, {
    notes: existing ? `${existing}\n${line}` : line,
  });
}

export default async function (req: Request) {
  try {
    if (req.method !== 'POST') return json({ ok: true, ignored: true });

    const rawBody = await req.text();
    if (!(await signatureValid(req.headers, rawBody))) {
      return json({ ok: false, error: 'Invalid signature' }, 401);
    }

    const event = JSON.parse(rawBody || '{}');
    const type = String(event?.type || '');
    if (!type.startsWith('email.bounced')) return json({ ok: true, ignored: true });

    const data = event?.data || {};
    const recipients = Array.isArray(data.to) ? data.to : data.to ? [data.to] : [];
    const bouncedSubject = String(data.subject || '');
    const base44 = createClientFromRequest(req);

    for (const recipient of recipients) {
      const address = String(recipient || '').trim();
      if (!address) continue;

      const order = await newestOrderFor(base44, address);
      if (!order) continue;
      if (order.email_bounce_alerted_at) continue;

      // One alert per order, ever: claim it before sending.
      await base44.asServiceRole.entities.Order.update(order.id, {
        email_bounce_alerted_at: new Date().toISOString(),
      });
      await sendAlert(order, address, bouncedSubject);
      await appendProfileNote(base44, address);
    }

    return json({ ok: true });
  } catch (error: any) {
    console.error('resendBounceWebhook error:', error?.message || error);
    return json({ ok: false, error: String(error?.message || error) });
  }
}