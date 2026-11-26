import { X } from 'lucide-react';
import { useCart } from '@/context/CartContext';

// Issue #360. One line, and only when it matters: the bag was re-priced from the
// live menu, or a choice in it is no longer offered. Nothing is ever removed.
export default function CartPriceNotice({ className = '' }) {
  const { priceNotice, clearPriceNotice } = useCart();
  if (!priceNotice) return null;
  const message = priceNotice.kind === 'changed'
    ? `Menu prices changed since you added these: ${(priceNotice.names || []).join(', ')}. Your total is now $${Number(priceNotice.to || 0).toFixed(2)}.`
    : `Nothing was removed from your bag. ${priceNotice.message || ''}`.trim();
  return (
    <div role="status" className={`flex items-start gap-2 rounded-xl border border-smashie-yellow bg-[#FFF8E1] px-3 py-2 text-[13px] leading-snug text-obsidian-roast ${className}`}>
      <span className="flex-1">{message}</span>
      <button type="button" onClick={clearPriceNotice} aria-label="Dismiss price notice" className="p-1 -m-1 opacity-60 hover:opacity-100">
        <X size={14} />
      </button>
    </div>
  );
}