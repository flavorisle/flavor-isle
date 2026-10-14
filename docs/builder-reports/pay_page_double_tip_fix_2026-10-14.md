# Issue #103 — Double-tip fix on reopened /pay links

Date: 2026-10-14
Approved: Wesley (issue #103, flavorisle/flavor-isle)
Verified by: code reading and a production build only — **no test orders were placed, and no card was
charged.**

An order whose saved total **already contains a tip** (a website checkout order) could be tipped a
second time if the customer reopened its `/pay` link: the tip picker came back, and a tip picked there
was added on top of a total that already included one. Both halves of that are now closed — the picker
no longer appears for such an order, and the server no longer adds a picked tip on top of a stored tip.

---

## FILE 1 — `base44/shared/helcimPayableOrder.ts`, `resolvePayableOrder`, food-order branch

Before:

```ts
  // A tip picked on our page is added on top of the order's own total and is capped
  // the same way the phone flow caps it: at the food subtotal, or $10 on a tiny order.
  const tipProvided = pickedTip !== undefined && pickedTip !== null && pickedTip !== '';
```

After:

```ts
  // A tip picked on our page is added on top of the order's own total ONLY when the
  // stored order carries no tip of its own (a web checkout order's total already
  // includes its tip; adding another would double-charge it). A phone order starts
  // with tip 0, so its pay-page tip works exactly as before. The cap is unchanged:
  // at the food subtotal, or $10 on a tiny order.
  const storedTipCents = Math.round((Number(order.tip) || 0) * 100);
  const tipProvided =
    pickedTip !== undefined && pickedTip !== null && pickedTip !== '' &&
    storedTipCents === 0;
```

`tipProvided` is false whenever the stored order already carries a tip, so `tipCents` is 0 and the
charged `amountCents` is the order's own saved total — exactly the amount the customer already agreed
to.

**Untouched in this file** (verified by re-reading the function): `baseCents`, `tipCents`,
`tipCapCents`, the `status: 400` invalid-tip branch, `amountCents`, the paid / cancelled / refunded /
cash-at-pickup guards, and the whole merch branch.

## FILE 2 — `src/pages/PayCard.jsx`, line 70 only

Before:

```jsx
  const showTipPicker = !fromCheckout && !!order && order.kind === 'food' && !paid;
```

After:

```jsx
  const showTipPicker = !fromCheckout && !!order && order.kind === 'food' && !paid &&
    !(Number(order.tip) > 0);
```

No other line of the file changed. `getPayableOrder` already returned `order.tip`, so no backend change
was needed for this. The page's existing non-picker branch is what now runs for these orders: it shows
the tip already inside the saved total (`storedTotal − base`) and charges `storedTotal`.

---

## Flow, traced end to end

| Entry point | Order's stored tip | Tip picker | Tip added on our page | Amount charged |
| --- | --- | --- | --- | --- |
| Website checkout order (`/pay` reopened, or `/checkout` retry) | > 0 (inside the saved total) | hidden | none | the saved total, unchanged |
| Phone / text link (`/pay`) | 0 | shown | the customer's pick (still capped: food subtotal, or $10 on a tiny order) | saved total + pick |
| Tasty Threads merch | 0 (never tipped) | hidden (`kind === 'merch'`) | none | the saved merch total |

The amount is still rebuilt server-side from the stored record only; nothing the browser sends can
raise or lower it.

## Files changed

Changed: `base44/shared/helcimPayableOrder.ts` (the tip gate), `src/pages/PayCard.jsx` (line 70).

No other file, function, entity, workflow, or secret was touched by this build. No menu, category or
pricing change; no checkout, phone-flow, style or photo change.

## Verification performed

- Both edits re-read from disk after the change; each matches the approved code exactly.
- `npx vite build` — exit code 0, chunks emitted, no unresolved imports and no Rollup errors.
- The reopened-link path traced by reading the code: `getPayableOrder` → `resolvePayableOrder` →
  `chargeHelcimOrder`/`createHelcimCardForm` → fields → `helcimJsResult` → settlement, plus the page's
  render branches for a stored tip.
- No orders placed, no payments made, no test data created.

## Open items carried from the earlier payment-provider cleanup build (issue #101, same day)

These are **not** part of #103 and were not changed here; listed so nothing is mistaken for done:

- The saved-card record purge is still awaiting approval (the delete of the retired `SavedPaymentMethod`
  records) and the entity file itself is still present.
- The remaining #101 wiring/cleanup items (the owner-switch provider helpers, the order-schema Wix fields,
  and that build's own report) are still open.