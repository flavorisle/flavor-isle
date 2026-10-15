# Find Smashie — free milkshake prize + daily riddles

**Issues:** #108 (milkshake prize) · #109 (riddle/clue system) · planned by #110
**Build:** commit `a8e3a09` (*Update Smashie hunt functionality and UI components*), plus the post-verification clue-chip guard applied after it
**Date:** 2026-10-14
**Scope:** exactly issue #110, steps A1–A5 and B1–B6. No scope changes.

---

## Step log

### Part A — the free shake prize (#108)

- **A1 — `getMySmashiePrize`** ✅ Done. Answers `{ active: true }` only for the signed-in player who still holds today's unfulfilled milkshake win; signed-out visitors and spent/used prizes get `{ active: false }` and nothing about why, so it stays safe to call from a public page.
- **A2 — `fulfillSmashiePrize`** ✅ Done. Non-throwing by contract (an order must never fail because the prize record could not be updated): it looks the win up by the *caller's own* user id — never an id from the request — and stamps `prize_fulfilled`. Checkout calls it immediately after the order is saved and deliberately does not await the result.
- **A3 — free shake at checkout, priced on the server** ✅ Done. `Checkout.jsx` shows the dearest shake in the bag as its own summary line ("Free shake — Find Smashie") and sends only `freeShakePrize: true`; `createHelcimWebCheckout` re-checks the prize against the customer's own records and `verifyOrderPricing` prices the shake from the catalog. A forged flag therefore buys nothing, and the total can never go below $0 (the discount is capped at subtotal − reward discount). Tax, tip and the charged amount all follow the same authoritative total, so settlement still matches to the cent.
- **A4 — winner flow to the shake list** ✅ Done. Choosing the milkshake writes a `smashie_free_shake` localStorage flag, refreshes the shared hunt state and navigates to `/milkshakes`, which shows `FindSmashieFreeShakeBanner` while the prize is genuinely unused.
- **A5 — winner name fallback** ✅ Done. `displayInitial` in `claimSmashieFind` no longer prints an email handle or a run-together login token on the winner board / banner / Instagram reveal: only a value that reads as a real name is used, anything else becomes "A lucky finder".

### Part B — daily riddles (#109)

- **B1 — riddle bank, verbatim** ✅ Done. `src/lib/findSmashie.js` carries the riddle bank exactly as specified, plus `getHuntClue`, `huntClueText`, the 5 PM vampire switch and the FOUND message.
- **B2 — old plain hint removed** ✅ Done. The old "he is hiding on the `<page>`" hint (`hunt.hint`) is gone from code and from every surface; the clue is a riddle, and its wording never names the spot.
- **B3 — clue chips, correct pages only** ✅ Done (with one deviation found in verification and fixed, see below). `FindSmashieClueChip` renders in both placements — the fixed corner chip on Home, Menu, Gallery, About, Meet Smashie and Find Smashie, and the footer band chip via `Footer.jsx`.
- **B4 — FOUND message after the day's win** ✅ Done. One shared line: every clue surface (site banner, footer chip, corner chip, Find Smashie clues panel) switches to "FOUND! …" with the winner and the time as soon as `today_winner` is set.
- **B5 — crew-editable riddle** ✅ Done. `SmashieClue` entity (one record per hunt day, admin-only writes) plus the "Daily clues" editor in Admin → Find Smashie (Pulse), which pre-fills from the bank and saves today's wording; the saved record wins over the bank everywhere the clue appears.
- **B6 — hunt state untouched** ✅ Done. `getSmashieHuntState` was not modified; the riddle is resolved on the client from the shared bank/override, and `today_winner` continues to drive the FOUND switch.

### The one deviation, and its fix

Verification found the footer chip rendering on **/account**, because that page renders the shared footer. Pre-plan B3 allows no clue chips there, `/checkout`, `/cart` or the admin pages, so `FindSmashieClueChip.jsx` now takes one path check (`clueChipHidden`) covering **both** placements: the chip returns nothing on `/account`, `/checkout`, `/cart` and any `/admin*` route, while the corner chips on Home, Menu, Gallery, About, Meet Smashie and Find Smashie are unaffected. Build re-run after the fix: exit 0.

---

## Files changed

