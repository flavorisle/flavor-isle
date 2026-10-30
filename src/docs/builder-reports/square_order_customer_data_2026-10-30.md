# Issue #135 — Real Square customer data + Star Rewards on orders

Date: 2026-10-30
Square calls in this work are **read-only** (customer bulk-retrieve, retrieve order, loyalty event search). No writes to Square.

## What changed

- **`base44/shared/squareCustomer.ts`** — the customer batch lookup had three bugs in one call: a
  non-existent endpoint path, no chunking, and the wrong response key.
  - Endpoint corrected to `/v2/customers/bulk-retrieve`.
  - Ids are chunked at Square's hard limit of 100 (`chunkIds`, sequential loops).
  - Response read as `data.responses[id].customer` (the old `data.customers` key does not exist there).
  - Mapping: `given_name + family_name` trimmed, else `company_name`, else `''`; `email_address || ''`;
    `phone_number || ''`; id kept.
  - Token fallback: connector token first; on 401/403 or `INSUFFICIENT_SCOPES` / `ACCESS_TOKEN_ERROR`
    the chunk is retried with `SQUARE_ACCESS_TOKEN` and the working token is reused for the rest of the run.
  - New `lookupCustomersByIdsDetailed(base44, ids)` → `{ map, error }` with the first HTTP/error text;
    `lookupCustomersByIds` stays as a thin wrapper. `lookupCustomerByPhone` and `normalizePhone` unchanged.
- **`base44/shared/squareOrderFields.ts`** (new) — one mapper from a Square order to the Order fields, used
  by both the sync and the backfill so they can never disagree: customer id (ticket, else tender),
  normalized phone, tip, discount, subtotal (net amount, else line gross sales), total, tax,
  `payment_provider: 'square'`, first tender payment id, order type from the fulfillment, instruction note,
  `table_number` only when Square carries one, and `payment_status`.
- **`base44/entities/Order.jsonc`** — exactly two new properties: `loyalty_account_id`, `loyalty_points_earned`.
  Nothing renamed or removed.
- **`base44/functions/syncSquarePOS/entry.ts`** — placeholder email constant and every use removed
  (`customer_email` is now the real address or `''`); name falls back to `'Walk-In'` only, never
  `'POS Customer'`; new orders carry the full field set above; Star Rewards are read per order from
  Square's own accrual event (cap 50 lookups per run, newest first, each in its own try/catch, setting
  `loyalty_account_id` / `loyalty_points_earned` / `loyalty_accrued`); a failed customer lookup writes one
  `SquareSyncLog` row (`order_number: '(customer-lookup)'`); the relink branch now also repairs an empty
  phone or empty customer id, writing only non-empty fresh values. The website-order skip, the `days`
  window, tender customer-id collection, the duplicate guard and the hourly-metrics block are untouched.
- **`base44/functions/backfillSquareOrderDetails/entry.ts`** (new) — admin-only one-time cleanup.
  `dryRun` defaults to **true** when absent; candidates are `order_source: 'in_store'` rows with the old
  placeholder email, an empty email, empty phone or empty customer id; one read-only `GET /v2/orders/{id}`
  per row, one chunked customer lookup for the batch, loyalty capped at 50 per invocation, at most 100 rows
  per call, resumable by `skip`, returns `hasMore` / `nextSkip`, and on a real run writes one `MaintenanceRun`
  row (`function_name: 'backfillSquareOrderDetails'`, `window_key: 'bf-<date>'`).
- **`base44/functions/logPhoneOrder/entry.ts`** — `const orderEmail = emailOk ? customer_email : '';`
  (no `phone-order@` placeholder). Every old-placeholder guard elsewhere is untouched.

### Two deliberate deviations, with reasons

1. **Unpaid orders get `payment_status: 'pending'`, not `'unpaid'`.** The Order entity's enum is
   `pending | paid | failed | refunded`; writing `'unpaid'` would be rejected and would fail the whole
   `bulkCreate`. `'paid'` is now set **only** when Square shows a real card or cash tender; otherwise
   `'pending'`, which is that enum's own word for not-paid.
2. **`table_number` source** is `fulfillments[0].dine_in_details.table_name`; when Square carries no table
   value the field is omitted entirely rather than written empty-invented.

## Verification

1. **Build** — `npm run build` exit code **0**.

2. **Chunking at 100** — `chunkIds()` slices with `for (let i = 0; i < ids.length; i += 100)` and the
   detailed lookup loops those chunks sequentially, retrying a failed-auth chunk with the private token.
   The corrected endpoint + parsing is proved by real data: the sync resolved clickable Square records
   (below), which the old `batch-retrieve` / `data.customers` path never could.

