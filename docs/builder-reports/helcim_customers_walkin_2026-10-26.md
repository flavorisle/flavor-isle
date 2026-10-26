# Issue #123 — Helcim residue removal, Customers order history, walk-in card/loyalty attribution

Built Oct 26, 2026 against issue flavorisle/flavor-isle#123 (sections A–C). No menu changes, no test orders, no customer-facing page or checkout changes, no changes to the Wix/Square payment switch. `base44/entities/Order.jsonc` and `base44/entities/MerchOrder.jsonc` were left untouched (A5).

Files changed (8 code files + this report):

```
base44/shared/phoneOrderPricing.test.ts
base44/functions/paySquareOrder/entry.ts
base44/functions/cleanupStaleOrders/entry.ts
base44/entities/SmashieSettings.jsonc
base44/shared/pulseDirectory.ts
base44/functions/searchCustomerDirectory/entry.ts
src/components/admin/CustomerProfilePanel.jsx
base44/functions/syncSquarePOS/entry.ts
```

---

## Section A — Helcim residue removal

### A1. `base44/shared/phoneOrderPricing.test.ts` (line 32)

- Before: `assert.equal(isPhoneOrder({ payment_provider: 'helcim' }), true);`
- After: `assert.equal(isPhoneOrder({ payment_provider: 'square' }), true);`

Nothing else in the file changed. The assertion still proves the same behavior with a live provider value.

### A2. `base44/functions/paySquareOrder/entry.ts` (double-charge guard)

Deleted exactly one line from the guard condition:

```
    order.helcim_checkout_id ||
```

The comment above the guard is unchanged, and the remaining two conditions are intact:

```ts
if (
  order.square_payment_link_id ||
  (order.payment_provider && order.payment_provider !== 'square')
) {
```

### A3. `base44/functions/cleanupStaleOrders/entry.ts` (lines 90–95)

Deleted the entire `else if (order.helcim_checkout_id)` branch, including its two comment lines and its `kept.push`/`continue`. The following branch is unchanged and now receives old card-path orders:

```ts
} else if (!isPhoneOrder(order)) {
  kept.push({ order_number: order.order_number, reason: 'not an online card order — left to its own flow' });
  continue;
}
```

Old card-path orders therefore land on the identical untouched outcome.

### A4. `base44/entities/SmashieSettings.jsonc`

`phone_payment_provider` enum:

- Before: `["wix", "square", "stripe", "helcim"]`
- After: `["wix", "square", "stripe"]`

`web_payment_provider` enum:

- Before: `["wix", "square", "stripe", "helcim"]`
- After: `["wix", "square", "stripe"]`

Both field descriptions: `stripe and helcim are retired values kept so historical records stay valid` → `stripe is a retired value kept so historical records stay valid`. No other description text changed, and both defaults remain `"wix"`.

Verified after the write: the file parses as JSON, neither enum contains `helcim`, and the string `helcim` no longer appears anywhere in the file.

### A5. Order / MerchOrder schemas

Untouched, as instructed. Their `helcim` enum value and their `helcim_checkout_id` / `helcim_transaction_id` fields still carry old-order receipt history, the same way the kept `stripe` fields do.

### A6. Live SmashieSettings record (`6a7fd236b64dc1a4c8de4ae0`)

Both provider switches held the stale, inert value `helcim` before this change. This is a core-settings change, reported here as the owner asked.

| Field | Before | After |
|---|---|---|
| `phone_payment_provider` | `helcim` | `wix` |
| `web_payment_provider` | `helcim` | `wix` |

Record `updated_date` before the change: `2026-10-17T19:59:49.328000`. No other field on the record was written.

Follow-on confirmation: `getWebPaymentProvider` still answers `{"provider":"wix"}`.

### A7. HELCIM_* secrets

Five HELCIM entries are still configured on the app, and they are **not removable from the build environment** — the tooling available here can declare secrets but cannot delete one. They must be deleted by hand:

1. `HELCIM_WEBHOOK_SECRET`
2. `HELCIM_JS_TOKEN`
3. `HELCIM_JS_SECRET`
4. `HELCIM_ACCOUNT_ID`
5. `HELCIM_API_KEY`

Where: the app's Dashboard → **Secrets** page (Application Secrets). Nothing in this build reads them: the live-code sweep below shows zero code references.

**Removed by this build: none.** No HELCIM secret was deleted.

---

## Section B — Customers admin page: order history was empty

Root cause as written in the issue: the history lookup queried one key (local `CustomerProfile` id against `Order.customer_id`) that checkout never writes, so it matched nothing and never tried the keys that do match (normalized phone, email). Pulse rows also carry an empty `normalized_phone` with the raw number in `phone`.

### B1. `base44/shared/pulseDirectory.ts`

Added `e164Phone(raw)` and used it in `mapPulseCustomer` as `normalized_phone: row?.normalized_phone || e164Phone(row?.phone)`.

Derivation, exactly as specified: strip non-digits; 10 digits → `+1`; 11 digits starting with `1` → `+`; otherwise → `+`. `+13607429809` from Pulse's raw phone field becomes `+13607429809`, the form the live Order records store. A present `normalized_phone` is used unchanged.

### B2. `base44/functions/searchCustomerDirectory/entry.ts`

The single-key `orderQuery` block was replaced with a merge over every available key:

