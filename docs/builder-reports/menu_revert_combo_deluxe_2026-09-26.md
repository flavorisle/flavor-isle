# Builder report: menu_revert_combo_deluxe_2026-09-26

9 items in this batch.

## RESIDUAL NOTE — a previously saved browser cart may still show one 'Combo'-named line (no savings text)

**Status:** draft  
**App entity:** BuilderReport `6ab82a97b357686f36e85df0`

### Before

Residual case outside code rendering: a customer whose browser still has a previously saved cart (from before the revert) can still see that line item — its name reads 'Island Diner Burger Combo: burger + fries + shake'. It no longer prints any combo or savings text, but the word 'Combo' appears in the item name. The combo behind it is now inactive, and its two ComboConfig rows are switched off.

### After

No code change proposed here without your say-so. If you want it handled, I can make the cart drop any line that carries combo data on load, so a stale combo line can never be carried into checkout. Kitchen tickets and the POS were never affected either way (they never show discount text).

---

## TRAVELER PAGE (/mammoth-cave-dining) — 'Cave Explorer Combo' deal card (save $1.50)

**Status:** applied  
**App entity:** BuilderReport `6ab82a97b357686f36e85def`

### Before

The Mammoth Cave dining page carried a full-width promo card advertising a combo deal: eyebrow 'CAVE EXPLORER COMBO', heading 'Burger + Crinkle Fries + Shake', body copy telling travelers to 'tap “Make it an Isle Combo” to add Crinkle Fries and a hand-spun shake — and save $1.50', a 'Build Your Combo' button, and a 'Save $1.50 — on every Isle Combo' panel. With combos now hidden, that button never exists and the promised saving is gone, so the card was instructing customers to do something impossible and advertising a price that no longer applies.

### After

The whole Cave Explorer Combo callout section was removed (heading 'CAVE EXPLORER COMBO', the 'Open any burger… tap Make it an Isle Combo — and save $1.50' instruction, the 'Build Your Combo' button, and the 'Save $1.50 / on every Isle Combo' panel), along with its now-unused icon import. Rest of the page is byte-for-byte unchanged — hero, directions, hours, nearby pages, links. Documented here so you can put it back if you ever want it (the claim was also stale: it advertised the old $1.50 flat combo).

---

## MENU CARDS — 'Make an Isle Combo on the product page →' badge on burger cards

**Status:** applied  
**App entity:** BuilderReport `6ab82a6fb357686f36e85dbc`

### Before

Every in-stock burger card on /menu rendered a yellow badge reading 'Make an Isle Combo on the product page →' (revealed on hover on desktop, permanently visible on touch devices).

### After

Badge deleted from the card. The now-unused isBurger flag and the Sparkles icon import were removed with it. Menu cards render exactly the badges they had before the build: Fan Favorite / Special / Happy Hour / Sold Out. No code that reads ComboConfig was touched.

---

## DELUXE — nothing can render while the switch is off

**Status:** applied  
**App entity:** BuilderReport `6ab82a6fb357686f36e85dbf`

### Before

The stored setting was off, but the code defaulted the feature ON: the normalizer used 'enabled: raw.enabled !== false', so any missing, unreadable, or not-yet-loaded setting counted as enabled, and the settings fallback object carried deluxe.enabled = true. A failed or slow settings call could therefore put a 'Make it Deluxe' button (and the Deluxe badge in the cart) in front of customers again.

### After

Both code defaults now require an explicit true: the normalizer is 'enabled: raw.enabled === true' and the settings fallback is deluxe: { enabled: false, presets: [] }. Combined with deluxe.enabled = false in the live settings record, no Deluxe button, preset, or cart badge can render — even if the settings request fails or rate-limits. Pulse can still turn it back on later by setting enabled to true on that same record; nothing else about the switch changed.

---

## INVESTIGATION ONLY — what created the blank MenuSetting row at 19:56 UTC (no fix applied)

**Status:** draft  
**App entity:** BuilderReport `6ab82a6fb357686f36e85dc1`

### Before

What happened: a second MenuSetting row appeared at 19:56 UTC 2026-09-26 under wesleyrbooker1@gmail.com with no category_sort_order, hidden_categories, hours, delivery tiers or site notice content. Because readers take the first row the list returns, that blank row won and the live storefront fell back to defaults — the scrambled menu.

