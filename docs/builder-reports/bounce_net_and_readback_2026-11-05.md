# Bounce safety net + Smashie email read-back — GitHub issue #159, Parts 4 and 5

**Approved by:** Wesley, Nov 5 2026 8:49 PM CT ("Approved with phone read back")
**Issue:** GitHub #159 (Parts 1–3 landed earlier under `checkout_email_typo_guard_2026-11-05` and were not touched)
**Build:** `npm run build` → exit 0
**Live status:** fixed and verified against the deployed function — responses quoted below.
**Not done, on purpose:** no customer email sent, no webhook registered with Resend, no test order placed. Menu, pricing, loyalty, kitchen tickets, checkout and `base44/shared/sendOrderStatusSms.ts` are untouched.

## The shipped bug and its fix

The first version of `resendBounceWebhook` looked up orders with a compound operator query
(`customer_email: { $regex, $options }`, `created_date: { $gte }`) plus an options object
(`{ sort, limit }`). The Base44 SDK rejected that call with **"Request failed with status code 400"**,
which is a data-layer rejection, not a Resend error — so the Order write was never reached, no stamp
was set, and no alert left the function.

What changed:

1. **Order lookup is plain equality only** — `Order.filter({ customer_email: address })`, no operators,
   no sort, no date filter. The newest row inside the 14-day window is chosen in plain JavaScript, with a
   case-insensitive compare on the stored address.
2. **The stamp is written after the alert email succeeds**, so a failed email leaves no stamp and the
   next bounce retries the same order.
3. **`CustomerProfile` lookup is plain equality too** — `CustomerProfile.filter({ email: address })`,
   matched in JS, and skipped entirely when nothing matches. A profile failure never blocks the alert.
4. **Every step has its own try/catch** and `console.error('<step> failed: …')`, so the runtime log names
   the call that broke.
5. **The JSON response carries a `stage`** naming the last stage reached: `received`, `order_lookup`,
   `already_alerted`, `alert_email`, `order_stamp`, `profile_note`, `done`. The handler always answers
   **HTTP 200 JSON**, including on failure.

## Live verification (deployed function, real payload)

`POST` body, sent exactly as given:

```json
{"type":"email.bounced","data":{"to":["whitneyb510@gmail.clm"],"subject":"Order locked in — #871625","email_id":"verification-test"}}
```

### Invocation 1 — HTTP 200

```json
{"ok": true, "stage": "done", "order_number": "871625", "email_id": "01a1af32-5b58-7b7d-b71c-45a036b61e35", "profile_note": "noted"}
```

Resend accepted the alert (`email_id` above), the alert went to `wesleyrbooker1@gmail.com` with subject
`ALERT: customer email bounced — order #871625`, and order #871625 (`6aed1b1f53d48687c0b0acd8`) now carries
`email_bounce_alerted_at = 2026-11-06T04:51:15.468Z`.

### Invocation 2 — same payload, HTTP 200

```json
{"ok": true, "stage": "already_alerted", "message": "already alerted", "already_alerted": true, "order_number": "871625"}
```

No second email, no rewrite of the stamp.

## Part 4 — `base44/functions/resendBounceWebhook/entry.ts`

Public endpoint (no `requireAdmin`), serving the flow above. Signature handling is unchanged: when
`RESEND_WEBHOOK_SECRET` is present it verifies the svix headers (`svix-id`, `svix-timestamp`,
`svix-signature`) — HMAC-SHA256 over `id.timestamp.body` with the base64 key after the `whsec_` prefix,
compared against the `v1,` entries — and refuses a mismatch. With the secret absent it logs one warning and
keeps processing.

The alert body names the customer, order number, phone (or "no phone on the order"), the bounced address,
the bounced email's subject, the order total and the order time in CT, and ends with the fix-first line
`Call <phone> to confirm the order, and fix the address on the order if they give you a new one.`

### Entity change — `base44/entities/Order.jsonc` only

Added one field: `email_bounce_alerted_at` (`type: string`, `format: date-time`). Every other property, the
`required` list and all RLS rules are unchanged.

### Final function, verbatim

