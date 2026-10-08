# BuilderReport: `star_rewards_v2_square_integration_2026-09-29`

Code-audit status only. This report does not claim that live Square calls, email delivery, or publication were verified. No test orders were placed.

## 1. Checkout enrollment

**Partially built.** Checkout passes the optional phone opt-in on single and group payment orders. Paid-order loyalty processing reuses an existing phone-mapped Square account or calls `CreateLoyaltyAccount` for opted-in customers, then records the enrollment flag on the order. Live customer-mapping and enrollment success are unverified.

## 2. Web order points

**Partially built.** Paid Square-synced orders call `AccumulateLoyaltyPoints` with the Square order id; the direct web bonus calls `AdjustLoyaltyPoints` with the `Direct order bonus` reason and an idempotency key. Square computes the normal earn from the order, but net-of-tax accrual has not been reconciled against live loyalty events.

## 3. Checkout redemption

**Partially built; blocker remains.** Checkout reads live Square reward tiers and validates an order-scope reward and balance server-side. `CreateLoyaltyReward` is called after fulfillment and the order-level discount is capped at the subtotal. Live tier names are now shown by the selector. Item-scope tiers (50/100/150 Stars) are still not redeemable online; full Square discount linkage and end-to-end no-stacking coverage are unverified. Kitchen ticket code is unchanged and contains no reward/discount additions.

## 4. Second completed web order

**Implemented in code.** A completed, paid direct web order that is the member's second such order calls `AdjustLoyaltyPoints` for 50 Stars with reason `2nd order bonus`. Square idempotency plus order/customer-account grant timestamps prevent repeat grants. No live grant event has been verified.

## 5. Streak challenge

**Implemented in code.** A completed, paid direct web order that brings the member to 3 orders in the trailing 30 days calls `AdjustLoyaltyPoints` for 50 Stars with reason `Streak bonus`; order/customer-account timestamps and a deterministic Square idempotency key track the grant. No live grant event has been verified.

## 6. Rewards page

**Implemented in code.** Public and member reward details use the live Square program; checkout shows the Square tier name. Copy describes 1 Star per $1, +10% on direct web orders, and 50 Stars for 3 web orders in 30 days.

## 7. Birthday, monthly digest, and win-back

**Partially implemented in code.** Birthday sends 100 Stars through `AdjustLoyaltyPoints` with reason `Birthday bonus` to an existing phone-mapped account and updates the email copy. Win-back email copy now offers 100 Stars on the next direct web order after a 30+ day gap; it no longer awards at inactivity detection. That completed order calls `AdjustLoyaltyPoints` with reason `Welcome back bonus`.

The digest no longer reads the app `Loyalty` table. It uses phone-linked Square account balances, available paid/completed order history, live reward tiers, and win-back email/order records for pre-enrollment frequency, channel mix, win-back redemption, and redeemed-value/gross-sales metrics. Historical calculations are limited to the latest 1,000 order records. The Order entity does not distinguish third-party from phone/in-store channels, so the channel metric reports direct web versus other recorded channels and cannot isolate third-party share.

## 8. No-touch guarantees

**Maintained in this code change.** No menu items, prices, categories, ordering, kitchen ticket formatter, Smashie voice/TTS, or October promotion were changed. No test order was placed. Changes are not published; the normal publish flow remains required.

## Square API calls

- Existing checkout/order paths: `CreateLoyaltyAccount`, `AccumulateLoyaltyPoints`, and `CreateLoyaltyReward`.
- Direct-order bonus: `AdjustLoyaltyPoints` (`Direct order bonus`).
- New completed-web-order grants: `AdjustLoyaltyPoints` (`2nd order bonus`, `Streak bonus`, `Welcome back bonus`).
- Birthday grant: `AdjustLoyaltyPoints` (`Birthday bonus`).

## Blockers / verification

- Online redemption for the 50/100/150 item-scope tiers and complete Square order linkage still need implementation.
- Live Square API grants, checkout redemption, physical kitchen ticket output, digest metrics, and email delivery require verification through real orders and logs; none were exercised here.
- Add a reliable third-party source classification to order records before reporting third-party share separately from other non-direct orders.
- Deploy/publish through the normal flow; no changes were published by this code audit.
