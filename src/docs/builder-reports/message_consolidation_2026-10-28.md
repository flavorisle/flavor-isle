# BuilderReport — Message Consolidation (Oct 28 2026)

**Issue:** flavorisle/flavor-isle#130 (approach approved by Wesley Booker, Oct 28 2026 — option A)
**Scope:** all 11 approved steps, nothing else. No menu, ordering, payments, loyalty rules, TOS/privacy copy, consent wording, Smashie voice, kitchen tickets or admin screens were touched, and **no existing log or delivery records were deleted.**

**Build:** `npm run build` → **exit 0**. **Tests:** `npm test` → 69 pass, 0 fail. Every changed backend file also parses clean under esbuild.

---

## Files touched

```
 base44/functions/processPendingRecommendationEmails/entry.ts    |  38 ++++--
 base44/functions/processPendingReviewRequestEmails/entry.ts    |  96 +-------------
 base44/functions/processPendingReviewSms/entry.ts              | 142 +--------------------
 base44/functions/sendBirthdayEmail/entry.ts                    |   6 +
 base44/functions/sendCartAbandonmentReminders/entry.ts         |  14 ++
 base44/functions/sendOrderRecommendationEmail/entry.ts         |  29 ++++-
 base44/functions/sendPointsDigest/entry.ts                     |   6 +
 base44/functions/sendWinbackEmail/entry.ts                     |   6 +
 base44/functions/syncSquareOrderStatus/entry.ts                |  83 ++++--------
 base44/shared/sendOrderStatusSms.ts                            |  19 +++
 base44/shared/messagePolicy.ts                                 | NEW
 10 files changed, 140 insertions(+), 299 deletions(-)
```

---

## STEP 1 — `base44/shared/sendOrderStatusSms.ts` ✅

- `const ALLOWED_MILESTONES = new Set(['confirmed', 'ready', 'cancelled']);` added above the exported function.
- First statement in `sendOrderStatusSms` (before the `cashNote` line): a retired-milestone guard that **writes a `skipped` SmsDeliveryLog row** with reason `Milestone text retired in the Oct 28 2026 message consolidation` and returns `{ sent: false, skipped: true, reason: 'Milestone text retired', log_id }`. Nothing is texted.
- Immediately after it, before the existing `SmsDeliveryLog.create`: the **one-text-per-poll rule** — `SmsDeliveryLog.filter({ order_id, milestone })`; if any row is `queued` / `sent` / `delivered`, return `{ sent: false, skipped: true, reason: 'Already sent for this order' }` without sending.

## STEP 2 — `base44/functions/syncSquareOrderStatus/entry.ts` ✅

- Removed the `sendOrderPreparingEmail / sendOrderReadyEmail / sendOrderCompletedEmail` import. `getLiveBusyness` was imported only for the deleted preparing push (grep confirmed single use), so that import is gone too. `sendPushToEmail`, `getSmashieSettings`, loyalty, refund/cancel and profile-sync imports untouched.
- Deleted the whole notification block from `const milestones = missedMilestones(...)` through the `} catch (notificationError) { ... }` and replaced it with the approved block: one text per order (`ready`, else `confirmed`), skipped for `in_store`, then a single `ready` push, `notified++` only on that push.
- Status persistence, loyalty accrual, web-order bonuses, refund/POS-cancellation mirroring and customer-profile sync are byte-for-byte unchanged.
- Verified after editing: no `getLiveBusyness`, no `sendOrder*Email` and no orphaned `customerName` reference remain in the file.

## STEP 3 — `base44/functions/processPendingRecommendationEmails/entry.ts` ✅

- Quiet hours added directly after `createClientFromRequest`: store-local hour via `America/Chicago`; `>= 21` or `< 10` returns `{ ok: true, skipped: true, reason: 'quiet hours (9 PM–10 AM store local)' }`.
- Bounds replaced with `lowerBound = now − 2h` and `upperBound = now − 48h`.
- Order query page size `100 → 200`; all existing filters and the `RecommendationEmail` dedupe kept.

## STEP 4 — `base44/functions/sendOrderRecommendationEmail/entry.ts` (the single thank-you email) ✅

- Imports extended: `brandedEmailHtml, reviewCtaHtml, starsEarnedHtml` from `shared/sendOrderEmails.ts`, plus `searchLoyaltyAccountByPhone` from `shared/squareLoyalty.ts`.
- Just before the HTML build (the suggestion `subject` string is still built and still drives the card heading):
  - **Subject:** `Thanks for stopping by Flavor Isle, {first name}`
  - **Stars line:** `pointsEarned = floor(total × 1.1)` for online orders, `floor(total)` otherwise, `0` when there is no phone number; live balance read through `searchLoyaltyAccountByPhone` (`balance`, else `points_balance`). A failed lookup logs and the email still goes out with the earned count and no balance.