```ts
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Issue #159 Parts 4 and 5 — bounce safety net (approved by Wesley Nov 5 2026
// 8:49 PM CT, "Approved with phone read back").
//
// Resend calls this endpoint when an email bounces. The only job here is to tell
// Wesley, with enough detail to phone the customer, and to note it on their
// profile. Nobody but Wesley is emailed from this function.
//
// Nov 5 2026 fix: the first version looked orders up with `$regex`/`$gte`
// operators and an options object, which the SDK rejected with
// "Request failed with status code 400". Every lookup is now a plain equality
// query and all narrowing happens in plain JavaScript. Each step has its own
// try/catch and the response names the last `stage` reached.

const ALERT_TO = 'wesleyrbooker1@gmail.com';
const ALERT_FROM = 'Wesley Booker <wesley@order.flavor-isle.com>';
const LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;

function json(payload: any) {
  return Response.json(payload, { status: 200 });
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
// follows the whsec_ prefix. A missing secret is logged and not enforced.
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

// Plain equality only, then the newest row inside the 14-day window in JS.
function pickNewestOrder(rows: any[], address: string) {
  const cutoff = Date.now() - LOOKBACK_MS;
  const matches = (Array.isArray(rows) ? rows : []).filter(
    (row) => String(row?.customer_email || '').trim().toLowerCase() === address.toLowerCase(),
  );
  const fresh = matches.filter((row) => {
    const time = new Date(row.created_date).getTime();
    return Number.isFinite(time) && time >= cutoff;
  });
  fresh.sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime());
  return fresh[0] || null;
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

  const text = await response.text();
  if (!response.ok) throw new Error(`Resend ${response.status}: ${text}`);
  let emailId = '';
  try {
    emailId = String(JSON.parse(text)?.id || '');
  } catch {
    emailId = '';
  }
  return emailId;
}

async function appendProfileNote(base44: any, address: string) {
  const rows = await base44.asServiceRole.entities.CustomerProfile.filter({ email: address });
  const profile = (Array.isArray(rows) ? rows : rows?.items || []).find(
    (row: any) => String(row?.email || '').trim().toLowerCase() === address.toLowerCase(),
  );
  if (!profile) return 'no_profile';

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' });
  const line = `Email bounced ${today}: ${address}`;
  const existing = String(profile.notes || '').trim();
  await base44.asServiceRole.entities.CustomerProfile.update(profile.id, {
    notes: existing ? `${existing}\n${line}` : line,
  });
  return 'noted';
}

export default async function (req: Request) {
  let stage = 'received';
  try {
    if (req.method !== 'POST') return json({ ok: true, stage, ignored: true });

    const rawBody = await req.text();
    if (!(await signatureValid(req.headers, rawBody))) {
      return json({ ok: false, stage: 'signature', error: 'Invalid signature' });
    }

    const event = JSON.parse(rawBody || '{}');
    const type = String(event?.type || '');
    if (!type.startsWith('email.bounced')) return json({ ok: true, stage, ignored: true });

    const data = event?.data || {};
    const recipients = Array.isArray(data.to) ? data.to : data.to ? [data.to] : [];
    const bouncedSubject = String(data.subject || '');
    const base44 = createClientFromRequest(req);

    for (const recipient of recipients) {
      const address = String(recipient || '').trim();
      if (!address) continue;

      stage = 'order_lookup';
      let order: any = null;
      try {
        const rows = await base44.asServiceRole.entities.Order.filter({ customer_email: address });
        order = pickNewestOrder(Array.isArray(rows) ? rows : rows?.items || [], address);
      } catch (error: any) {
        console.error('resendBounceWebhook order_lookup failed:', error?.message || error);
        return json({ ok: false, stage, error: String(error?.message || error) });
      }
      if (!order) continue;

      if (order.email_bounce_alerted_at) {
        return json({
          ok: true,
          stage: 'already_alerted',
          message: 'already alerted',
          already_alerted: true,
          order_number: order.order_number || order.id,
        });
      }

      stage = 'alert_email';
      let emailId = '';
      try {
        emailId = await sendAlert(order, address, bouncedSubject);
      } catch (error: any) {
        console.error('resendBounceWebhook alert_email failed:', error?.message || error);
        return json({ ok: false, stage, error: String(error?.message || error), order_number: order.order_number || order.id });
      }

      // Stamp only after the alert actually went out, so a failed send retries.
      stage = 'order_stamp';
      try {
        await base44.asServiceRole.entities.Order.update(order.id, {
          email_bounce_alerted_at: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error('resendBounceWebhook order_stamp failed:', error?.message || error);
        return json({ ok: false, stage, error: String(error?.message || error), order_number: order.order_number || order.id, email_id: emailId });
      }

      stage = 'profile_note';
      let note = '';
      try {
        note = await appendProfileNote(base44, address);
      } catch (error: any) {
        console.error('resendBounceWebhook profile_note failed:', error?.message || error);
        note = 'failed';
      }

      return json({
        ok: true,
        stage: 'done',
        order_number: order.order_number || order.id,
        email_id: emailId,
        profile_note: note,
      });
    }

    return json({ ok: true, stage: 'order_lookup', ignored: true, reason: 'No matching order for this address' });
  } catch (error: any) {
    console.error(`resendBounceWebhook ${stage} failed:`, error?.message || error);
    return json({ ok: false, stage, error: String(error?.message || error) });
  }
}
```

## Part 5 — `base44/agents/smashie.jsonc`

One rule added, in plain language, directly after the PHONE ORDERING block and before CUSTOMER EMAIL
RESOLUTION. Nothing else in the agent file changed: verified by parsing before and after — the instructions
string is identical apart from this inserted paragraph, and every other key (tool configs, skills, memory,
voice, model, greetings) is byte-identical.

### Final read-back rule, verbatim

```
PHONE ORDER EMAIL READ-BACK:
After a caller gives an email address for a phone order, read it back to them before the order is placed — for example: 'let me read that back to you: j dot smith at gmail dot com — is that right?' — and correct it if the caller says no. Never place a phone order with an email the caller has not confirmed.
```

## Scope

Changed files: `base44/functions/resendBounceWebhook/entry.ts` (new, then corrected), `base44/entities/Order.jsonc`
(one field), `base44/agents/smashie.jsonc` (one rule), this report. Nothing was published; the function is
not registered with Resend.