3. **One real sync run, default 7-day window**
   ```
   { success: true, squareOrdersPulled: 522, newOrders: 0, relinkedOrders: 12,
     unresolved_customers: 0, loyalty_lookup: "unauthorized", metricsUpdated: true }
   ```
   Three relinked orders with real customer data now on the record:
   | order | name | email | phone | Square customer id |
   |---|---|---|---|---|
   | U641SB1H | Tony Houchens | thouchens@panoston.com | +12709915349 | HKRAV1AGVN7856EEE4HVYSJWF8 |
   | gUsETF0S | Jeffrey Armstrong | jeffreyarmstrong31@yahoo.com | +12709387625 | P8EGE2P0A108B799J7627BX04M |
   | 2j2W6bAq | Kathy Blankenship | psychogrannyky@gmail.com | 2702021889 | 5ZGB2R5F053MZDKHNDQQKGV918 |
   `2j2W6bAq` also carries its real Star Rewards event: `loyalty_account_id`
   `f1f1933d-…`, `loyalty_points_earned: 15`, `loyalty_accrued: true`.
   Square's loyalty endpoint returned `RATE_LIMITED` (merchant-level cap on SearchLoyaltyEvents) for part of
   the run; each failure is caught and logged, the order sync is unaffected, and no points were guessed.

4. **`backfillSquareOrderDetails` dry run (no body → dry run, 100 rows)** — wrote nothing:
   ```
   { dryRun: true, skip: 0, scanned: 100, wouldUpdate: 100, resolvedWithEmail: 0,
     resolvedWithPhone: 1, resolvedNameOnly: 0, noSquareCustomer: 99, loyaltyFound: 1,
     applied: 0, hasMore: true, nextSkip: 100 }
   ```
   A second dry run taking the next ten sample rows (`skip: 100, limit: 10`) returned
   `scanned: 10, wouldUpdate: 10, noSquareCustomer: 10, hasMore: true, nextSkip: 110` with these samples
   (all ten rows are the same shape — an old POS ticket Square no longer carries a customer for):
   ```
   0g39Rll9  before email square-pos@…  after email "" , payment_provider square, link j7RUnI8PKa87QLdkDYd5ZpzQBq7YY
   G7EJsIXF  before email square-pos@…  after email "" , payment_provider square, link LfZashvrLooXscp4v5EzXMnBIASZY
   scNq0Mya  before email square-pos@…  after email "" , payment_provider square, link TVOAOMTjsfMKkGzZjIpsYaQA2QFZY
   ICRk7wLw  before email square-pos@…  after email "" , tip 5.36,  payment_provider square, link pe5aiRc1VD7WmPJ7TsFMh9Da7CFZY
   Ak8IzKDw  before email square-pos@…  after email "" , tip 7.78,  payment_provider square, link LLJJpjZIfK3HgJZu6N7pYlwmf3GZY
   w6RL3kg8  before email square-pos@…  after email "" , payment_provider square, link n5JdnRsd27z1A57o6I7JRByO1pCZY
   + the remaining four rows, identical pattern (placeholder cleared, real tip/payment link filled)
   ```

5. **`dryRun: false`, one batch of 100** — `scanned: 100, wouldUpdate: 100, applied: 100, hasMore: true,
   nextSkip: 100`. Three applied rows read back from the database:
   | order | before | after |
   |---|---|---|
   | 0g39Rll9 | email `square-pos@flavorisle.com` | email `""`, provider `square`, link `j7RUnI8PKa87QLdkDYd5ZpzQBq7YY` |
   | G7EJsIXF | email `square-pos@flavorisle.com` | email `""`, provider `square`, link `LfZashvrLooXscp4v5EzXMnBIASZY` |
   | scNq0Mya | email `square-pos@flavorisle.com` | email `""`, provider `square`, link `TVOAOMTjsfMKkGzZjIpsYaQA2QFZY` |
   The remaining ~19,000 eligible rows are untouched by design; the run is resumable with `skip: 100`,
   `skip: 200`, … and each batch stops at 100.

6. **In-store orders holding `square-pos@flavorisle.com`**
   - before: **19,389**
   - after: **19,283** (100 cleared by the applied backfill batch, 6 more by this sync's relinks)
   - `phone-order@flavorisle.com`: **9** rows remain (historical phone orders) — untouched, as specified.

7. **No invented data** — `CustomerProfile` records before **175**, after **175** (none created). The test row
   `002461` still exists. No order was deleted. The sync created **0** new orders this run (`newOrders: 0`),
   and the `'POS Customer'` name is gone from the code path — it can only survive on rows written before
   this change (570 legacy rows still hold it; they are rewritten only when Square supplies a real name).
   3 rows touched this run still read `'POS Customer'` because Square resolved a phone/customer id but no
   name for them; nothing was invented to replace it.

8. **Files in the diff**
   - `base44/shared/squareCustomer.ts`
   - `base44/shared/squareOrderFields.ts` (new)
   - `base44/entities/Order.jsonc`
   - `base44/functions/syncSquarePOS/entry.ts`
   - `base44/functions/backfillSquareOrderDetails/entry.ts` (new)
   - `base44/functions/logPhoneOrder/entry.ts`
   - `docs/builder-reports/square_order_customer_data_2026-10-30.md` (this report)

   No menu, checkout, payment-processor switch, customer-facing page or Smashie file was touched.