import React from 'react';

const ORDER_TYPE_LABELS = { pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-In' };

// The customer's own order, as they see it on the pay page: what they ordered,
// the totals, and the running total with the tip they picked.
export default function PayOrderSummary({ order, tip }) {
  const subtotal = Number(order.subtotal) || 0;
  const tax = Number(order.tax) || 0;
  const deliveryFee = Number(order.delivery_fee) || 0;
  const total = subtotal + tax + deliveryFee + (Number(tip) || 0);

  return (
    <div className="card-diner p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="font-heading text-lg text-obsidian-roast">Order #{order.order_number}</h2>
        <span className="text-xs font-heading uppercase tracking-widest text-muted-foreground flex-shrink-0">
          {ORDER_TYPE_LABELS[order.order_type] || 'Pickup'}
        </span>
      </div>

      <div className="space-y-2 border-b border-border pb-3 mb-3">
        {(order.items || []).map((item, idx) => (
          <div key={`${item.name}-${idx}`} className="flex justify-between gap-3 text-sm">
            <span className="text-obsidian-roast">
              <span className="font-semibold">{item.quantity}×</span> {item.name}
              {item.modifiers?.length > 0 && (
                <span className="block text-xs text-muted-foreground">{item.modifiers.join(', ')}</span>
              )}
            </span>
            <span className="text-obsidian-roast flex-shrink-0">
              ${((Number(item.price) || 0) * item.quantity).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
        </div>
        {deliveryFee > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Delivery</span><span>${deliveryFee.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between text-muted-foreground">
          <span>Tax (6%)</span><span>${tax.toFixed(2)}</span>
        </div>
        {tip > 0 && (
          <div className="flex justify-between text-muted-foreground">
            <span>Tip</span><span>${tip.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between font-heading text-obsidian-roast text-base pt-2 border-t border-border">
          <span>Total</span><span>${total.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}