- Inside `bodyHtml`, after the CTA div and before the unsubscribe paragraph: the **Stars earned block** (`starsEarnedHtml`, only when `pointsEarned > 0`) followed by the **review CTA** (`reviewCtaHtml(order.id)` → click-tracked `/feedback?order=…`).
- Only the Resend subject changed to `isTest ? `[TEST] ${thanksSubject}` : thanksSubject`. Suggestion engine, malt/sundae exclusion, photo filter, 7-day cap, atomic `rec_email_sent_at` claim and `RecommendationEmail` logging are untouched.

## STEP 5 — `base44/functions/processPendingReviewRequestEmails/entry.ts` (retired) ✅

Default export body is now the single return:
`{ ok: true, skipped: true, reason: 'Review request merged into the thank-you email (Oct 28 2026 consolidation)' }`
Verified live: deployed function returns exactly that (200). `sendReviewRequestEmail` stays deployed and unchanged for manual admin use.

## STEP 6 — `base44/functions/processPendingReviewSms/entry.ts` (retired) ✅

Default export body is now the single return:
`{ ok: true, skipped: true, reason: 'Review text retired; review ask moved to the thank-you email (Oct 28 2026 consolidation)' }`
Verified live: deployed function returns exactly that (200). The old review-text logic is gone; **the historic `SmsDeliveryLog` rows it wrote are untouched.**

## STEP 7 — `base44/shared/messagePolicy.ts` (new) ✅

`canSendMarketingEmail(base44, email)` exactly as approved: blocks no-address and `@flavorisle.com` internal addresses, blocks anyone who **ordered in the last 24 hours**, blocks anyone who already received an automated **marketing email in the last 7 days** (via `LoyaltyEmail`), and fails open (logs, allows) if either lookup errors. `MARKETING_TYPES = ['birthday','winback','digest','showcase','nudge']`.

## STEP 8 — Cap applied in the four automated senders ✅

Each imports `canSendMarketingEmail` and runs the per-recipient check before the send, logging `Marketing skip for {email}: {reason}` and incrementing the file's existing `skipped` counter, then `continue`:

| Sender | Placement |
|---|---|
| `sendBirthdayEmail` | after the block-list skip, **before** any Stars are granted — a capped customer never gets the points for an email they didn't receive |
| `sendWinbackEmail` | after the block-list skip, before the email is built |
| `sendPointsDigest` | after the block-list skip, before balance/tier work |
| `sendCartAbandonmentReminders` | after the block-list skip; capped carts are logged with status `marketing_cap`, counted in a new `skipped` counter (added to the response), and **`cart_reminder_sent_at` is NOT stamped**, so the reminder can still fire once the customer is eligible |

## STEP 9 — Settings toggle ✅

`SmashieSettings` record `6a7fd236b64dc1a4c8de4ae0`: `googleReviewSmsEnabled = false` (it read `false` before and after — the toggle is confirmed off). No other field in the record was changed.

## STEP 10 — Header comments updated ✅

- `processPendingRecommendationEmails`: describes the single thank-you dispatch, the 2→48 hour window and quiet hours.
- `sendOrderRecommendationEmail`: describes the one post-order email (thank-you subject, Stars, review ask, suggestion) and the retired review email/text.
- `syncSquareOrderStatus`: the `missedMilestones` comment now states that no status email is sent and that a status change produces at most one text plus the ready push.

## STEP 11 — Build + this report ✅

`npm run build` exit 0; report written to `src/docs/builder-reports/message_consolidation_2026-10-28.md`.

---

## Confirmation: what customers no longer receive

| Message | Before | Now |
|---|---|---|
| "preparing" / "on the grill" text | sent | **gone** — retired milestone, logged as skipped, never texted |
| "completed" / thanks text | sent | **gone** — retired milestone |
| `sendOrderPreparingEmail` | fired from sync | **no longer called anywhere** (import deleted) |
| `sendOrderReadyEmail` | fired from sync | **no longer called anywhere** |
| `sendOrderCompletedEmail` | fired from sync | **no longer called anywhere** |
| Separate review-request email | fired ~3 h after order | **retired scheduler** — returns skipped |
| Post-order Google review text | fired ~2 h after completion | **retired scheduler** + settings toggle off |
| Ready push | sent | still sent (unchanged) |
| Thank-you + Stars + review ask | split across up to 3 emails | one email |

**Texts that still go out:** `confirmed`, `ready`, `cancelled` only — at most one of them per order, never a repeat for the same order and milestone.

**Email that still goes out:** exactly one thank-you email per qualifying order (2–48 h old, not in-store, not blocked, 7-day per-customer cap, atomic per-order claim), and only between 10 AM and 9 PM store local.

---

## One item to look at

The approved `MARKETING_TYPES` list uses `'showcase'` and `'nudge'`, but the `LoyaltyEmail` entity stores those two as `'day14_showcase'` and `'day45_nudge'`, so the 7-day branch will not match those two types (birthday, winback and digest match fine). I implemented the list exactly as approved. One-line fix when you want it: change those two entries to `'day14_showcase'` and `'day45_nudge'` in `base44/shared/messagePolicy.ts`.