# Builder report: phone_pay_page_embed_2026-09-28

5 items in this batch.

## Phone payment — embedded pay page (replaces hosted checkout)

**Status:** applied  
**App entity:** BuilderReport `6abb2ac913a774640d3777cc`

### Before

logPhoneOrder created a Stripe Checkout hosted session and texted the long checkout.stripe.com URL. The customer left flavor-isle.com to pay, and the amount was fixed at the texted total with no tip step.

### After

logPhoneOrder now creates a PaymentIntent server-side priced from the same verified numbers (subtotal from the verified items Smashie read back + 6% tax — nothing client-supplied) and stores the intent id in stripe_session_id. The existing payment_intent.succeeded webhook already matches on that field, so it marks the order paid and pushes it to Square + the kitchen unchanged. The texted link (and the backup email link) is now the short flavor-isle.com/pay/PH123456. New page /pay/:orderNumber shows the order summary and mounts the embedded card form through the new getPhoneOrderPayment endpoint (order summary + intent client secret + publishable key, same createPaymentIntent/getStripePublishableKey pattern). The customer never leaves flavor-isle.com. No receipt_email is set, so no processor-branded receipt is sent.

---

## Tip prompt on the /pay page

**Status:** applied  
**App entity:** BuilderReport `6abb2ac913a774640d3777cd`

### Before

Phone orders had no tip step at all — the texted amount was the final charge, and the crew got no tip on phone orders.

### After

The /pay page offers the same smart tipping as web Checkout.jsx: 18% suggested (15/18/20% presets), flat $1/$2/$3 when subtotal * 0.20 < $1, a custom amount, and a no-tip skip. Tapping Pay calls the new applyPhoneOrderTip endpoint before confirming: the amount is rebuilt server-side from the stored order (subtotal + tax + delivery fee + tip), capped at the food subtotal (or $10 on tiny orders), written to the PaymentIntent, and saved on the Order's tip + total — before the charge can settle, so the webhook pushes the tip to Square with the payment. The browser only requests a tip, never a total. Kitchen tickets are untouched: no tip or discount lines added.

---

## Customer-facing wording — no payment-processor brand

**Status:** applied  
**App entity:** BuilderReport `6abb2ac913a774640d3777ce`

### Before

"secure Stripe payment link" appeared in the Smashie agent (description, PAYMENT LINKS section, PHONE ORDERING step 5, and the logPhoneOrder tool description). The payment email read "Tap the secure Stripe link below to pay", and the reply message to Smashie said "A secure Stripe link" was sent.

### After

Every customer-facing string now says "secure payment link" / "payment link". Smashie's prompt additionally states that the link opens Flavor Isle's own payment page (flavor-isle.com/pay/...) where the customer can add a tip for the crew, and that he must never name a payment processor. Voice router, website chat, SMS copy and email copy were swept: the only remaining occurrences of the processor's name are internal code identifiers and environment keys, which no customer ever sees.

---

## Square fallback kept — manual pay at counter flag

**Status:** applied  
**App entity:** BuilderReport `6abb2ac913a774640d3777cf`

### Before

If payment setup failed, the order was still saved but nothing on the record marked it as needing manual payment — staff only had the console log and Smashie's message.

### After

The Order entity gains manual_pay_required (boolean, default false). When PaymentIntent creation fails, logPhoneOrder flags the saved order manual_pay_required = true, leaves payment_url empty, logs the failure, and tells Smashie to have the customer pay at the counter. The /pay page and applyPhoneOrderTip both detect an order with no payment intent and show a "Pay at the counter" state instead of a form that cannot work. Online checkout orders are never flagged.

---

## Constraints honored

**Status:** applied  
**App entity:** BuilderReport `6abb2ac913a774640d3777d0`

### Before

Risk that the pay-page build would touch menu, pricing, tax, category structure, ordering hours or kitchen tickets.

### After

No menu, pricing, tax, category-structure, ordering-hours or kitchen-ticket changes were made. The stripeWebhook was not modified (reused as-is via stripe_session_id). No test orders were created — both new endpoints were verified with a non-existent order number (clean 404, no writes), and verification is left to real phone orders checked in SquareSyncLog and the webhook logs.
