# Builder report: group_payment_pricing_reward_integrity_2026-09-22

## Payment integrity: group Stripe intents, server-side price authority, exact Square reward validation

**Status:** approved  
**App entity:** BuilderReport `6ab433eded3df07360ac11ae`

### Before

Audit of the approved three-part payment integrity changes (approved Sep 23 11:48 PM CT). Required BuilderReport was never filed at implementation time; filing now as read-only report. No code changes made in this task.

### After

1) GROUP INTENT PERSISTENCE/RECOVERY: IMPLEMENTED. GroupPaymentShare entity (intent_id, expected_amount, status pending/succeeded/failed/canceled/refunded, settled_at). createGroupPayment persists shared Order BEFORE any intent; per-person intents; on any failure cancels all created intents + records canceled shares; bulkCreates GroupPaymentShare records. stripeWebhook: payment_intent.succeeded→updateGroupShareStatus (amount-verified)→settleGroupOrderIfComplete; handles failed/canceled/refunded. confirmOnlinePayment fallback: verifyAndSettleGroupOrder retrieves each share from Stripe, settles parent only when ALL succeed at correct amounts. Legacy groups (no shares) NOT retro-settled. Idempotent via pushOrderToSquareAndKitchen per-action dedupe. NOTE: share bulkCreate failure is non-fatal (logs only). 2) PRICING AUTHORITY: IMPLEMENTED. verifyOrderPricing recomputes from MenuItem/MenuSetting; catalog modifiers authoritative by id (unknown-id/no-id REJECTED, closes ad-hoc gap); mug via NONCATALOG_PRICES ($6.00); combos via validateComboItem (component MenuItems + ComboConfig discount); Happy Hour/tax/delivery authoritative. Called before any intent in both createPaymentIntent and createGroupPayment. NOTE: unknown noncatalog items with no canonical price still trusted-with-warning (edge case). 3) EXACT SQUARE REWARD VALIDATION: IMPLEMENTED. validateRewardDiscount (squareLoyalty.ts) verifies tier exists + online-redeemable (ORDER-scope, FIXED_AMOUNT or sub-100% FIXED_PERCENTAGE), resolves account by phone then email, checks balance>=tier.points, computes exact discount, confirms claimed matches exact (±0.01), returns authoritative exactDiscount. App Loyalty table untouched (Square is only authority). createPaymentIntent calls it when redemptionId present; createGroupPayment skips reward. All three parts IMPLEMENTED; no PARTIAL or NOT IMPLEMENTED.