### After

Cause: src/lib/menuSettings.js getMenuSetting() (lines 39-70) reads with MenuSetting.list() and takes [0]; when that list comes back empty it does an INSERT (line 50, MenuSetting.create({ hidden_categories: [] })) instead of failing — and that insert is precisely a blank row. Worse, its catch branch caches an id-less default object for 15 seconds, and all twelve setters take the create branch whenever the cached setting has no id — so any admin save (hours, happy hour, categories, sort order, closure, delivery tiers, site notice, Deluxe) made during a failed/rate-limited settings read inserts a brand-new row instead of updating the real one. The blank row's 19:56 UTC timestamp sits inside the unapproved combo/Deluxe build window and carries Wesley's account because builder writes run as the owner. Recommended fix (awaiting approval): make getMenuSetting never insert (return defaults, or re-fetch before creating), stop caching an id-less fallback, always update by the id of the authoritative row, and pick that row deterministically when several exist. Until fixed, this can silently scramble the live menu again.

---

## COMBO CONFIG — the two Sep 23 stale seed rows

**Status:** applied  
**App entity:** BuilderReport `6ab82a6fb357686f36e85dc0`

### Before

Requested deletion of ComboConfig rows 6ab4184d4711a9cd6d329aa0 and 6ab4184d4711a9cd6d329aa1, reported as referencing categories that do not exist.

### After

Nothing to delete: both ids return 'not found' on read and on delete — they no longer exist in the app, so no deletion was performed. The only ComboConfig rows present are the two created by this build (Island Diner Burger Combo, Veggie Garden Lunch Combo), both is_active = false, so no combo resolves anywhere in the app. Recommendation (not done, needs your approval): delete those two rows as well so the entity is empty; say the word and I'll remove them.

---

## CART & CHECKOUT — 'Combo savings − $x' line under order items

**Status:** applied  
**App entity:** BuilderReport `6ab82a6fb357686f36e85dbe`

### Before

Any line item carrying a combo saving printed a red 'Combo savings − $x' line beneath its modifiers, in the cart drawer and in the checkout order summary.

### After

Removed everywhere: the savings rendering and its prop were deleted from the shared line-item component and from both call sites (cart drawer + the two checkout summaries). A previously saved cart that still holds a combo line now prints only its modifiers — no combo or savings text can reach a customer. Order payloads, prices, kitchen tickets and the POS were not touched.

---

## ITEM PAGE — combo picker section, combo teaser, combo summary, and combo add-path

**Status:** applied  
**App entity:** BuilderReport `6ab82a6fb357686f36e85dbd`

### Before

An item's page showed the ComboPicker section ('Make it a combo?'), a teaser line under Add to Bag reading 'Add a side and a drink — save 12%', a live combo summary box (main/side/drink rows with 'Combo price · save %' and Edit), a 'Combo savings $x' confirmation, and an 'Add Combo to Bag' state. Adding built a single combo cart line carrying comboConfigId + comboComponents.

### After

All combo UI and the combo add-path are gone from the item page. The page is back to: image, description, badges, quantity, options panel, Add to Bag, reviews. The page no longer loads ComboConfig at all (the loadComboData/comboForItem/comboPricing imports and the combo state were removed), so a combo can never be offered there again without a new code change. Options, Happy Hour pricing, favorites, sharing and reviews are unchanged.

---

## LEFT UNTOUCHED (pre-existing, your call) — /combos page and the 'Combos' link in the Order menu

**Status:** draft  
**App entity:** BuilderReport `6ab82a6fb357686f36e85dc2`

### Before

The /combos page (a 'COMBO ISLE' hero with a Coming Soon section and an 'Order from the Menu' button) and its 'Combos' entry in the header's Order group existed before this build; the build had briefly made the live builder run for web visitors, which was reverted earlier today.

### After

Unchanged and restored to its pre-build state: web visitors see the Coming Soon teaser, no builder, no combo prices, and no savings text — the builder only runs inside the native app. It is not part of the combo/Deluxe build, so I left it alone. Tell me if you want the page and/or the nav entry removed and I'll do it with your go-ahead.
