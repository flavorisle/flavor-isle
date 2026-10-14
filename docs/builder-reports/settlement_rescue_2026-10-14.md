# Issue #107 — Settlement rescue (order-number payment lookup) + webhook-build deviation repairs

Date: 2026-10-14
Approved: Wesley, by email reply, Oct 14 2026 ~4:43 PM CT ("Approved" to the 4:36 PM CT proposal email)
Dispatch: attempt 2 — attempt 1 completed only step 5 (the retroactive #106 report). Steps 1–4, 6–7 were
executed in this attempt, exactly as the pre-plan specifies.
Base commit this build's diff was made against: **`bd9eeae216a85db6c9e0edc547218b58602c9753`** ("Secure webhook
endpoint with token validation", 2026-10-14 21:49:11Z — see "Commit hash" below).

## What this fixes

Today's stranded payments happened because the inline card form sends the processor the ORDER NUMBER while
every settlement and retry path searched by an INVOICE NUMBER the form never sends, so a payment whose
browser confirmation was lost could never be found again. After this build the confirmation page, the nightly
cleanup, the hourly sweeper and the admin Retry button can all find card-form payments by the order number
the form actually sent. Combined with webhook #106 (live, verifier secret armed), every web-order payment
path is covered: instant server-to-server confirmation, plus self-healing lookups within the hour if that
confirmation is ever missed.

---

## Step 1 — `base44/shared/helcimCheckout.ts`: order-number payment lookup added

New export `helcimPaymentsForOrderNumber()` inserted immediately after the closing brace of
`helcimPaymentsForInvoice` and before `helcimPaymentByTransaction` — comment now at line 149, `export` at
line 155, in the file's existing "Reading the payment back" section. Nothing else changed in this file for
this step.

```ts
// The rescue path for inline card-form payments: the form posts the order
// number, not an invoice number, so the invoice lookup above finds nothing even
// when the payment landed. This asks the processor for the transactions that
// name this order. If the API ignores the filter and returns unrelated
// transactions, the consistency check below empties the result — fail safe,
// never a false match.
export async function helcimPaymentsForOrderNumber(orderNumber: string) {
  const data = await helcimRequest(`/card-transactions?orderNumber=${encodeURIComponent(orderNumber)}`);
  return unwrap(data)
    .filter((payment: any) => String(payment?.orderNumber ?? '').trim() === String(orderNumber).trim())
    .filter((payment: any) => String(payment?.status || '').toUpperCase() === 'APPROVED')
    .filter((payment: any) => !payment?.currency || String(payment.currency).toUpperCase() === 'USD')
    .map((payment: any) => ({
      transactionId: String(payment.transactionId || payment.id || ''),
      amountCents: Math.round(Number(payment.amount || payment.total || 0) * 100),
      tipCents: Math.round(Number(payment.tipAmount || payment.tip || 0) * 100),
      currency: String(payment.currency || 'USD').toUpperCase(),
      createdAt: payment.dateCreated || payment.createdAt || '',
    }));
}
```

**Byte-for-byte check:** this block's MD5 in the file (`b439dadea1c1c03901c4fdea95c998cc`, 20 lines /
1311 chars including the trailing newline) is identical to the MD5 of the code block in issue #107 step 1.

## Step 2 — `base44/shared/helcimCheckout.ts`: `helcimCheckoutTotals` gains the rescue fallback

Signature now at line 187. Replaced exactly the signature and the first two statements of the body; the
`let payments` binding is the only word changed in them.

```ts
export async function helcimCheckoutTotals(
  invoiceNumber: string,
  expectedCents: number,
  suppliedTransactionId?: string,
  orderNumber?: string,
) {
  let payments = suppliedTransactionId
    ? [await helcimPaymentByTransaction(suppliedTransactionId)].filter(Boolean)
    : await helcimPaymentsForInvoice(invoiceNumber);

  // Inline card-form payments carry no invoice number: rescue by the order
  // number the form sent. Only reached when the invoice lookup found nothing,
  // so web-checkout orders are never disturbed.
  if (!suppliedTransactionId && orderNumber && (payments as any[]).length === 0) {
    payments = await helcimPaymentsForOrderNumber(orderNumber).catch(() => []);
  }
```

Everything from `const approved = …` — now line 204 — to the end of the function is UNCHANGED, confirmed by
the diff: the hunks end at the close of the rescue block and no line below it is touched. The existing safety
rules are untouched: exact-to-the-cent amount match, one payment per order, ambiguous results reported for a
human rather than settled.

