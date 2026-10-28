# BuilderReport — TOS Ownership & Operation section + duplicate Star Rewards removal

**Date:** October 28, 2026
**Issue:** flavorisle/flavor-isle#128 (approved by Wesley Booker, Oct 28, 2026 — "Approved with a and approved to remove duplicate")
**Scope executed:** exactly 4 edits in 2 files, one date bump each. Nothing else.

---

## File paths touched

1. `src/pages/TermsOfService.jsx`
2. `base44/functions/publicTermsOfService/entry.ts`

`git diff --stat`

```
 base44/functions/publicTermsOfService/entry.ts | 13 ++++++++++--
 src/pages/TermsOfService.jsx                   | 28 ++++++++++++++++++++------
 2 files changed, 33 insertions(+), 8 deletions(-)
```

No other file in the repo changed.

---

## EDIT 1 — New section inserted as the SECOND section (`src/pages/TermsOfService.jsx`)

Inserted between `Acceptance of These Terms` and `Ordering & Payment`. Verified section order now reads:

```
1.  Acceptance of These Terms
2.  Ownership & Operation of Flavor Isle   <- NEW
3.  Ordering & Payment
4.  SMS, Phone & Communication Consent
5.  AI Assistant (Smashie & OpenAI)
6.  Marketing, Photos & Promotional Use
7.  Mobile App (iOS & Android)
8.  Tasty Threads Merchandise
9.  Loyalty & Rewards
10. Cancellations, Refunds & Conduct
11. Limitation of Liability
```

The new card carries four subheadings, word for word as approved: **Who Owns Flavor Isle**, **Who Operates Flavor Isle**, **Who Owns This Website**, **How "We," "Us," and "Our" Are Used in These Terms**. It is the second card on the page.

## EDIT 2 — Duplicate "Star Rewards" section removed, its text preserved

The standalone section object `{ title: 'Star Rewards', body: [ ... ] }` was deleted so **no section titled "Star Rewards" remains as its own card** (`grep -c "title: 'Star Rewards'"` → 0).

Its single body item, **Points & Phone Number Ownership**, was moved into the `Loyalty & Rewards` body array immediately after `Program Changes & Limitations`, byte for byte unchanged (same heading, same paragraph, same `\u2019` escapes). `Loyalty & Rewards` now ends with:

```
Fraud & Misuse
Program Changes & Limitations
Points & Phone Number Ownership   <- moved here, last item
```

The `Star Rewards` h3 subheading inside `Loyalty & Rewards` and every other Star Rewards subheading are untouched.

## EDIT 3 — Last updated date (`src/pages/TermsOfService.jsx`)

```diff
-  const lastUpdated = 'August 28, 2026';
+  const lastUpdated = 'October 28, 2026';
```

## EDIT 4 — Plain-HTML carrier copy (`base44/functions/publicTermsOfService/entry.ts`)

- The new `<h2>Ownership &amp; Operation of Flavor Isle</h2>` block (with its four `<h3>` + `<p>` pairs) inserted immediately before `<h2>Ordering &amp; Payment</h2>`, i.e. after the "Changes to These Terms" paragraph — so it is the second `<h2>` in the served HTML.
- Deleted only the single line `<h2>Star Rewards</h2>`, leaving `<h3>Points &amp; Phone Number Ownership</h3>` and its paragraph in place so it now reads as the final subheading of `Loyalty &amp; Rewards`.
- Date line changed to `<p class="muted">Last updated: October 28, 2026</p>`.

Served HTML `<h2>` order after deploy: Acceptance of These Terms → **Ownership &amp; Operation of Flavor Isle** → Ordering &amp; Payment → SMS, Phone &amp; Communication Consent → AI Assistant → Marketing, Photos &amp; Promotional Use → Mobile App → Tasty Threads Merchandise → Loyalty &amp; Rewards → Cancellations, Refunds &amp; Conduct → Limitation of Liability → Questions About These Terms?

### Deployment

Function deployed and invoked live: `publicTermsOfService` returned **200** and the response body contains the new `<h2>Ownership &amp; Operation of Flavor Isle</h2>` section in second position plus `Last updated: October 28, 2026`, with no `<h2>Star Rewards</h2>` line.

---

## Verification

| Check | Result |
|---|---|
| New section is second on the page (both page and served HTML) | ✅ |
| No section titled "Star Rewards" remains as its own card | ✅ `title: 'Star Rewards'` count = 0; served HTML has no `<h2>Star Rewards</h2>` |
| "Points & Phone Number Ownership" preserved word for word inside Loyalty & Rewards | ✅ count = 1 in the page array, text identical including `\u2019` escapes |
| New Last updated date | ✅ `October 28, 2026` on the page and in the function HTML |
| Function deployed and serving the new copy | ✅ 200 response, new section present |
| Tests | ✅ `npm test` — 69 tests, 69 pass, 0 fail |
| Production build | ✅ `npm run build` completes with no errors (routine stale-browserslist notice only) |
| Nothing else changed | ✅ diff is exactly the two hunks above per file: no menu, no other page, no styling, navigation, footer, entity, or workflow touched |

---

## Note on repo mirroring

The change lives in this app's working tree with the diff shown above. No commit or push to GitHub `main` was made from this build, since the instruction set for this turn was limited to the four edits, the deploy, and this report. The diff is ready to mirror whenever you want it committed.