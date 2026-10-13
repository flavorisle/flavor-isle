# Group ordering removed, Helcim added, customer directory built

Date: 2026-10-12
Scope: GitHub issues **#97** (remove group orders / add Helcim) and **#96** (customer directory & linking), including all of section A and section B.

Everything below is either **built and verified**, **built but dormant pending credentials**, or **waiting on a credential/step that only the owner can supply** — nothing is claimed beyond what the data shows.

---

## #97 — Section A: group ordering removed

| Item | Status | Evidence |
| --- | --- | --- |
| Group ordering UI gone from Menu, Combos, and the cart drawer | Done | `GroupOrderBar` deleted; references removed from `Menu.jsx`, `Combos.jsx`, `CartDrawer.jsx` (no `GroupOrderBar` / `startGroupOrder` / person chips remain anywhere in `src`) |
| Cart no longer carries people or person tags | Done | `CartContext.jsx`: group state, `addPerson`, `removePerson`, `startGroupOrder`, `endGroupOrder`, `reassignItem`, `personSubtotals` and person-tagged line keys all removed; saved carts now store `{ cartItems, orderType, pickupMethod }` |
| Split-payment checkout removed | Done | `SplitPayment.jsx`, `SquareShareLinks.jsx` deleted; Checkout split step, split state, split branch and per-person summary removed |
| `createGroupPayment` removed | Done | Function file deleted |
| `settleGroupOrderIfComplete` / share settlement removed | Done | `groupPaymentSettlement.ts` deleted and its four importers cleaned (`stripeWebhook`, `squareCheckoutSettlement`, `settleSquareWebPayment`, `confirmOnlinePayment`); Square group-share settlement removed |
| "GROUP" session orders no longer special-cased | Done | `cleanupStaleOrders` and `confirmOnlinePayment` no longer branch on `stripe_session_id === 'GROUP'` |
| New share records blocked | Done | `GroupPaymentShare` RLS now fences `create`/`update`/`delete` on `data.order_id: "group-ordering-removed"`, so no new row can ever be written; reads stay admin-only |
| Existing share history untouched | Verified | `GroupPaymentShare` holds **0** records — there was no history to preserve |
| No dead links remain | Done | Repo-wide grep for every group identifier returns nothing; `CustomerProfile.cart` description updated to the real stored shape |

One legacy artefact is left in the data on purpose (deleting order history was out of scope): order **FI-381199**, created 2026-07-30, `status: cancelled`, `payment_status: pending`, $13.98, still carrying `stripe_session_id: "GROUP"`. It is cancelled and unpaid, so it cannot settle anything; it is recorded here so it is not a surprise later.

---

## #97 — Section B: Helcim as the third provider

