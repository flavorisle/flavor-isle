import React from 'react';
import { CreditCard, Plus, Check } from 'lucide-react';

const BRAND_BADGE = {
  visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', discover: 'Discover',
  diners: 'Diners', jcb: 'JCB', unionpay: 'UnionPay',
};

// Radio-style selector for choosing a saved card or a fresh card at checkout.
// Pure presentational — selection state is owned by the parent (Checkout).
export default function SavedCardSelector({ cards, selectedId, onSelect }) {
  if (!cards || cards.length === 0) return null;

  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your saved cards</p>
      <div className="space-y-2">
        {cards.map((card) => {
          const selected = selectedId === card.stripe_payment_method_id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelect(card.stripe_payment_method_id)}
              className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
                selected ? 'border-midnight-cherry bg-midnight-cherry/5' : 'border-border hover:border-midnight-cherry/40'
              }`}
            >
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                selected ? 'border-midnight-cherry bg-midnight-cherry' : 'border-border'
              }`}>
                {selected && <Check size={12} className="text-white" />}
              </div>
              <div className="w-9 h-9 rounded-full bg-midnight-cherry/10 flex items-center justify-center flex-shrink-0">
                <CreditCard size={16} className="text-midnight-cherry" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm text-obsidian-roast">
                  {BRAND_BADGE[card.brand] || card.brand || 'Card'} •••• {card.last4}
                </p>
                <p className="text-xs text-muted-foreground">Exp {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}</p>
              </div>
              {card.is_default && (
                <span className="text-xs bg-smashie-yellow/20 text-obsidian-roast px-2 py-0.5 rounded-full font-heading">Default</span>
              )}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => onSelect('new')}
          className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 transition-all text-left ${
            selectedId === 'new' ? 'border-midnight-cherry bg-midnight-cherry/5' : 'border-border hover:border-midnight-cherry/40'
          }`}
        >
          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
            selectedId === 'new' ? 'border-midnight-cherry bg-midnight-cherry' : 'border-border'
          }`}>
            {selectedId === 'new' && <Check size={12} className="text-white" />}
          </div>
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
            <Plus size={16} className="text-muted-foreground" />
          </div>
          <div className="flex-1">
            <p className="font-heading text-sm text-obsidian-roast">Use a new card</p>
            <p className="text-xs text-muted-foreground">Enter card details manually</p>
          </div>
        </button>
      </div>
    </div>
  );
}