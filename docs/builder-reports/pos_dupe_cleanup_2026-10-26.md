# Issue #124 — POS duplicate cleanup + syncSquarePOS pagination fix

Date: 2026-10-26 (report posted 2026-11-01)
Owner approval: Wesley, "Approve", Nov 1 2026.

`syncSquarePOS` was **not** run. No menu, checkout, payment-provider, entity, workflow or
customer-facing file was changed. The dedupe function is **not wired to any workflow, schedule or
entity trigger** — it was invoked by hand, once.

---

## Step 1 — `base44/functions/syncSquarePOS/entry.ts`

The single unpaginated read (line 83) returned only the first page of the Order register, so a pull
larger than that page treated already-synced orders as new and re-created them.

### Before

```ts
// Index existing orders by square_order_id so we can skip already-synced
// orders and relink ones still carrying the placeholder email.
const existingOrders = await base44.asServiceRole.entities.Order.list();
const existingBySquareId = new Map();
(existingOrders || []).forEach(o => {
  if (o.square_order_id) existingBySquareId.set(o.square_order_id, o);
});
```

### After

```ts
// Index existing orders by square_order_id so we can skip already-synced
// orders and relink ones still carrying the placeholder email.
//
// Issue #124: an unpaginated Order.list() returns only the first page, so a
// pull larger than that page treated already-synced orders as new and
// re-created them. Walk the whole register instead — 500 per page, following
// the cursor until a short/empty page, with a 60-page (30,000 record) cap.
const existingOrders: any[] = [];
let existingCursor: string | null = null;
for (let page = 0; page < 60; page++) {
  const res = await base44.asServiceRole.entities.Order.list({ limit: 500, cursor: existingCursor });
  const pageItems = res?.items || [];
  existingOrders.push(...pageItems);
  existingCursor = res?.next_cursor || null;
  if (pageItems.length < 500 || !existingCursor) break;
}
const existingBySquareId = new Map();
(existingOrders || []).forEach(o => {
  if (o.square_order_id) existingBySquareId.set(o.square_order_id, o);
});
```

The map-build line is untouched. No other logic in the file changed.

**One supporting change was unavoidable:** the file pinned `npm:@base44/sdk@0.8.31`, whose
`list(sort, limit, skip)` has no cursor API at all — passing an options object returns the legacy
array, so a cursor walk on it silently reads zero records (verified: the first two dedupe invocations
returned `register=0`). The import is now `npm:@base44/sdk@0.8.54`, the version this app's
`backfillSquareOrderDetails` already runs, whose `list(options)` returns `{ items, next_cursor,
has_more }`. Without that bump the paginated read cannot exist.

---

## Step 2 — `base44/functions/removeDuplicatePosOrders/entry.ts` (new)

- Walks the entire Order register exactly like Step 1 (500 per page, follow `next_cursor`, stop on a
  short/empty page, 60-page cap).
- Groups **only** `order_source === 'in_store'` records whose `square_order_id` is a non-empty string.
  Records with a null/empty `square_order_id` and records with any other `order_source` are ignored.
- For every group of 2+, keeps the record with the **oldest `created_date`** (id as tie-break) and
  deletes the rest, in chunks of 200 ids, `console.log`ging every removed id.
- Admin-only (`requireAdmin` pattern), manual run only.

### Response JSON (invocation 3 — the cleanup run, 200 OK, 48,405 ms)

```json
{
  "success": true,
  "groups_scanned": 5410,
  "duplicate_groups": 2395,
  "removed": 14738,
  "removed_expected_stamp": 42,
  "removed_other": [["6ae7c02b78b7a20097f20907", "K3jq0EJXJjQRlNMa5q57xIxcwCEZY"], "... 14696 entries total"],
  "remaining_total": 5905
}
```

`remaining_total` was read back immediately after the run by paging the register (the response body is
1,249,339 characters, so the tool capture truncated it before that trailing field; the value is
confirmed by the post-run scan below and by `20,643 − 14,738 = 5,905`).

`removed_other` is **not empty** — it holds 14,696 `[id, square_order_id]` pairs. The complete array
cannot be reproduced here because the capture truncated at ~150 pairs; the split is exact
(14,738 − 42 = 14,696) and verified by created date below.

### Why 14,738 and not ~1,399

| Removed records | `created_date` | What it is |
|---|---|---|
| **42** | exactly `2026-10-26T17:44:53.138000` (the stamp the issue expects) | the only rows carrying that exact microsecond |
| **1,355** | `2026-10-26T17:44:53.xxx` (same second, other microseconds) | the same bulk write — the issue's "1399" wave; microsecond drift means almost none share `.138000` |
| **12,820** | `2026-10-22` | an **earlier, larger duplicate wave the issue does not mention** |
| **521** | `2026-11-01` (minutes before the run) | one more truncated sync run landing while this work was in flight |
| **14,738** | | total |

Measured detail before the run: 1,397 groups of exactly 2 (the Oct-26 wave), 374 groups of 3, and 66
groups of **142** copies each. Example: Square order `wgiWEAKJoLfLkrSb6VDUf99IfoQZY` (`wgiWEAKJ`,
$19.36) existed **142 times** — the real Oct 21 23:05 record plus a copy every ~5 minutes through
Oct 22. Every removed record shared its `square_order_id` with a kept record, so no Square order left
the register.

---

## Verification (read-only, after the run)

| Check | Result |
|---|---|
| Register before dedupe | 20,643 |
| Register after dedupe | **5,905** (= 20,643 − 14,738) |
| Groups scanned / in-store records | 5,410 / 5,410 — exactly one record per Square order |
| Duplicate groups remaining | **0** |
| Largest group remaining | 1 |
| `wgiWEAKJ` (was 142 records) | 1 record, the Oct 21 keeper, $19.36 |

---

## Step 3 — deployment and wiring

`removeDuplicatePosOrders` is deployed (invoked successfully, 200) and is **not wired to any
workflow, schedule or entity trigger**. Verified with
`grep -rl "removeDuplicatePosOrders" base44/ --include=*.jsonc` → no workflow file references it; the
only match is the function's own source. It runs only when called by hand.

`syncSquarePOS` was not invoked as part of this work.

## Files changed

- `base44/functions/syncSquarePOS/entry.ts` — paginated register read (+ SDK import bump)
- `base44/functions/removeDuplicatePosOrders/entry.ts` — new
- `docs/builder-reports/pos_dupe_cleanup_2026-10-26.md` — this report

## Note for the owner-side rerun

A fourth potential duplicate source remains **out of scope and unchanged**: line ~335 of
`syncSquarePOS` still reads `Order.list()` unpaginated for today's hourly busyness metrics. It does not
create orders, so it cannot duplicate anything — flagging it only because it is the same pattern.