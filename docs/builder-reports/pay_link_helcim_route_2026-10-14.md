# Issue #105 — Pay-link fix: `/pay/<order>` routes to the Helcim payment page

Date: 2026-10-14
Approved: Wesley, by email, Oct 14 2026 (issue #105, flavorisle/flavor-isle)
Verified by: code reading, the exact before/after diff, and a production build only — **no test orders were
placed, and no card was charged.**

The short pay link in every texted payment link (`flavor-isle.com/pay/<order>`) no longer renders the
retired Square card form. It now forwards to the site's own Helcim payment page, the same one the website
checkout uses, carrying the order's own number.

---

## Step 1 — `src/pages/PayPhoneOrder.jsx` replaced (the only code file touched)

Exact diff (committed version → now), produced with `diff -u`:

```diff
--- src/pages/PayPhoneOrder.jsx (before)
+++ src/pages/PayPhoneOrder.jsx (after)
@@ -1,15 +1,16 @@
 import React from 'react';
-import { useParams } from 'react-router-dom';
+import { Navigate, useParams } from 'react-router-dom';
 import PayPhoneDemo from '@/components/pay/PayPhoneDemo';
-import SquarePayPage from '@/components/pay/SquarePayPage';
 
-// The page behind the short payment link Smashie texts (/pay/<order>).
-// The customer sees their order, picks a tip, and pays with Square's card form
-// embedded right here — they never leave flavor-isle.com.
+// The page behind the short payment link Smashie texts (/pay/<order>). It opens
+// the site's own Helcim payment page — the same one the website checkout uses —
+// carrying this order's number. The customer sees their order, picks a tip when
+// the order does not carry one yet, and pays in the Helcim card fields, all on
+// flavor-isle.com. The retired Square form is no longer reached from any link.
 export default function PayPhoneOrder() {
   const { orderNumber } = useParams();
 
   if (orderNumber === 'demo') return <PayPhoneDemo />;
 
-  return <SquarePayPage orderNumber={orderNumber} tipEnabled />;
+  return <Navigate to={`/pay?order_number=${encodeURIComponent(orderNumber)}`} replace />;
 }
\ No newline at end of file
```

Checks on the replacement:

| Check | Result |
| --- | --- |
| File content matches the code block in issue #105 | yes, verbatim |
| `SquarePayPage` references in this file | 0 |
| `Navigate` imported and used | yes, `<Navigate … replace />` |
| `/pay/demo` branch | preserved, unchanged |
| Redirect target | `/pay?order_number=<order>` (number URL-encoded) |
| Line count | 15 → 16 (5-line comment replaced by a 6-line one) |
| Trailing newline | none, exactly as the previous version had none |

## Step 2 — #104 BuilderReport moved to the standard folder

Moved `src/docs/builder-reports/oauth_consent_removal_2026-10-14.md` →
`docs/builder-reports/oauth_consent_removal_2026-10-14.md`.

Pure move: the file's content was re-written at the standard path byte-for-byte as it stood, and the copy
under `src/docs/` was deleted. No content edits, no other file in either folder touched.

| Check | Result |
| --- | --- |
| New path exists | `docs/builder-reports/oauth_consent_removal_2026-10-14.md` (2133 bytes) |
| Old path | gone (`No such file or directory`) |
| Content | unchanged (same report text, headings, tables) |

## Step 3 — Zero other changes (verified)

- `src/App.jsx` unchanged — `const PayPhoneOrder = lazy(() => import('./pages/PayPhoneOrder'));` and
  `<Route path="/pay/:orderNumber" element={<PayPhoneOrder />} />` are exactly as before.
- `PayCard.jsx`, `InlineCardFields.jsx`, `Checkout.jsx` — untouched (the #103 double-tip gate on
  `PayCard.jsx` line 70 and `base44/shared/helcimPayableOrder.ts` remain exactly as deployed).
- `src/components/pay/SquarePayPage.jsx` and `src/components/pay/SquareCardForm.jsx` — still in the
  codebase, simply no longer reached from `/pay/<order>`.
- All `base44/functions/*`, all `base44/shared/*.ts`, workflows, entities, secrets and settings —
  untouched. No menu, category, price, tax, ticket, phone/SMS or admin change. No new dependency.

## Step 4 — Build

`npx vite build` — **exit code 0**. No unresolved imports, no Rollup errors, and no warnings beyond the
pre-existing `caniuse-lite`/browserslist data-age notice the build has always printed. No warning about
the changed file.

## Step 5 — Publish

The app's source is in the deployable state for this build; publishing it live is done by the owner with
the **Publish** button at the top of the app editor (the builder has no publish action of its own). This
is recorded here rather than assumed: at the time this report was filed the button had not been pressed,
so the fix reaches customers when it is pressed.

## Expected behavior after this build (from issue #105)

| Case | Behavior |
| --- | --- |
| `/pay/123456` | redirects to `/pay?order_number=123456` — the Helcim payment page |
| `/pay/demo` | unchanged (`PayPhoneDemo`) |
| Phone order (no stored tip) | tip picker + Helcim card fields |
| Web checkout order with a stored tip | tip not asked again (#103 fix preserved); the saved total is charged |
| Paid / cancelled orders | existing guards unchanged |
| Square orders | none pending — every Square order on file is cancelled, so no order loses its payment path |

## Files

Changed: `src/pages/PayPhoneOrder.jsx` (replaced, per issue #105).

Moved: `src/docs/builder-reports/oauth_consent_removal_2026-10-14.md` →
`docs/builder-reports/oauth_consent_removal_2026-10-14.md`.

Added: `docs/builder-reports/pay_link_helcim_route_2026-10-14.md` (this report).

Deleted: nothing else. `src/pages/OAuthConsent.jsx` remains deleted as of #104.

## Verification performed

- Issue #105 and its code block read in full before any change.
- `diff -u` of the committed page against the new one (above).
- Grep checks on the new file (0 `SquarePayPage` hits) and on `src/App.jsx` (route still wired).
- Move confirmed on both paths.
- `npx vite build`: exit code 0, clean log.
- No orders placed, no payments made, no test data created.

## Open note (outside this work order, not changed)

The issue #103 report is still filed at `src/docs/builder-reports/pay_page_double_tip_fix_2026-10-14.md`.
This work order moved only the #104 report, so it was left where it is; say the word and it can be moved to
`docs/builder-reports/` the same way.