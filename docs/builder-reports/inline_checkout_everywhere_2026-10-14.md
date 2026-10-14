# Issue #99 — Inline Flavor Isle card checkout everywhere, processor popup removed

Date: 2026-10-14
Approved: Wesley, by email, Oct 14 ~9:02 AM CT (issue #99, flavorisle/flavor-isle)
Verified by: code reading and a production build only — **no test orders were placed on the live
site or in the app**, and no card was charged.

The card is now typed into fields we render, on our own pages, processed by the processor's own
JavaScript, and handed back to our own endpoint. There is no overlay, no popup, no iframe, and no
second payment page anywhere in the flow.

---

## Step 0 — App secrets (names only; values never printed, logged, or committed)

| Secret | Status | Read only by |
| --- | --- | --- |
| `HELCIM_JS_TOKEN` | set (owner-supplied) | `base44/shared/helcimJs.ts` → `helcimJsToken()` (public half, handed to the browser) |
| `HELCIM_JS_SECRET` | set (owner-supplied) | `base44/shared/helcimJs.ts` → `helcimJsSecret()` (server only; signs each amount) |

No other secret was touched; the rest of the app's secret list is unchanged. Neither value appears in
any file, log line, error message, or report.

Both names were already the ones `base44/shared/helcimJs.ts` reads — no renaming was needed.

---

## Step 1 — Website bag checkout is inline

### Render flow in `src/pages/Checkout.jsx` (before → after)

| Step | Before | After |
| --- | --- | --- |
| Card step | `useCardPay` (HelcimPay.js **modal** opened over the page from a checkout token) | `useInlineCardPay` (fields rendered in the checkout's own card area) |
| Button | "Continue to Payment" → modal overlay | same button → the fields replace it in place; no overlay, no navigation |
| Amount | modal's own total | server-computed, signed: `createHelcimCardForm` returns `amount` + `amount_hash` from the **stored** order |
| Decline | modal's error line | the processor writes into the inline `#helcimResults` line; the form stays open on the same saved order |
| Retry | `pendingOrder` re-opened the modal | `pendingOrder` re-opens the inline fields for the same saved order (same call shape, no second order) |
| Stale amount | cart change dropped `pendingOrder` | cart/order/tip change drops `pendingOrder` **and** the signed form (`resetCardForm()`), so a stale signed amount can never be charged |
| Dead modal error rendering | modal error came from the deleted hook | removed; `error \|\| cardFormError` now carries only our own order-state and field errors |

Flow: `handleContinue` → `createHelcimWebCheckout` (saves the order at its server-verified total with
`payment_provider: 'helcim'`, no processor token, `payment_url` = our own `/pay` page) →
`startPayment(orderNumber)` → `createHelcimCardForm` → `<InlineCardFields>` rendered in the summary
card (desktop) with the sticky mobile CTA scrolling to it instead of opening a second way to pay.

Rendered as:

```jsx
<InlineCardFields form={cardForm} defaultName={fullName} defaultAddress={form.address} />
```

Note: the plan specified `defaultPostalCode={form.zip}` as well. `Checkout.jsx` has no ZIP field in its
form state (delivery address is one line), so that prop is omitted and the card form's own ZIP field is
filled by the customer. Nothing else in the flow changed.

### `/functions/helcimJsResult` for a web checkout order (code-read verification)

1. The fields post the processor's result to `${origin}/functions/helcimJsResult`.
2. `response === '1'` + an approval message + a `transactionId`, else nothing was charged and the
   customer is shown "That card was not approved / Nothing was charged…" with a link back to where they were.
3. The saved order is found by `order_number` with `payment_provider === 'helcim'`.
4. The processor is asked what it actually took (`helcimPaymentByTransaction`, up to 4 reads, 2s apart);
   only `status === 'APPROVED'`, `currency === 'USD'` and **amount − tip === the order's saved total to
   the cent** proceeds.
5. A transaction already written on another order is refused (one payment settles one order, never two).
6. The transaction is claimed on the order, then `settleHelcimCheckoutOrder(base44, order, transactionId)`
   runs the existing settlement path (records `helcim_transaction_id`, flips `payment_status` to `paid`,
   releases the order to the kitchen).
7. Redirect, `303`, to:

| Entry point | Redirect |
| --- | --- |
| Website checkout (`return_path` starts with `/checkout`) | `{origin}/order-confirmation?order_number=…&card=1&from=checkout` |
| Phone/text link, `/pay` | `{origin}/order-confirmation?order_number=…&card=1` |
| Tasty Threads merch | `{origin}/merch-confirmation?order_number=…&card=1` |

`{origin}` is the customer's own site when it is `flavor-isle.com`, `*.flavor-isle.com`,
`*.base44.app` or `localhost`; otherwise `https://flavor-isle.com`. `return_path` is a path only
(must start with `/` and not `//`), so the endpoint cannot be used as a redirect to another host.

`from=checkout` is only added when the payment really came from `/checkout`, so a phone order's bag is
never cleared by a confirmation page. Arriving at the merch confirmation with `card=1` now clears the
merch bag there (`MerchConfirmation.jsx`), because the client-side step that used to do it no longer
exists.

---

## Step 2 — Popup paths deleted

Deleted:

- `src/lib/cardPay.js` (loaded `https://secure.helcim.app/helcim-pay/services/start.js`, injected `helcimPayIframe`, called `appendHelcimPayIframe`)
- `src/hooks/useCardPay.js`
- `base44/functions/createHelcimPaySession/entry.ts`
- `createHelcimCheckoutLink()` in `base44/shared/helcimCheckout.ts` (minted the hosted/iframe checkout token; no other caller remained)

`src/hooks/useInlineCardPay.js` rebuilt with no fallback path at all: it asks the server for the form
data and renders it, or shows the message below. A third-party form is now impossible in every failure
mode — including a missing configuration, an unreachable server, or an order that cannot be paid.

Exact fallback message (`data.available === false`), verbatim from the plan:

> Card payment is temporarily unavailable. Call us at (270) 563-4618 or pay at pickup - nothing was charged.

### Grep results (whole tree: `src` + `base44`)

| Pattern | Hits |
| --- | --- |
| `cardPay.js` | 0 |
| `useCardPay` | 0 |
| `createHelcimPaySession` | 0 |
| `appendHelcimPayIframe` | 0 |
| `helcimPayIframe` | 0 |
| `start.js` | 0 |
| `helcim-pay` | 2 (both in `base44/shared/helcimCheckout.ts`) |

The two `helcim-pay` hits are `helcimCanTakePayment()`, a **server-side** capability probe
(`/helcim-pay/initialize` with no invoice request, then discarded) used by `createHelcimWebCheckout`
and `helcimPhonePayment` to detect an account with no active USD terminal before an order is created.
It renders nothing and reaches no customer, and removing it would change the web checkout's
existing alternate-processor fallback — protected by Step 4 — so it is deliberately kept.

Remaining `helcim*` names in the tree are ours, not the processor's: `createHelcimCardForm`,
`helcimJsResult`, `helcimJs.ts`, and the card fields' contract ids (`helcimForm`, `amountHash`,
`helcimResults`) that the processor's script requires.

---

## Step 3 — Customer-facing branding sweep (payment surfaces)

Checked: `Checkout.jsx`, `MerchCheckout.jsx`, `MerchConfirmation.jsx`, `OrderConfirmation.jsx`,
`PayCard.jsx`, `PayPhoneOrder.jsx`, `PaySquare.jsx`, `components/pay/*`, `components/checkout/*`,
`src/lib/helcimJs.js`, and the HTML served by `helcimJsResult`.

- Only customer-visible processor name found: `OrderConfirmation.jsx` kitchen step —
  "Reached Square POS — the crew is on it" / "Transmitting to Square POS…" / "Sent to our kitchen via Square".
  **Now:** "Reached the kitchen — the crew is on it" / "Sending to the kitchen…" / "Sent to our kitchen".
- `InlineCardFields.jsx` visible copy: "Pay $…" and "Your card is sent straight to our payment
  processor — Flavor Isle never sees your card number." No name.
- `helcimJsResult` HTML: "That card was not approved / Nothing was charged…" — no name.
- Everything else that matched is code, ids, function names, comments, or `console.error` text.
- Processor script URLs remain in code only (`src/lib/helcimJs.js` `SCRIPT_SRC`). The retired Square
  path (`components/pay/SquareCardForm.jsx`, `PaySquare.jsx`) is untouched, out of scope for #99.
- Admin panels, TOS and Privacy wording (Step 4) not touched.

---

## Step 4 — Untouched (verified unchanged)

Menu, category order, prices, tax math, kitchen tickets (discounts still never printed), loyalty and
referral bonuses, Square POS sync, refund/cancel paths, phone ordering and the `/pay` tip picker,
TOS/Privacy wording, the merch flow (Printful/orders), admin panels, entities and schemas — no edits.
Issue #98 work (Base44 Payments / alternate-processor routing) untouched.

Behaviour preserved while extracting shared money logic into `base44/shared/helcimPayableOrder.ts`
(which record is being paid, whether it may be paid, tip cap, amount in cents) — the card form, the
`/pay` tip flow and settlement all read the same rule; no amounts or eligibility checks changed.

---

## Files

New: `base44/shared/helcimPayableOrder.ts`, `base44/shared/helcimJs.ts`,
`base44/functions/createHelcimCardForm/entry.ts`, `base44/functions/helcimJsResult/entry.ts`,
`src/lib/helcimJs.js`, `src/components/checkout/InlineCardFields.jsx`, `src/hooks/useInlineCardPay.js`.

Changed: `src/pages/Checkout.jsx`, `src/pages/MerchCheckout.jsx`, `src/pages/PayCard.jsx`,
`src/pages/MerchConfirmation.jsx`, `src/pages/OrderConfirmation.jsx`, `base44/shared/helcimSettlement.ts`
(order's recorded transaction is reused on a later settle attempt), `base44/shared/helcimCheckout.ts`
(hosted-link creation removed).

Deleted: `src/lib/cardPay.js`, `src/hooks/useCardPay.js`, `base44/functions/createHelcimPaySession/entry.ts`.

## Verification performed

- `npx vite build` — exit 0, no unresolved imports.
- Grep table above.
- Every entry point traced by reading the code end to end (checkout, `/pay` from a texted link, merch
  checkout) through `createHelcimCardForm` → fields → `helcimJsResult` → settlement → redirect.
- No orders placed, no payments made, no test data created.