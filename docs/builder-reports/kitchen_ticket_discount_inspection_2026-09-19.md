# Builder report: kitchen_ticket_discount_inspection_2026-09-19

## Kitchen Ticket — BagTicket.jsx + printKitchenOrder

**Status:** approved  
**App entity:** BuilderReport `6aaf22e09bbb47e30f26b1b3`

### Before

INSPECTED (no changes made). BagTicket.jsx (src/components/admin/BagTicket.jsx) renders: logo/header, order number, customer name, pickup label (Pickup/Curbside/Dine-In/Delivery), vehicle/zone/table, placed & ready times, ITEMS (qty x name + modifiers), SPECIAL INSTRUCTIONS, and a PAID / PAY AT PICKUP badge. printKitchenOrder/entry.ts (SMS to kitchen phone) renders: order type label, order number, customer, phone/table/address, items (qty x name + Deluxe-summarized modifiers), and special instructions. ticketFormat.ts only summarizes Deluxe preset modifiers.

### After

FINDING: NO discount, savings, or promotion text/amounts appear on either ticket — no 'Happy Hour 50% Off Drinks' line, no discount line, no strikethrough/reduced price, and order.happy_hour_discount / order.discount are not referenced anywhere. Neither ticket prints subtotal/tax/total — only items + modifiers, customer/fulfillment info, special instructions, and (bag ticket only) a paid/unpaid status badge. The kitchen ticket already complies with Wesley's rule that tickets exclude all discount/savings/promo info. NO FIX MADE — no code changed.