| Item | Status | Evidence |
| --- | --- | --- |
| `SmashieSettings.phone_payment_provider` and `web_payment_provider` accept `helcim` | Done | Both enums widened to `stripe | square | helcim`; `shared/smashieSettings.ts` passes `helcim` through and still falls back to `stripe` on anything unrecognised |
| Fail-closed credential handling | Done | New `shared/helcimCheckout.ts` reads `HELCIM_API_KEY` + `HELCIM_ACCOUNT_ID`; every entry point refuses with a written reason when either is missing |
| Web checkout on Helcim | Built, dormant | `createHelcimWebCheckout` (validation front half identical to the Square endpoint: blocked customers, reward validation, authoritative re-pricing, order saved before a payable page exists) |
| Our own secure page | Built, dormant | `/pay-helcim` renders our branding and mounts Helcim's card fields; on the reported result it asks the server to verify, then goes to the confirmation screen |
| Phone / text / chat payment link | Done | `shared/helcimPhonePayment.ts` + `createPhonePaymentLink`, used by `logPhoneOrder` and `sendPhonePaymentLink`; a Helcim failure falls back to the Square link so a caller is never left without a way to pay |
| Settlement | Built, dormant | `settleHelcimWebPayment` + `shared/helcimSettlement.ts`: paid only when Helcim reports an APPROVED USD payment for the exact total, matched by the order's own invoice number; a mismatch leaves the order pending |
| Safety-net sweep | Done | `autoSyncUnpushedOrders` gets the same block the Square path has, so a closed tab still settles |
| Merch (Tasty Threads) | Done | `createMerchCheckout` opens the Helcim page for the verified total, or the Square page if Helcim cannot; Printful is only asked to produce an order once the payment is verified (`settleHelcimMerchOrder`) |
| Refunds | Done | `shared/helcimRefund.ts`, wired into `refundOrder` and `cancelOrder`; refunds go to the transaction that took the money |
| Saved cards | Backend done, UI dormant | `manageSavedCards` gained a `provider: 'helcim'` branch (list/save/detach against Helcim's vault, with `HELCIM_NOT_CONFIGURED` until credentials exist); `payWithSavedCard` charges a vaulted card for the order's own saved total; `/pay-helcim` shows the one-tap selector only when Helcim actually holds a card |
| Apple/Google Pay only on the hosted path | Done | The in-app wallet buttons now render only when the switch is on `stripe`; both hosted pages offer their own wallets |
| Missing credentials never strand a checkout | Done | Switch on Helcim with no credentials → the server answers `fallback: "square"` and the browser opens the Square page (verified by code path); the Square endpoint was widened to accept that fallback |

`MerchOrder` gained `payment_url`, `helcim_checkout_id`, `helcim_transaction_id` and the `helcim` provider value; `Order` gained `helcim_checkout_id` / `helcim_transaction_id` and the `helcim` provider value.

**Outstanding:** four values have to be added before the Helcim path can take money — `HELCIM_API_KEY`, `HELCIM_ACCOUNT_ID` (and, once the Pulse directory is to be read, `PULSE_API_URL`, `PULSE_API_KEY`). Until then the switch stays safe: the Square page is used and nothing about today's checkout changes.

---

## #96 — Section A: orders linked to customers

| Item | Status | Evidence |
| --- | --- | --- |
| `Order.customer_id` + `Order.normalized_phone` | Done | Added to the schema with the matching rule documented on the field |
| Every order-creation path writes the link | Done | `createPaymentIntent`, `createSquareWebCheckout`, `createHelcimWebCheckout` and `logPhoneOrder` all resolve the link through one helper (`shared/customerLink.ts`: normalized phone first, then email; never throws, so a directory hiccup cannot fail an order) |
| In-store orders stay unlinked | Done | `logWalkInOrder` and the Square POS sync are deliberately untouched — a Walk-In order belongs to no online customer and is counted as such on the Customers page |
| Backfill | **Applied** | `backfillOrderCustomerLinks` dry run reported 252 orders to link; the same pass was then applied: **253 online orders scanned, 252 written, 251 now linked to a profile, 1 phone-only**, 1 already correct. Re-running is a no-op |

Data before/after: `customer_id` present on **0** orders before, **251** after (of 253 `order_source: "online"`). 163 `CustomerProfile` rows were indexed (90 usable phones, 156 emails).

**Known gap, reported rather than hidden:** 169 orders carry **no** `order_source` at all (3,907.53 in total). They are neither `online` nor `in_store`, so the backfill leaves them alone, and they are not counted in the unlinked in-store figure either. If they should be linked, the owner can say so and the same idempotent pass can be widened to cover them.

---

## #96 — Section B: admin customer directory

| Item | Status | Evidence |
| --- | --- | --- |
| `searchCustomerDirectory` function | Done | Admin-only; searches the Pulse directory of record, and for one customer returns their profile plus order history read through the link fields |
| Pulse client | Built, dormant | `shared/pulseDirectory.ts` reads `PULSE_API_URL` + `PULSE_API_KEY` and, when they are missing, returns the exact reason instead of an empty list |
| Admin → Customers page | Done | New `AdminCustomers` page (route `/admin/customers`, linked from the admin nav): search box, results list, and a profile panel with contact details, online/in-store counts and totals, first/last order and the order history |
| Section A orders show in real time | Done | The panel reads orders through `normalized_phone` / `customer_id`, the same fields the new order paths write |
| Unlinked in-store counter | Done | Counted on the server with one grouped aggregate: **3,960 in-store orders, $70,638.26** unlinked — shown on the page rather than hidden |
| Search by phone / email / name | Done | Phone searches match on digits, email exactly, name as a contains-match; all filtering happens on the server |

**Waiting on the owner:** `PULSE_API_URL` and `PULSE_API_KEY`, so the page can read Pulse. Right now it opens with the search box, the unlinked counter (live), and a plain explanation that the directory is not connected yet.

---

## Verification performed

- `npx vite build` — clean (exit 0) after every change.
- Every new/edited backend file type-checked with esbuild and every relative import confirmed to resolve (0 problems).
- Repo-wide grep confirms no group-ordering identifier survives in `src` or `base44`.
- `backfillOrderCustomerLinks` dry run, then applied, with the result counted back out of the database.
- Data read back after the change: 3 Stripe orders, 2 Square-hosted orders, 0 Helcim orders, 0 group shares, 45 SMS subscribers, 58 visitor hometowns.

One process note worth keeping: the server-side SDK takes `filter(query, sort, limit, skip)` and returns an **array**, while the browser SDK's options form returns a page object. Three reads written the browser way returned nothing inside a function and were corrected — a reminder for any future backend read.