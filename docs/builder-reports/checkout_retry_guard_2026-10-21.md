# Checkout retry guard — reopen pending order on resubmit (issue #113)

**Date:** 2026-10-21
**Issue:** flavorisle/flavor-isle #113 — "PRE-PLAN (Approved Oct 21): Checkout retry guard — reopen pending order on resubmit in createHelcimWebCheckout"
**Approval:** Wesley, Oct 21 2026 4:53 PM CT ("Approved"); full-detail proposal emailed to wesleyrbooker1@gmail.com (Resend 01a1607b-c79c-7bec-976d-930f27a288d2) 5:03 PM CT.
**Executed:** exactly the pre-plan as written — one file, one insert, nothing else.

---

## Why

Barry Craddock got two order records 38 seconds apart on Oct 21: **#688719** (4:04:49 PM CT, pending, payment never started, never synced, kitchen never alerted) abandoned beside paid **#727169** (4:05:27 PM CT, $18.35, Helcim txn 56968969, confirmed). Same retry pattern as James Thomas on Oct 20 (4 cancelled pending + 1 paid).

`Checkout.jsx` keeps its saved order in browser memory (`pendingOrder`) and already reopens it on a resubmit — but a page refresh or back-button wipes that memory, and the resubmit asks `createHelcimWebCheckout` for a new order, which always created one. The Oct 14 settlement rescue (#107, live) settles a PAID order the browser lost; it cannot prevent the duplicate from being created. This guard is the other half.

---

## Step 1 — Insertion in `base44/functions/createHelcimWebCheckout/entry.ts`

Placement: immediately before the existing comment line `// ── Persist the Order BEFORE opening a payable page ──`, i.e. after the existing `const chargeTotal = round2(pricing.total);` and `const customerLink = await customerLinkFields(...)` lines.

### Before (lines 131–135 of the original file)

```ts
    const chargeTotal = round2(pricing.total);
    const customerLink = await customerLinkFields(base44, { phone: customer?.phone, email: customer?.email });

    // ── Persist the Order BEFORE opening a payable page ──
    let order = null;
```

### After (inserted block sits between `customerLink` and the Persist comment)

```ts
    const chargeTotal = round2(pricing.total);
    const customerLink = await customerLinkFields(base44, { phone: customer?.phone, email: customer?.email });

    // ── Retry guard: a resubmit reopens the customer's own still-pending order ──
    // The checkout page loses its saved order on a refresh or back-button, so a
    // resubmit used to mint a second unpaid order for the same cart (Oct 21:
    // Barry Craddock — #688719 abandoned beside paid #727169). Before saving a
    // new order, look for THIS customer's own pending/unpaid Helcim order from
    // the last 10 minutes with the same item count and the same saved total,
    // and reopen that one instead. Fail-open: any lookup problem falls through
    // and creates a fresh order exactly as before.
    try {
      const guardPhone = customerLink.normalized_phone;
      const guardEmail = String(customer?.email || '').trim().toLowerCase();
      if (guardPhone || guardEmail) {
        const dupFilter = guardPhone
          ? { normalized_phone: guardPhone, status: 'pending', payment_status: 'pending' }
          : { customer_email: guardEmail, status: 'pending', payment_status: 'pending' };
        const recent = await base44.asServiceRole.entities.Order.filter(dupFilter, '-created_date', 20);
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        const match = (recent || []).find((o) =>
          o.payment_provider === 'helcim'
          && new Date(o.created_date).getTime() >= tenMinutesAgo
          && (o.items?.length || 0) === items.length
          && round2(Number(o.total)) === chargeTotal
        );
        if (match) {
          console.log(`createHelcimWebCheckout: retry guard — reopening pending order ${match.order_number} instead of creating a second order`);
          let reuseUrl = match.payment_url && String(match.payment_url).includes('/pay?order_number=')
            ? match.payment_url
            : null;
          if (!reuseUrl) {
            reuseUrl = helcimPayPageUrl(PAY_PAGE_ORIGIN, match.order_number, true);
            await base44.asServiceRole.entities.Order.update(match.id, { payment_url: reuseUrl });
          }
          return Response.json({
            provider: 'helcim',
            orderNumber: match.order_number,
            payment_url: reuseUrl,
            total: round2(Number(match.total)),
            smsConsentStored: true,
            reused: true,
          });
        }
      }
    } catch (guardError) {
      console.error('createHelcimWebCheckout: retry-guard lookup failed — creating a new order as before:', (guardError as Error).message);
    }

    // ── Persist the Order BEFORE opening a payable page ──
    let order = null;
```

The block is byte-for-byte the code given in issue #113. No other line in the file changed.

### Behaviour (as verified by reading the inserted code)

- Four conditions must all match before reuse: same customer (normalized phone, email fallback), still `status: pending` + `payment_status: pending`, `payment_provider: 'helcim'`, created within the last 10 minutes, same item count **and** same total to the cent. A changed cart (different total or item count) or an older attempt creates a fresh order exactly as before.
- Fail-open: the whole lookup is inside `try`, and the `catch` only logs — any lookup problem falls through to the normal create path. The guard can never block a checkout.
- The reuse path re-attaches the `/pay?order_number=` page only when the matched order has no `payment_url`; otherwise the saved one is returned unchanged.
- SMS consent is not re-upserted on reuse: it was captured with the first save of that same order.
- Response shape is identical to the create path plus `reused: true`, so `Checkout.jsx`'s existing `data?.orderNumber` handling opens the card form on the ORIGINAL order number with zero client changes.

---

## Step 2 — Build + verify

- `npx vite build` → **exit 0**. Full log (3 lines) contained only the pre-existing `Browserslist: browsers data (caniuse-lite) is 8 months old` notice. No errors, no resolve warnings.
- `git status --porcelain` → exactly one entry:
  ```
   M base44/functions/createHelcimWebCheckout/entry.ts
  ```
- `git diff --stat` → `1 file changed, 46 insertions(+)`, zero deletions.
- No test orders created. Verification was passive: build + code inspection, as the pre-plan requires.

### Confirmed untouched

- Menu, categories, items, prices — no changes.
- Kitchen tickets — no changes.
- All pages and components (including `Checkout.jsx`) — no changes.
- All other backend functions — no changes, in particular: `createSquareWebCheckout`, `settleHelcimWebPayment`, `helcimJsResult`, `cardPaymentWebhook`, `cleanupStaleOrders`, `autoSyncUnpushedOrders`.
- Entities, schemas, workflows — no changes.
- Styling — no changes.

`git status` proves this: only one file in the working tree differs from HEAD, and that file's diff is one 46-line insertion at a single point.

---

## Step 3 — BuilderReport

This file, plus BuilderReport entity entries with `report_key` = `checkout_retry_guard_2026-10-21`.

## Post-publish confirmation plan

Real-order confirmation is passive, after publish: watch settlement / order records for a customer who resubmits within 10 minutes of an abandoned pending Helcim order. Expected: the resubmit returns the ORIGINAL `order_number` with `reused: true`, logged as `createHelcimWebCheckout: retry guard — reopening pending order <number> instead of creating a second order`, and **no second pending order record appears**.