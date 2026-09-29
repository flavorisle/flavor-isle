# Builder report: product_page_combo_deluxe_2026-09-25

8 items in this batch.

## COMBO — ComboConfig rows written and remapped to the real menu sections (FLAG: breakfast combo hidden)

**Status:** draft  
**App entity:** BuilderReport `6ab8209e33a8670aedff5a32`

### Before

0 ComboConfig rows. Described categories 'Burgers','Fries','Fountain Soda','Breakfast','Hash Browns','Coffee' each matched 0 live items (verified by square_category, category, and display_category).

### After

3 rows written: Island Diner Burger Combo (main 'Old-Fashioned Burgers' 11 items, side 'Crunch & Munch' 8, drink 'Flow & Fizz' 2, 12%, active); All-American Breakfast Combo (Breakfast / Hash Browns / Coffee, 15%, active); Veggie Garden Lunch Combo (Seasonal & Supreme / Crunch & Munch / Flow & Fizz, 12%, inactive). FLAG: the breakfast combo resolves 0/0/0 — no breakfast, hash-brown, coffee, iced-tea, or side-salad items exist on the live menu — so it is hidden automatically instead of rendering empty pickers. Remap or switch it on once breakfast items exist.

---

## COMBO — product-page combo selection is now ComboConfig-driven (one validated cart line)

**Status:** draft  
**App entity:** BuilderReport `6ab8209e33a8670aedff5a31`

### Before

The product page offered 'Make it an Isle Combo' inside the modifier panel using a hard-coded $1.50 flat discount and hard-coded side/shake names (src/lib/comboData.js). That model puts the discount on a separate cart line with no configuration behind it, so the server's price authority rejected it — combos built this way could not be paid for.

### After

New ComboPicker: 'Make it a combo?' -> pick a side and a drink, customize either inline, price = (main + side + drink) x (1 - discount%). Cart shows the offer plus its components and 'Combo savings - $X'. The unpayable flat-discount builder was removed from both the product-page panel and the menu-card modal, so no customer can build a combo that fails at checkout.

---

## COMBO BUILDER — live for every web visitor on /combos

**Status:** rejected  
**App entity:** BuilderReport `6ab8209e33a8670aedff5a35`

### Before

/combos showed a 'Coming Soon' teaser to web visitors; the live builder rendered only inside the native build or installed PWA. The builder also listed every active ComboConfig row, including any whose columns would come up empty.

### After

REVERTED 2026-09-26 at the owner's request: the combo builder is app-only again, exactly as before. Web visitors to /combos see the 'Coming Soon' hero (no Start Building button) and the COMBO BUILDER 'Coming Soon' section with an 'Order from the Menu' button. The builder renders only inside the native build / installed PWA. The builder's own fixes stayed (it only lists combos whose side and drink columns actually resolve, catalog-backed items only). Combo building on an individual item's page is unchanged.

---

## PHONE — deluxeOrderHelper now matches real burgers (was matching zero)

**Status:** draft  
**App entity:** BuilderReport `6ab8209e33a8670aedff5a37`

### Before

The helper filtered candidates by category in ['Burgers','Chicken'], but every MenuItem's category field reads 'Specials' — so it matched zero burgers and Smashie could not read real toppings or prices from it.

### After

It now resolves each item's real section (display_category -> square_category -> category) against the burger and sandwich sections plus a burger/sandwich name fallback, and still returns each matched item's live modifier groups. The Deluxe definition it reports is Pickles, Onions, Tomatoes, Lettuce + exactly one condiment, with default_condiment Mayo on the web side while the phone still asks the caller mustard or mayo.

---

## COMBO — server-side discount authority (already in place) + nested-option pricing fix

**Status:** draft  
**App entity:** BuilderReport `6ab8209e33a8670aedff5a33`

### Before

verifyOrderPricing already repriced combo lines from authoritative data (comboComponents + comboConfigId, discount from ComboConfig) — no client price trusted, so the combo discount was never taken from the browser. But its modifier price map read only the top-level option groups, so any line carrying a nested choice (sauce Lite/Extra preferences, soda ice or flavor follow-ups) was rejected as 'not a permitted selection' — those carts could not check out at all.

### After

The modifier map now walks nested option lists (child_modifier_lists) recursively, still using catalog prices only. Verified against the live catalog that a burger's Deluxe selections all resolve to real catalog options: Pickle->'Pickles', Onion->'Onion', Tomato->'Tomato', Lettuce->'Lettuce', Mayo->'Mayo'.

---

## DELUXE — master switch ON, definition locked to exactly one condiment (mayo default), Pulse control added

**Status:** draft  
**App entity:** BuilderReport `6ab8209e33a8670aedff5a36`

### Before

MenuSetting.deluxe.enabled was false -> no Deluxe button anywhere. Preset toppings were Mustard, Lettuce, Tomato, Onion, Pickle: mustard silently defaulted, nothing prevented both condiments being selected, and the preset was limited to 24 hard-coded item ids.

### After

Master switch ON. Preset is Pickles, Onions, Tomatoes, Lettuce plus EXACTLY ONE condiment, enforced in code (every condiment is stripped and the chosen one appended, so mustard and mayo can never both be selected). Web default is now Mayo, matching the phone rule, and Pulse has a 'Deluxe condiment' choice (Mayo / Mustard) that rewrites the stored preset on the MenuSetting record so it reaches customers. appliesTo was cleared from the old 24 ids so every burger carrying the toppings shows the button — restrict it again in Pulse if you want it narrower.

---

## PRODUCT PAGE — item detail page (image, name, description, price, customizer, share link, add-to-cart)

**Status:** draft  
**App entity:** BuilderReport `6ab8209e33a8670aedff5a30`

### Before

Item detail page existed with hero image, name, description, price, calories, tags, favorite, share link, quantity, modifier customizer, reviews, and add-to-cart. Combo selection and Deluxe were both inert: Deluxe's master switch was off, and the combo option used a hard-coded flat-discount model that could not check out.

### After

Same page, same layout and quick-add behaviour on menu cards, now with the ComboConfig combo section (right column) and a live 'Make it Deluxe' button on burgers. The Add to Bag CTA reflects the combo price and shows the combo savings when a combo is active.

---

## KITCHEN TICKETS — combo shows its components, never any discount or promo text

**Status:** draft  
**App entity:** BuilderReport `6ab8209e33a8670aedff5a34`

### Before

No combo lines existed, so there was nothing to leak — but the order payload had no combo savings concept, and the old model's discount was baked into a line price with no kitchen-facing component list.

### After

The combo line's name is the offer plus its components, e.g. 'Island Diner Burger Combo: Cheeseburger + French Fries + Classic Drinks', and its modifier list carries the chosen options, so the kitchen and the Square line name see what to make. The savings amount is excluded from the order payload entirely — the POS push, kitchen SMS ticket, and bag ticket show no discount, savings, or promo wording.