**Backend**
- `base44/shared/findSmashiePrize.ts` *(new)* — store-local day window, `todaysMilkshakePrize`, `SHAKE_CATEGORIES`, `isSmashieShake`: the one place the prize endpoint, the fulfiller and checkout agree on what the prize is and when it is still good.
- `base44/functions/getMySmashiePrize/entry.ts` *(new)* — A1.
- `base44/functions/fulfillSmashiePrize/entry.ts` *(new)* — A2.
- `base44/shared/verifyOrderPricing.ts` — A3: `freeShakePrize` option, `freeShakeDiscount` in the result, the dearest-shake line priced from the catalog, discount capped so the total never goes below zero.
- `base44/functions/createHelcimWebCheckout/entry.ts` — A3: accepts `freeShakePrize`, proves it against the signed-in customer's own win record, passes it to the verifier, and stores the resulting discount on the order.
- `base44/functions/claimSmashieFind/entry.ts` — A5: winner-name fallback.

**Entity**
- `base44/entities/SmashieClue.jsonc` *(new)* — B5: one riddle pair per hunt day, admin-only writes, public read.

**Frontend**
- `src/lib/findSmashie.js` — B1/B2: riddle bank, `getHuntClue`, `huntClueText`, FOUND constants, shake categories; old plain hint removed.
- `src/hooks/useSmashieHunt.js` — returns `clue`, `winner` and `closedNote` from the shared riddle, one cached read per page view.
- `src/components/findSmashie/FindSmashieClueChip.jsx` *(new)* — B3, plus the `/account`, `/checkout`, `/cart` and admin path guard.
- `src/components/findSmashie/FindSmashieFreeShakeBanner.jsx` *(new)* — A4.
- `src/components/findSmashie/FindSmashieBanner.jsx` — B4: one small clue line, and the FOUND message after the day's win.
- `src/components/findSmashie/FindSmashiePromo.jsx` — clue line wording.
- `src/components/findSmashie/SmashieHunt.jsx` — A4: localStorage flag, hunt refresh, navigate to `/milkshakes` on the milkshake choice.
- `src/pages/Checkout.jsx` — A2/A3: `getMySmashiePrize`, the free-shake summary line, the discount in the composed total, `freeShakePrize` in the checkout payload, `fulfillSmashiePrize` fired once the order is saved.
- `src/pages/Milkshakes.jsx` — A4: free-shake banner on the shake list.
- `src/pages/FindSmashie.jsx` — B3/B4: "Today's Clues" panel (Clue 1 before 5 PM, Clue 2 after) replacing the old hint card, plus the corner chip.
- `src/components/Footer.jsx` — B3: footer clue chip band.
- `src/pages/Home.jsx`, `src/pages/Menu.jsx`, `src/pages/Gallery.jsx`, `src/pages/About.jsx`, `src/pages/MeetSmashie.jsx` — B3: corner clue chip.
- `src/components/admin/FindSmashiePanel.jsx` — B5: "Daily clues" editor for today's two riddles.

**Docs**
- `docs/builder-reports/find_smashie_prize_and_riddles_2026-10-14.md` *(this report)*.

---

## Notes worth keeping

- **How the free shake is recorded on the order.** It is stored as the order-level discount, together with any Star Reward discount, and is never written as an item or as a changed item price. That is deliberate: the total Square receives for the ticket must equal what the customer actually paid, or the crew sees a discrepancy at the register. `redemption_id` stays empty unless a Star Reward was really redeemed, which is what tells a free-shake order apart from a reward order in the data.
- **One free shake, once.** The prize is only spent (A2) after the order exists, and the server prices the prize again on every checkout, so a stale browser flag or a second tab cannot produce a second free shake.
- **What counts as a shake.** "Whirl & Twirl" (made-to-order shakes and malts), "Blend & Bliss" (Bliss shakes) and build-your-own shakes all qualify; the rule lives in `isSmashieShake` so the Milkshakes page, checkout and the server cannot drift apart.
- **`FindSmashieSettings` was not touched** — the existing row stays as the crew left it.

## Open item

- **Publish.** `npx vite build` exits 0 on every step above, but live (flavor-isle.com) was still serving the previous bundle at verification time — the served JavaScript had no riddle bank, no clue chip and still carried the old plain hint. Publishing is a builder action from the Publish control in the app editor; once that is pressed the new bundle replaces the old one, and no code change is pending after it.