- Candidate keys: normalized phone (digits/`+` preserved), lowercased trimmed email, and the local profile id when a profile was found.
- Each non-empty key runs its own filtered query — `{ normalized_phone: key }`, `{ customer_email: key }`, `{ customer_id: key }` — sorted `-created_date`, limit 25, each wrapped in `.catch(() => [])`.
- Results are merged, deduped by record id, sorted newest first, capped at 25. That list is `orders`; `orders_truncated` is true when the deduped count reached 25.
- `stats` is computed from the merged, pre-cap set and added to the response (nothing else in the response shape changed):
  - `online_orders` — orders whose `order_source` is not `in_store`
  - `in_store_orders` — orders whose `order_source` is `in_store`
  - `online_total_spent` / `in_store_total_spent` — sum of `total` over **non-cancelled** orders in each bucket, to 2 decimals
  - `first_order_date` / `last_order_date` — min/max `created_date`

The profile lookup block above it (by id, then by email) is unchanged, and the directory-search half of the function is unchanged.

Live check (read-only, no orders created): `searchCustomerDirectory` for Samantha Olson (`samantha.olson16@icloud.com`) returned her **3 real orders** — `386862` (online/completed/$66.90), `256458` (online/cancelled/$66.90), `182000` (online/cancelled/$65.28) — where it previously returned zero, with `stats = { online_orders: 3, online_total_spent: 66.90, in_store_orders: 0, in_store_total_spent: 0, first_order_date: 2026-10-21T23:09:42.421000, last_order_date: 2026-10-21T23:13:07.245000 }`.

One note for the owner: B2's formula counts every non-in-store order, so cancelled ones are included in the order **counts** (3), while the **totals** exclude them ($66.90). Two of Samantha's three orders are cancelled, which is why Section D's note reads "1 online order". If the tiles should exclude cancelled orders from the counts too, that is a one-line change in `searchCustomerDirectory`.

### B3. `src/components/admin/CustomerProfilePanel.jsx`

The history response's `stats` is now kept in panel state, and the four tiles read from `state.stats` when present, falling back to the existing `customer.*` values when absent (`const statSource = state.stats || customer;`). Same four labels, same `$` + 2-decimal formatting. No markup, styling, or other behavior changed.

### B4. Regression check

`grep -rn "searchCustomerDirectory" src` returns exactly two callers, as expected:

```
src/pages/AdminCustomers.jsx:29
src/components/admin/CustomerProfilePanel.jsx:19
```

---

## Section C — Walk-in attribution

All C work is inside `base44/functions/syncSquarePOS/entry.ts`.

### C1. Customer collection widened

The `customerIdSet` build now collects `so.tenders[].customer_id` in addition to `so.customer_id`, before the order loop, so the existing single `lookupCustomersByIds` batch covers those ids too. The helper's call shape is unchanged.

### C2. Per-order resolution cascade

1. (a) `so.customer_id` — unchanged, first choice.
2. (b) The first non-empty `so.tenders[].customer_id` when (a) is empty.
3. (c) When both are empty, `POST /v2/loyalty/events/search` with `{ query: { filter: { order_filter: { order_id: <so.id> } } }, limit: 30 }`, taking the first returned event's `loyalty_account_id`, then `GET /v2/loyalty/accounts/<id>` → `account.customer_id`. Headers match the rest of the file (Bearer token, `Square-Version: 2026-09-16`). Account lookups are cached in a per-run `Map`, so a repeat customer costs one call. Because a loyalty-resolved customer was on no ticket and so was never in the batch, their record is fetched once through `lookupCustomersByIds` and added to the in-memory map, so the order gets the real name/email.
4. (d) A 403 on either loyalty endpoint sets `loyaltyUnauthorized`, skips the loyalty step for the rest of the run, adds `loyalty_lookup: "unauthorized"` to the response, and continues. The sync never fails over loyalty.

The resolved id feeds the existing write path unchanged: `customerMap` lookup → real name, real email (phone→web-account join via `phoneToEmail` first), real phone. Orders that resolve to nobody stay exactly as today — `Walk-In`, placeholder email, still counted as unlinked.

### C3. Silent-degradation guard

Orders whose ticket or tender referenced a customer id that produced no record from the batch lookup are counted, reported as `unresolved_customers` in the response JSON, and the affected Square customer ids are written to `console.error`.

### C4. Backfill support

The handler now reads `{ days }` from the request body (`await req.json().catch(() => ({}))`), defaulting to 7 and clamped to 1–30, and uses it for the SearchOrders `since` window. Scheduled runs send no body and keep 7 days. **The one-time `days: 30` run was not executed** — the owner runs it manually after verification.

### C5. Untouched

The website-push skip (`metadata.order_source === 'flavor-isle-website'`), hourly metrics computation, `bulkCreate` record shapes, the relink branch itself, location resolution, and pagination all stay as they were.

---

## Section D — Verification performed

| Check | Result |
|---|---|
| `grep -ri helcim` across `base44/` + `src/` code files | Only `base44/entities/Order.jsonc` and `base44/entities/MerchOrder.jsonc` (kept history). Zero live code references. Repo-wide it also appears in `docs/builder-reports` and `.git` commit logs, which are historical. |
| `searchCustomerDirectory` for Samantha Olson | Returns her 3 real orders plus the computed `stats` (see B2). Previously zero. |
| `getWebPaymentProvider` | `{"provider":"wix"}` |
| Admin panel stat tiles | Read from the computed `stats` when present, `customer.*` as fallback |
| Frontend build | `vite build` completes with no errors |
| Manual `syncSquarePOS` run | **Not run.** The owner's build instruction was that no sync backfill runs automatically; the `days: 7` verification run (and the one-time `days: 30` relink) remain manual. |

## Still open for the owner

1. Delete the five `HELCIM_*` secrets on Dashboard → Secrets (A7).
2. Run `syncSquarePOS` manually once with `{ "days": 30 }` to relink the rest of October, then confirm `unresolved_customers` and the Unlinked counter in Admin → Customers.
3. Decide whether the two order **count** tiles should exclude cancelled orders (see the B2 note).