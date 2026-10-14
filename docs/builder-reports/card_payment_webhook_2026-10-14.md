# Issue #106 — Card payment webhook: Helcim confirms payments server-to-server

Date: 2026-10-14
Approved: Wesley, by chat, twice (issue #106, flavorisle/flavor-isle)
Verified by: build, an MD5 identity check against the issue's code block, and a live HTTP probe of the
deployed function only — **no test orders were placed, no card was charged, and nothing was settled.**

Today a payment only settled if the customer's own browser POSTed the result back; when that failed, the
money was taken and no kitchen ticket fired. The new `cardPaymentWebhook` function lets Helcim confirm a
card payment server-to-server, through the same settlement code the browser path already uses.

---

## Step 1 — `base44/functions/cardPaymentWebhook/entry.ts` created (the only file added)

7466 characters / 7512 bytes.

**Content identity:** the file's MD5 (`023a728af160bd…`, full value `023a728af160ddbae135cc5c895cf47f`) equals
the MD5 of the code block in issue #106 — byte-for-byte the content the issue specifies. The file ends at the
closing brace with no trailing newline, exactly as the issue's block renders.

The file's three imports resolve to already-exported helpers — nothing was added to any shared module:

| Import | Verified |
| --- | --- |
| `createClientFromRequest` from `npm:@base44/sdk@0.8.31` | same specifier 22 other functions in this app already use |
| `helcimPaymentByTransaction`, `helcimRequest` from `../../shared/helcimCheckout.ts` | both exported (2/2 found) |
| `settleHelcimCheckoutOrder`, `settleHelcimMerchOrder` from `../../shared/helcimSettlement.ts` | both exported (2/2 found) |

Full content of the new file:

```ts
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { helcimPaymentByTransaction, helcimRequest } from '../../shared/helcimCheckout.ts';
import { settleHelcimCheckoutOrder, settleHelcimMerchOrder } from '../../shared/helcimSettlement.ts';

// The server-to-server card payment webhook (issue #106). Helcim POSTs only
// {id, type:'cardTransaction'} — the headers carry an HMAC signature over
// `${webhook-id}.${webhook-timestamp}.${body}` made with the verifier token from
// the merchant's Helcim webhook settings. The webhook is never trusted alone:
// the transaction is read back from Helcim's API and only an APPROVED USD
// payment for the exact amount of exactly one open order settles anything,
// through the same settlement code the browser path uses. Declines, mismatches
// and ambiguity settle nothing and are logged for a human.
export default async function (req: Request) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('webhook-signature') || '';
    const timestamp = req.headers.get('webhook-timestamp') || '';
    const messageId = req.headers.get('webhook-id') || '';

    // ── Signature first: anything not signed by Helcim is refused ──
    const verifierToken = (Deno.env.get('HELCIM_WEBHOOK_SECRET') || '').trim();
    if (!verifierToken) {
      console.error('Card webhook: HELCIM_WEBHOOK_SECRET is not configured');
      return Response.json({ error: 'not configured' }, { status: 500 });
    }
    if (!signatureHeader || !timestamp || !messageId) {
      return Response.json({ error: 'missing webhook headers' }, { status: 401 });
    }
    let expectedSignature = '';
    try {
      const keyBytes = Uint8Array.from(atob(verifierToken), (c) => c.charCodeAt(0));
      const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const mac = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(`${messageId}.${timestamp}.${rawBody}`));
      expectedSignature = btoa(String.fromCharCode(...new Uint8Array(mac)));
    } catch (signError) {
      console.error('Card webhook: signature computation failed:', (signError as Error).message);
      return Response.json({ error: 'signature failure' }, { status: 401 });
    }
    const providedSignatures = signatureHeader.split(/\s+/).map((s) => s.split(',').pop() || '').filter(Boolean);
    if (!providedSignatures.includes(expectedSignature)) {
      console.warn(`Card webhook: signature mismatch (id ${messageId}) — ignored`);
      return Response.json({ error: 'invalid signature' }, { status: 401 });
    }

    // ── Payload: only the transaction id arrives ──
    let event: any = {};
    try { event = JSON.parse(rawBody); } catch { return Response.json({ ok: true }); }
    if (String(event?.type || '') !== 'cardTransaction' || !event?.id) {
      return Response.json({ ok: true });
    }
    const transactionId = String(event.id);

    // ── Read the transaction back — the webhook alone proves nothing ──
    const payment = await helcimPaymentByTransaction(transactionId).catch(() => null);
    if (!payment || payment.status !== 'APPROVED' || payment.currency !== 'USD') {
      console.log(`Card webhook: transaction ${transactionId} is not an approved USD payment (${payment?.status || 'unreadable'})`);
      return Response.json({ ok: true });
    }

    const base44 = createClientFromRequest(req);

    // ── Find the order. Primary: the order number carried on the transaction
    // record (the card form sends it). Fallback: among this merchant's own
    // open Helcim orders from the last two hours, exactly one whose stored
    // total matches the payment to the cent. Anything else is ambiguity —
    // logged, settled nothing, so a human looks rather than the code guessing.
    let orderNumberOnTransaction = '';
    try {
      const raw = await helcimRequest(`/card-transactions/${encodeURIComponent(transactionId)}`);
      const record = raw?.data || raw?.payment || raw;
      orderNumberOnTransaction = String(record?.orderNumber || '').trim();
    } catch (readError) {
      console.error(`Card webhook: could not read order number off transaction ${transactionId}:`, (readError as Error).message);
    }

    if (orderNumberOnTransaction) {
      const orders = await base44.asServiceRole.entities.Order
        .filter({ order_number: orderNumberOnTransaction }, '-created_date', 10)
        .catch(() => []);
      const order = (orders || []).find((o: any) => o.payment_provider === 'helcim') || null;
      const merchOrders = await base44.asServiceRole.entities.MerchOrder
        .filter({ order_number: orderNumberOnTransaction }, '-created_date', 10)
        .catch(() => []);
      const merchOrder = (merchOrders || [])[0] || null;
      if (order || merchOrder) {
        try {
          if (merchOrder) {
            await settleHelcimMerchOrder(base44, merchOrder, transactionId);
            console.log(`Card webhook: merch order ${orderNumberOnTransaction} settled from transaction ${transactionId}`);
          } else if (order) {
            const settled = await settleHelcimCheckoutOrder(base44, order, transactionId);
            console.log(`Card webhook: order ${orderNumberOnTransaction} settled from transaction ${transactionId} (payment_status=${settled?.payment_status})`);
          }
          return Response.json({ ok: true });
        } catch (settleError) {
          console.error(`Card webhook: settling ${orderNumberOnTransaction} from transaction ${transactionId} failed:`, (settleError as Error).message);
          return Response.json({ ok: true });
        }
      }
      console.warn(`Card webhook: transaction ${transactionId} names order ${orderNumberOnTransaction} but no open order carries that number`);
      return Response.json({ ok: true });
    }

    // ── Fallback: match by exact amount among recent open Helcim orders ──
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const recentOrders = await base44.asServiceRole.entities.Order.list('-created_date', 60).catch(() => []);
    const candidates = (recentOrders || []).filter((o: any) =>
      o.payment_provider === 'helcim' &&
      o.payment_status !== 'paid' &&
      o.status !== 'cancelled' &&
      !o.pay_cash_on_pickup &&
      o.created_date && new Date(o.created_date).getTime() > twoHoursAgo &&
      Math.round(Number(o.total) * 100) === payment.amountCents - payment.tipCents,
    );
    if (candidates.length === 1) {
      try {
        const settled = await settleHelcimCheckoutOrder(base44, candidates[0], transactionId);
        console.log(`Card webhook: order ${candidates[0].order_number} settled by exact amount from transaction ${transactionId} (payment_status=${settled?.payment_status})`);
      } catch (settleError) {
        console.error(`Card webhook: settling ${candidates[0].order_number} from transaction ${transactionId} failed:`, (settleError as Error).message);
      }
      return Response.json({ ok: true });
    }
    console.warn(`Card webhook: transaction ${transactionId} (${payment.amountCents}c) matched ${candidates.length} open orders — left for a human: ${candidates.map((o: any) => o.order_number).join(', ')}`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Card webhook error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}
```

## Step 2 — #103 BuilderReport: already in the standard folder, so nothing was moved

Step 2 asked for `src/docs/builder-reports/pay_page_double_tip_fix_2026-10-14.md` →
`docs/builder-reports/pay_page_double_tip_fix_2026-10-14.md`. When this work order ran, that was already the
state on disk:

| Check | Result |
| --- | --- |
| `docs/builder-reports/pay_page_double_tip_fix_2026-10-14.md` | present (4650 bytes, Oct 14 19:02 UTC) — "Issue #103 — Double-tip fix on reopened /pay links" |
| `src/docs/builder-reports/` | empty (0 entries) — no copy left behind anywhere (`find` for `pay_page_double_tip*` returns only the standard-folder path) |

Because the file already sat at the standard path with nothing left behind, no file operation was needed and
none was performed — no write, no edit, no delete, so the content is untouched by construction.

Correction for the record: the #105 report's closing note claimed this report was still under `src/docs/`.
That note was wrong — it was already in `docs/builder-reports/`. Nothing in the older report was edited as
part of this work order.

## Step 3 — Zero other changes

- **No existing file modified.** `helcimCheckout.ts`, `helcimSettlement.ts`, `helcimJsResult`,
  `createHelcimCardForm`, `createHelcimWebCheckout`, `settleHelcimWebPayment`, `autoSyncUnpushedOrders`,
  every page and component, the menu, checkout, the kitchen tickets, the phone/SMS flows, entities,
  workflows and settings: untouched.
- No new npm dependency: the only import added anywhere is `npm:@base44/sdk@0.8.31`, already used by 22
  other functions in this app.
- No secrets, no settings, no Helcim dashboard change made from this side. `HELCIM_WEBHOOK_SECRET` is
  deliberately left to the owner (issue #106).
- `src/pages/PayPhoneOrder.jsx`, `PayCard.jsx` and the #103 double-tip gate: untouched.

## Step 4 — Build

`npx vite build` — **exit code 0**. No unresolved imports, no Rollup errors, and no warnings at all beyond
the pre-existing `caniuse-lite`/browserslist data-age notice. Nothing was reported about the new file.

(Backend functions are not part of the Vite bundle — they deploy to the function runtime, which is what
step 5 probed.)

## Step 5 — Deployed and answering on the custom domain

The function is deployed and live:

| Probe (2026-10-14 21:44 UTC) | Result |
| --- | --- |
| `GET https://flavor-isle.com/functions/cardPaymentWebhook` | **HTTP 500** — `{"error":"not configured"}` |
| Function name rule | `cardPaymentWebhook` contains no `Helcim` substring, satisfying Helcim's URL requirement |
| Behaviour of that answer | exactly the fail-closed state issue #106 predicts: no `HELCIM_WEBHOOK_SECRET` stored yet, so the function refuses everything and can settle nothing |

The platform's own function tester refuses to invoke it until the secret is declared ("missing required
secrets: HELCIM_WEBHOOK_SECRET"), which is consistent with the issue: the builder does not create or touch
secrets, and the live probe above already proves the deployment.

## Owner-side setup checklist (Helcim dashboard, from issue #106 step 6)

1. Helcim dashboard → **All Tools → Integrations → Webhooks**.
2. Turn the webhook **ON**.
3. **Deliver URL:** `https://flavor-isle.com/functions/cardPaymentWebhook`
4. Tick **"Card Transaction Processing"**.
5. **Save.**
6. Copy the **Verifier Token** and store it as the app secret **`HELCIM_WEBHOOK_SECRET`**.

Until step 6 is done the endpoint keeps answering `500 not configured` — it fails closed, and no forged
event can settle an order.

## Expected behavior (from issue #106)

| Case | Behavior |
| --- | --- |
| Approved payment whose browser result also arrives | no double settlement (`settleHelcimCheckoutOrder` returns early when `payment_status` is `paid`) |
| Approved payment whose browser result never arrives | the webhook settles the order, records the transaction id, kitchen push and emails fire exactly once |
| Declined payment | logs, settles nothing |
| Signature mismatch / forged POST | 401, nothing happens |
| Ambiguity (two recent open orders with the same total, no order number on the transaction) | nothing settles; a warning names the candidates for a human |
| Retries | Helcim re-delivers for 10 hours until this function answers 2xx |

## Files

Added: `base44/functions/cardPaymentWebhook/entry.ts` · `docs/builder-reports/card_payment_webhook_2026-10-14.md` (this report).

Moved: none — step 2 was already satisfied on disk.

Changed / deleted: none.

## Verification performed

- Issue #106 read in full from the GitHub API (the raw body, not the rendered page) before anything was
  written, including steps 2–6 and the checklist.
- MD5 identity check of the written file against the issue's own code block: identical
  (`023a728af160ddbae135cc5c895cf47f`).
- Grep of both shared modules to confirm the four imported helpers are already exported (2/2 each).
- Move state checked on both paths, plus a `find` across the repo.
- `npx vite build`: exit code 0, clean log.
- Live HTTP probe of the deployed function on the custom domain: 500 `not configured` (fail-closed).
- No orders placed, no payments made, no test data created, no settings changed. (The verifier-token secret was added later that evening, by Wesley's approval — see the update below.)

---

## Update — 2026-10-14 21:48 UTC: delivery URL registered, token stored, endpoint armed

Wesley registered the delivery URL in the Helcim dashboard (`https://flavor-isle.com/functions/cardPaymentWebhook`,
"Card Transaction Processing" on) and approved storing the verifier token as `HELCIM_WEBHOOK_SECRET`. The
endpoint moved from "not configured" onto the signature gate, which is the proof the token is live in the
function's environment:

| Probe | Before the token | Now |
| --- | --- | --- |
| Unsigned `GET` / `POST` on the function URL | 500 `{"error":"not configured"}` | **401 `{"error":"missing webhook headers"}`** |
| `POST` with a forged `webhook-signature` header | — | **401 `{"error":"invalid signature"}`** — a forged or unsigned delivery settles nothing |
| Platform function tester on `cardPaymentWebhook` | refused: missing `HELCIM_WEBHOOK_SECRET` | **401 `missing webhook headers`** in 51 ms, no logs emitted — same gate, no side effects |

Nothing else changed: no file edited, no order created, no test data, nothing settled, no payment made.

Still unverified, and only a real delivery can verify it: an actual Helcim-signed event arriving and settling
an order. That happens on the next real card payment — the function's own log lines
(`Card webhook: order … settled from transaction …`, plus the ambiguity warning that names the candidates)
are where it shows.