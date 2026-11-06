# Bounce safety net + Smashie email read-back — GitHub issue #159, Parts 4 and 5

**Approved by:** Wesley, Nov 5 2026 8:49 PM CT ("Approved with phone read back")
**Issue:** GitHub #159 (Parts 1–3 landed earlier under `checkout_email_typo_guard_2026-11-05` and were not touched)
**Build:** `npm run build` → exit 0
**Not done, on purpose:** no customer email sent, no webhook registered, no test order placed. Menu, pricing, loyalty, kitchen tickets, checkout and `base44/shared/sendOrderStatusSms.ts` are untouched.

## Part 4 — new function `base44/functions/resendBounceWebhook/entry.ts`

Public endpoint (no `requireAdmin`). Resend posts a bounce here; the function tells Wesley, once per order, with enough detail to phone the customer.

- **Signature:** when `RESEND_WEBHOOK_SECRET` is present it verifies the svix headers (`svix-id`, `svix-timestamp`, `svix-signature`) — HMAC-SHA256 over `id.timestamp.body` using the base64 key after the `whsec_` prefix, compared against the `v1,` entries — and answers **401** on a mismatch. With the secret absent it logs one `console.warn` and keeps processing.
- **Events:** only types starting with `email.bounced` are handled; anything else returns `200 { ok: true, ignored: true }`.
- **Order match:** for every address in `data.to`, the newest `Order` whose `customer_email` matches case-insensitively and whose `created_date` is inside the last 14 days. No match → ignored.
- **One alert per order, ever:** an order whose `email_bounce_alerted_at` is already set is ignored; otherwise that field is stamped with now *before* the alert goes out, then one email is sent to `wesleyrbooker1@gmail.com` via Resend (`RESEND_API_KEY`, `User-Agent` header, from `Wesley Booker <wesley@order.flavor-isle.com>`), subject `ALERT: customer email bounced — order #<number>`.
- **Alert body:** customer name, order number, phone (or "no phone on the order"), the bounced address, the bounced email's subject from the payload, the order total, the order time in CT, and the fix-first line `Call <phone> to confirm the order, and fix the address on the order if they give you a new one.`
- **Profile note:** one line `Email bounced <date>: <address>` appended to that customer's `CustomerProfile.notes` (matched by email, case-insensitive); skipped silently when no profile exists.
- **Failure shape:** never throws out of the handler — errors are logged and answered `200 { ok: false }`.

### Entity change — `base44/entities/Order.jsonc` only

Added one field: `email_bounce_alerted_at` (`type: string`, `format: date-time`). Every other property, the `required` list and all RLS rules are byte-for-byte unchanged; no other entity was touched.

### Final function, verbatim

```ts
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
```

## Part 5 — `base44/agents/smashie.jsonc`

One rule added, in plain language, directly after the PHONE ORDERING block and before CUSTOMER EMAIL RESOLUTION. Nothing else in the agent file changed: verified by parsing before and after — the instructions string is identical apart from this inserted paragraph, and every other key (tool configs, skills, memory, voice, model, greetings) is byte-identical.

### Final read-back rule, verbatim

```
PHONE ORDER EMAIL READ-BACK:
After a caller gives an email address for a phone order, read it back to them before the order is placed — for example: 'let me read that back to you: j dot smith at gmail dot com — is that right?' — and correct it if the caller says no. Never place a phone order with an email the caller has not confirmed.
```

## Scope

Changed files: `base44/functions/resendBounceWebhook/entry.ts` (new), `base44/entities/Order.jsonc` (one field), `base44/agents/smashie.jsonc` (one rule), this report. Nothing was published; the function is not registered with Resend.