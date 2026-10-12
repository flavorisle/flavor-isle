import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CreditCard, Loader2 } from 'lucide-react';

// The saved cards Helcim holds for the signed-in customer, on our own secure
// payment page (issue #97, Part B step 14).
//
// It renders nothing at all unless the customer is signed in, Helcim is
// configured, and the vault actually holds a card — so with no Helcim
// credentials this page is exactly the plain card form it is today. Cards live
// in Helcim's vault; the charge is made server-side for the order's own saved
// total, and the server re-verifies the payment before anything reaches the
// kitchen.
export default function HelcimSavedCardPay({ orderNumber, onPaid }) {
  const [state, setState] = useState({ loading: true, configured: false, cards: [] });
  const [payingId, setPayingId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const authed = await base44.auth.isAuthenticated().catch(() => false);
      if (!authed || cancelled) {
        setState({ loading: false, configured: false, cards: [] });
        return;
      }
      try {
        const res = await base44.functions.invoke('manageSavedCards', { action: 'list', provider: 'helcim' });
        const data = res?.data || res;
        if (!cancelled) setState({ loading: false, configured: !!data?.configured, cards: data?.cards || [] });
      } catch {
        if (!cancelled) setState({ loading: false, configured: false, cards: [] });
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (state.loading || !state.configured || state.cards.length === 0) return null;

  const pay = async (card) => {
    setPayingId(card.id);
    setError('');
    try {
      const res = await base44.functions.invoke('payWithSavedCard', {
        order_number: orderNumber,
        card_id: card.id,
        card_token: card.card_token,
      });
      const data = res?.data || res;
      if (data?.settled) {
        onPaid(!!data?.merch);
        return;
      }
      throw new Error(data?.error || data?.reason || 'That card could not be charged.');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'That card could not be charged. Please use the card form below.');
    } finally {
      setPayingId('');
    }
  };

  return (
    <div className="mb-5 rounded-2xl border border-border p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pay with a saved card</p>
      <div className="space-y-2">
        {state.cards.map((card) => (
          <button
            key={card.id}
            type="button"
            onClick={() => pay(card)}
            disabled={!!payingId}
            className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-midnight-cherry/40 transition-colors text-left disabled:opacity-60"
          >
            <CreditCard size={16} className="text-midnight-cherry flex-shrink-0" />
            <span className="flex-1 text-sm text-obsidian-roast">
              {card.brand ? `${card.brand} ` : ''}•••• {card.last4}
              {card.exp_month ? ` · exp ${String(card.exp_month).padStart(2, '0')}/${String(card.exp_year || '').slice(-2)}` : ''}
            </span>
            {payingId === card.id
              ? <Loader2 size={14} className="animate-spin" />
              : <span className="text-xs font-heading text-patina-mint">Use this card</span>}
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}