# Builder report: approved_combo_expansion_2026-09-19

## Isle Combo expansion (ModifierModal.jsx)

**Status:** applied  
**App entity:** BuilderReport `6aae3e236fccdc9b55802c4a`

### Before

CURRENT BEHAVIOR:
- 'Make it an Isle Combo' appears only on burger items.
- Combo = burger + French Fries (crinkle, $3.25) + Vanilla Milkshake with a chosen shake flavor.
- $1.50 combo discount. Shake flavor picker shown (16 flavors from the Vanilla Milkshake FLAVOR CHOICE list).
- No side choice, no drink choice — crinkle fries and a shake are fixed.

### After

ISLE COMBO EXPANSION — DRAFT PLAN (pending Wesley's emailed approval)

PROPOSED BEHAVIOR:
- 'Make it an Isle Combo' still burgers only.
- When combo is selected, the customer picks in this order:
  1. SIDE (choose one): French Fries (crinkle), Tater Tots, Curly Fries, Cajun Waffle Fries, Onion Rings. All are $3.25 — no price difference between sides.
  2. DRINK TYPE (choose one): 'Soft Drink' or 'Milkshake'.
     - If Soft Drink: soda choice list — Coke, Coke Zero, Dr. Pepper, Sprite, Root Beer, Sweet Tea (12oz base, no upcharge).
     - If Milkshake: existing shake flavor picker (16 flavors), unchanged.
- Pricing: combo add-on = selected side price + selected drink/shake price + any flavor upcharge − $1.50 combo discount. A soft drink ($1.98) is cheaper than a shake, so the drink combo add-on will be lower than the shake combo add-on — customer pays the real difference; the $1.50 savings stays constant.
- 'Add to Order' stays disabled until BOTH a side AND a drink choice (soda or shake flavor) are selected.
- Cart line items: the chosen side (real name) + the chosen drink (Classic Drinks with the soda modifier, OR Vanilla Milkshake with the shake flavor modifier).

OPEN QUESTIONS FOR WESLEY (decide before build):
- Drink size: use 12oz base in the combo (simplest, matches $1.98), or let customer pick 14oz (+$0.52) / 20oz (+$1.51)?
- Sweet Potato Fries ($3.25) — add as a 6th side option, or stick to the 5 listed?
- Keep the $1.50 combo discount the same for both drink and shake combos?

FILE THAT WOULD CHANGE (no edits made yet):
- src/components/ModifierModal.jsx — combo toggle, side selector, drink-type toggle, soda list, confirm logic.

Nothing else touched. Nothing goes live until Wesley approves by email.