**Byte-for-byte check:** this block's MD5 in the file (`ad6bf3e3c215db8a3bf44e2f99245d6f`, 16 lines /
700 chars including the trailing newline) is identical to the MD5 of the code block in issue #107 step 2.

Full diff of the two shared files:

```diff
--- a/base44/shared/helcimCheckout.ts
+++ b/base44/shared/helcimCheckout.ts
@@ -146,6 +146,27 @@ export async function helcimPaymentsForInvoice(invoiceNumber: string) {
     }));
 }
 
+// The rescue path for inline card-form payments: the form posts the order
+// number, not an invoice number, so the invoice lookup above finds nothing even
+// when the payment landed. This asks the processor for the transactions that
+// name this order. If the API ignores the filter and returns unrelated
+// transactions, the consistency check below empties the result — fail safe,
+// never a false match.
+export async function helcimPaymentsForOrderNumber(orderNumber: string) {
+  const data = await helcimRequest(`/card-transactions?orderNumber=${encodeURIComponent(orderNumber)}`);
+  return unwrap(data)
+    .filter((payment: any) => String(payment?.orderNumber ?? '').trim() === String(orderNumber).trim())
+    .filter((payment: any) => String(payment?.status || '').toUpperCase() === 'APPROVED')
+    .filter((payment: any) => !payment?.currency || String(payment.currency).toUpperCase() === 'USD')
+    .map((payment: any) => ({
+      transactionId: String(payment.transactionId || payment.id || ''),
+      amountCents: Math.round(Number(payment.amount || payment.total || 0) * 100),
+      tipCents: Math.round(Number(payment.tipAmount || payment.tip || 0) * 100),
+      currency: String(payment.currency || 'USD').toUpperCase(),
+      createdAt: payment.dateCreated || payment.createdAt || '',
+    }));
+}
+
 export async function helcimPaymentByTransaction(transactionId: string) {
@@ -167,11 +188,19 @@ export async function helcimCheckoutTotals(
   invoiceNumber: string,
   expectedCents: number,
   suppliedTransactionId?: string,
+  orderNumber?: string,
 ) {
-  const payments = suppliedTransactionId
+  let payments = suppliedTransactionId
     ? [await helcimPaymentByTransaction(suppliedTransactionId)].filter(Boolean)
     : await helcimPaymentsForInvoice(invoiceNumber);
 
+  // Inline card-form payments carry no invoice number: rescue by the order
+  // number the form sent. Only reached when the invoice lookup found nothing,
+  // so web-checkout orders are never disturbed.
+  if (!suppliedTransactionId && orderNumber && (payments as any[]).length === 0) {
+    payments = await helcimPaymentsForOrderNumber(orderNumber).catch(() => []);
+  }
+
   const approved = (payments as any[]).filter((payment) => {
--- a/base44/shared/helcimSettlement.ts
+++ b/base44/shared/helcimSettlement.ts
@@ -18,7 +18,7 @@
-  const totals = await helcimCheckoutTotals(order.id, expectedCents, transactionId || undefined);
+  const totals = await helcimCheckoutTotals(order.id, expectedCents, transactionId || undefined, String(order.order_number || ''));
@@ -74,7 +74,7 @@
-  const totals = await helcimCheckoutTotals(merchOrder.id, expectedCents, transactionId || undefined);
+  const totals = await helcimCheckoutTotals(merchOrder.id, expectedCents, transactionId || undefined, String(merchOrder.order_number || ''));
```

Diffstat: `base44/shared/helcimCheckout.ts` 30 insertions / 1 deletion · `base44/shared/helcimSettlement.ts`
2 insertions / 2 deletions · `src/pages/OAuthConsent.jsx` 338 deletions.

## Step 3 — `base44/shared/helcimSettlement.ts`: the order number is passed (2 lines)

Line 21, food orders:

```ts
  const totals = await helcimCheckoutTotals(order.id, expectedCents, transactionId || undefined, String(order.order_number || ''));
```

Line 77, merch orders:

```ts
  const totals = await helcimCheckoutTotals(merchOrder.id, expectedCents, transactionId || undefined, String(merchOrder.order_number || ''));
```

No other change to this file — the only two lines of the diff are these two call sites.

## Step 4 — `src/pages/OAuthConsent.jsx` deleted (restores build #104's approved state)

