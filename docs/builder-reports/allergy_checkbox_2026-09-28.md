# Builder report: allergy_checkbox_2026-09-28

5 items in this batch.

## One-Tap (Apple Pay / Google Pay) checkout — allergy guard

**Status:** applied  
**App entity:** BuilderReport `6aba3a72ef47646794ab5556`

### Before

Wallet checkout could place an order without the allergy text even if the box was ticked

### After

Wallet path now blocks with "Tell us what the allergy is, then tap again — or pay with the card form below." and no order/intent is created until the text is typed.

---

## Verification — real orders and logs only (no test orders)

**Status:** applied  
**App entity:** BuilderReport `6aba3a72ef47646794ab5557`

### Before

(not verified)

### After

Real paid online orders read back live from Square: Order #399271 (Sep 27 2026, completed, paid) — Square ticket note reads "PICKUP\nJordan Elmore\n2707832053\n\nNOTES: Please add Ghram cracker NO WHIPPED CREAM". Same path confirmed on #965239, #697018, #741785.

---

## Confirmed untouched — menu, pricing, tax, discounts, rewards

**Status:** applied  
**App entity:** BuilderReport `6aba3a72ef47646794ab5558`

### Before

unchanged

### After

unchanged

---

## Order notes — allergy line placed first, prefixed ALLERGY:

**Status:** applied  
**App entity:** BuilderReport `6aba3a72ef47646794ab5555`

### Before

notes = special instructions, then requested extras

### After

notes = "ALLERGY: <what they typed>" FIRST, then their special instructions, then requested extras. Prefix stands out on the ticket and cannot be buried under other notes. Both are kept when the customer typed both.

---

## Checkout — allergy notification checkbox (customer UI)

**Status:** applied  
**App entity:** BuilderReport `6aba3a72ef47646794ab5554`

### Before

(not present)

### After

Checkbox "Someone in my party has a food allergy" sits directly below the Special Instructions box. Ticking it opens a required text box labelled "Tell us what the allergy is *". Checkout blocks with "Tell us what the allergy is." until the customer types something.
