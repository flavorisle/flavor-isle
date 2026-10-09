# Builder report: tax_rounding_fix_2026-09-26

2 items in this batch.

## Online checkout tax rounding — CLIENT side (src/context/CartContext.jsx, src/pages/Checkout.jsx, new src/lib/tax.js)

**Status:** applied  
**App entity:** BuilderReport `6ab885f42683f168dbf6e2c4`

### Before

CartContext:
  const tax = adjustedSubtotal * 0.06;
  const total = adjustedSubtotal + deliveryFee + tax;

Checkout (total sent to the server):
  const totalWithTip = +(Math.max(0, total - rewardDiscount) + tipAmount).toFixed(2);

Checkout (group split shares):
  const pTax = +(pSub * 0.06).toFixed(2);
  const pTotal = +(pSub + pTax + feeTip).toFixed(2);

### After

NEW src/lib/tax.js — one rule, whole cents, round half up:
  roundHalfUp(v) = Math.floor(v + 0.5)
  toCents(d) = roundHalfUp(d * 100)
  fromCents(c) = c / 100
  salesTaxCents(subtotalCents, basisPoints = 600) = Math.floor((subtotalCents * 600 + 5000) / 10000)   // 600 bps = 6% KY tax

CartContext:
  const taxCentsValue = salesTaxCents(toCents(adjustedSubtotal));
  const tax = fromCents(taxCentsValue);
  const total = fromCents(toCents(adjustedSubtotal) + toCents(deliveryFee) + taxCentsValue);

Checkout:
  const totalWithTip = fromCents(toCents(Math.max(0, total - rewardDiscount)) + toCents(tipAmount));
  const pTax = salesTaxFor(pSub);
  const pTotal = fromCents(toCents(pSub) + toCents(pTax) + toCents(feeTip));

---

## Price verification tax rounding — SERVER authority (base44/shared/verifyOrderPricing.ts + new base44/shared/taxMath.ts; used by createPaymentIntent and createGroupPayment)

**Status:** applied  
**App entity:** BuilderReport `6ab885f42683f168dbf6e2c5`

### Before

const TAX_RATE = 0.06;
  const serverTax = round2(adjustedSubtotal * TAX_RATE);
  const serverTotal = round2(Math.max(0, adjustedSubtotal + serverDeliveryFee + serverTax - serverDiscount) + serverTip);

### After

NEW base44/shared/taxMath.ts (mirror of src/lib/tax.js):
  roundHalfUp / toCents / fromCents
  salesTaxCents(subtotalCents, basisPoints = 600) = Math.floor((subtotalCents * 600 + 5000) / 10000)

verifyOrderPricing:
  const adjustedCents = toCents(adjustedSubtotal);
  const taxCents = salesTaxCents(adjustedCents);
  const serverTax = fromCents(taxCents);
  const serverTotal = fromCents(
    Math.max(0, adjustedCents + toCents(serverDeliveryFee) + taxCents - toCents(serverDiscount)) + toCents(serverTip),
  );