The webhook build resurrected this 338-line unrouted boilerplate file via commit `ec852f8` ("chore: add
boilerplate auth templates"). It is deleted entirely. Verified before deleting: `grep -rn "OAuthConsent"
src/` returned only the file's own `export default function OAuthConsent() {` — nothing imports it and no
route points at it. No other file was changed to compensate.

## Step 5 — `docs/builder-reports/card_payment_webhook_2026-10-14.md` (retroactive #106 report)

Completed in attempt 1, committed by the platform's repository sync as `058bea368671f2f1b083ebcedb17a5329157c721`
("Implement card payment webhook endpoint") and `bd9eeae216a85db6c9e0edc547218b58602c9753` ("Secure webhook
endpoint with token validation", which added the arming update: delivery URL registered, `HELCIM_WEBHOOK_SECRET`
stored, signature gate live — 401 on unsigned posts, 401 on forged signatures). Contents match what this step
asked for.

## Step 6 — Build, verify, publish

- `npm run build` → **exit code 0**. Log clean apart from the pre-existing `caniuse-lite` data-age notice.
- TypeScript: the project has **no `tsconfig.json`** and the build script is `vite build`, which transpiles
  with esbuild and does not type-check, so no type-check step produced errors. (`npx tsc --noEmit` cannot run
  for lack of a tsconfig — noted here so the record is exact rather than claiming a check that never ran.)
  The changed files are Deno shared modules, outside the Vite bundle graph.
- The two changed shared files were diff-verified byte-for-byte against the issue's blocks (hashes in steps
  1 and 2), so no hand-editing deviation is possible.
- **Publish:** the app is published from the editor's Publish control, which is the owner's action — the
  builder cannot press it from chat. Everything it needs is in place: the build is green and the change set
  is exactly the four files below.

## Step 7 — this report

`docs/builder-reports/settlement_rescue_2026-10-14.md`, documenting steps 1–6 as above.

---

## Every file changed

| File | Change |
| --- | --- |
| `base44/shared/helcimCheckout.ts` | modified — step 1 (new `helcimPaymentsForOrderNumber`), step 2 (`helcimCheckoutTotals` 4th argument + rescue fallback) |
| `base44/shared/helcimSettlement.ts` | modified — step 3 (the two `helcimCheckoutTotals` call sites pass the order number) |
| `src/pages/OAuthConsent.jsx` | **deleted** — step 4 (338 lines, restored to build #104's approved state) |
| `docs/builder-reports/card_payment_webhook_2026-10-14.md` | created — step 5 (retroactive #106 report, attempt 1) |
| `docs/builder-reports/settlement_rescue_2026-10-14.md` | created — step 7 (this report) |

Nothing else changed anywhere, per the issue's scope: `git status --short` shows only the two modified shared
files and the one deletion; `base44/functions/`, `base44/entities/` and `base44/workflows/` report **0** changed
paths. `cardPaymentWebhook` was not touched in this build, no webhook or secret setting was changed, and
`cleanupStaleOrders`, `autoSyncUnpushedOrders`, `settleHelcimWebPayment`, `helcimJsResult`, the admin retry UI,
every page and component, and all menus/schemas are untouched — they inherit the rescue through the shared
helpers. No entity/schema change. No npm dependency change.

## Commit hash

- **Base commit for this build's diff: `bd9eeae216a85db6c9e0edc547218b58602c9753`** — the head of the repository
  at the moment the rescue edits were made, and the tree the diff above is against.
- The rescue build's own commit is the repository sync commit created for this change set; it is the child of
  `bd9eeae216a85db6c9e0edc547218b58602c9753` and can be read with `git log --oneline -1` (or on GitHub) once
  the build's sync lands. The report itself is part of that same commit, so its own hash cannot be written
  inside it — recorded here as the base commit plus the rule for finding the child.

## Verification performed

- Issue #107 read in full from the GitHub API (raw body plus the attempt-1 verification comment) before any edit.
- Both inserted/replaced blocks hashed against the issue's own code blocks: identical
  (`b439dadea1c1c03901c4fdea95c998cc` and `ad6bf3e3c215db8a3bf44e2f99245d6f`).
- `git diff` reviewed hunk by hunk: the only changes are the two blocks above and the two call-site lines.
- `grep -rn "OAuthConsent" src/` before deletion: no importers, no route.
- `git status --short -- base44/functions base44/entities base44/workflows` → 0 paths.
- `npm run build` → exit 0.
- No orders placed, no payments made, no test data created, no secret or settings change, no webhook change.