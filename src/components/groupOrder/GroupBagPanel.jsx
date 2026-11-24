import React, { useState } from 'react';
import { ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';

// The bag a participant builds with the menu's own cards, handed to the group as
// their lines on the one ticket (issue #356). Only what is in the bag right now
// is sent; the server prices every line from the catalog.
const itemIdOf = (line) => String(line.productId || line.id || '').split('__')[0];

export default function GroupBagPanel({ code, participantName, canAdd, onUpdated }) {
  const { cartItems, removeItem, subtotal } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const addToGroup = async () => {
    setError('');
    if (!participantName.trim()) { setError('Add your first name above first.'); return; }
    if (cartItems.length === 0) { setError('Your bag is empty — add something from the menu.'); return; }
    setBusy(true);
    try {
      const res = await base44.functions.invoke('addGroupOrderLines', {
        code,
        participant_name: participantName.trim(),
        lines: cartItems.map((line) => ({
          item_id: itemIdOf(line),
          quantity: line.quantity,
          selected_mods: line.selectedModifiers || [],
          core_level: line.flavorLevel || '',
          salt_answer: line.saltNote || '',
          allergy_note: line.allergyNote || '',
        })),
      });
      const data = res?.data || res;
      if (!data?.ok) throw new Error(data?.error || 'Your items could not be added.');
      // The lines now live on the group, so they leave the bag.
      cartItems.forEach((line) => removeItem(line.id));
      onUpdated?.(data);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Your items could not be added.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card-diner p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShoppingBag size={18} className="text-midnight-cherry" />
        <h3 className="font-heading text-lg text-obsidian-roast">Your bag</h3>
        <span className="ml-auto text-sm text-muted-foreground">${Number(subtotal || 0).toFixed(2)}</span>
      </div>

      {cartItems.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing in your bag yet. Add what you want from the menu below, then send it to the group.
        </p>
      ) : (
        <ul className="space-y-2 mb-3">
          {cartItems.map((line) => (
            <li key={line.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="text-obsidian-roast">
                  {line.name} <span className="text-muted-foreground">× {line.quantity}</span>
                </p>
                {(line.selectedModifiers || []).length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {(line.selectedModifiers || []).map((m) => m.name).join(', ')}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => removeItem(line.id)}
                aria-label={`Remove ${line.name}`}
                className="tap-44 flex items-center justify-center text-muted-foreground hover:text-destructive"
              >
                <Trash2 size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={addToGroup}
        disabled={busy || cartItems.length === 0 || !canAdd}
        className="btn-cherry chrome-hover w-full py-3 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? 'Adding…' : 'Add my items to the group'} <ArrowRight size={15} />
      </button>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
      <p className="text-xs text-muted-foreground mt-2">
        Everything in your bag goes onto this group's one ticket.
      </p>
    </div>
  );
}