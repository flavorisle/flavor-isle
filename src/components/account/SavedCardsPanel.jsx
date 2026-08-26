import React, { useState, useEffect, useRef } from 'react';
import { CreditCard, Plus, Trash2, Star, Loader2, X, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const CARD_STYLE = {
  style: {
    base: {
      fontSize: '15px',
      color: '#141414',
      fontFamily: 'Open Sans, system-ui, sans-serif',
      '::placeholder': { color: '#9ca3af' },
      iconColor: '#C0392B',
    },
    invalid: { color: '#dc2626', iconColor: '#dc2626' },
  },
  hidePostalCode: true,
};

const BRAND_BADGE = {
  visa: 'Visa', mastercard: 'Mastercard', amex: 'Amex', discover: 'Discover',
  diners: 'Diners', jcb: 'JCB', unionpay: 'UnionPay',
};

// Inner form that confirms the SetupIntent to save a new card. Must be
// rendered inside <Elements>.
function AddCardForm({ clientSecret, onSaved, onCancel, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [saving, setSaving] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    onError('');
    const result = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });
    if (result.error) {
      onError(result.error.message);
      setSaving(false);
    } else if (result.setupIntent.status === 'succeeded') {
      // Persist the new payment method to the customer's saved cards.
      try {
        const pm = String(result.setupIntent.payment_method);
        const res = await base44.functions.invoke('manageSavedCards', { action: 'save', paymentMethodId: pm });
        onSaved(res.data.card);
      } catch (err) {
        onError(err?.response?.data?.error || 'Could not save card. Please try again.');
        setSaving(false);
      }
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="border border-border rounded-2xl px-4 py-4 bg-white">
        <CardElement options={CARD_STYLE} />
      </div>
      <div className="flex gap-3">
        <button type="submit" disabled={saving || !stripe}
          className="flex-1 btn-cherry chrome-hover py-3 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60">
          {saving ? <Loader2 size={15} className="animate-spin" /> : <><Check size={15} /> Save Card</>}
        </button>
        <button type="button" onClick={onCancel}
          className="px-4 py-3 bg-muted text-obsidian-roast rounded-2xl text-sm font-heading hover:bg-muted/70 transition-colors">
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function SavedCardsPanel() {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [setup, setSetup] = useState(null); // { clientSecret, publishableKey }
  const [stripePromise, setStripePromise] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const mounted = useRef(true);

  const loadCards = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('manageSavedCards', { action: 'list' });
      if (mounted.current) setCards(res.data?.cards || []);
    } catch {
      /* ignore — keep empty */
    } finally {
      if (mounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    mounted.current = true;
    loadCards();
    return () => { mounted.current = false; };
  }, []);

  const startAdd = async () => {
    setError('');
    try {
      const res = await base44.functions.invoke('manageSavedCards', { action: 'setup' });
      setSetup(res.data);
      setStripePromise(loadStripe(res.data.publishableKey));
      setAdding(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not start card setup. Please try again.');
    }
  };

  const handleSaved = (card) => {
    setAdding(false);
    setSetup(null);
    setStripePromise(null);
    loadCards();
  };

  const handleRemove = async (card) => {
    setBusyId(card.id);
    try {
      await base44.functions.invoke('manageSavedCards', { action: 'detach', paymentMethodId: card.stripe_payment_method_id });
      setCards((prev) => prev.filter((c) => c.id !== card.id));
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not remove card.');
    } finally {
      setBusyId(null);
    }
  };

  const handleSetDefault = async (card) => {
    setBusyId(card.id);
    try {
      await base44.functions.invoke('manageSavedCards', { action: 'setDefault', paymentMethodId: card.stripe_payment_method_id });
      setCards((prev) => prev.map((c) => ({ ...c, is_default: c.id === card.id })));
    } catch (err) {
      setError(err?.response?.data?.error || 'Could not set default card.');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="animate-spin text-midnight-cherry" size={28} />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading text-2xl text-obsidian-roast">Saved Cards</h2>
          <p className="text-sm text-muted-foreground">Store a card once for faster, one-tap checkout.</p>
        </div>
        {!adding && (
          <button onClick={startAdd} className="flex items-center gap-2 btn-mint px-4 py-2.5 text-sm font-heading">
            <Plus size={16} /> Add Card
          </button>
        )}
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive rounded-2xl px-4 py-3 text-sm">{error}</div>
      )}

      {adding && setup && stripePromise && (
        <div className="card-diner p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading text-lg text-obsidian-roast">Add a new card</h3>
            <button onClick={() => { setAdding(false); setSetup(null); setStripePromise(null); }}
              className="p-1.5 hover:bg-muted rounded-full transition-colors"><X size={18} /></button>
          </div>
          <Elements stripe={stripePromise} options={{ clientSecret: setup.clientSecret }}>
            <AddCardForm
              clientSecret={setup.clientSecret}
              onSaved={handleSaved}
              onCancel={() => { setAdding(false); setSetup(null); setStripePromise(null); }}
              onError={setError}
            />
          </Elements>
          <p className="text-xs text-muted-foreground mt-3">Your card is secured by Stripe. Flavor Isle never stores your card number.</p>
        </div>
      )}

      {cards.length === 0 && !adding ? (
        <div className="card-diner p-10 text-center">
          <CreditCard size={40} strokeWidth={1} className="mx-auto mb-3 text-muted-foreground" />
          <p className="font-heading text-lg text-obsidian-roast mb-1">No saved cards yet</p>
          <p className="text-sm text-muted-foreground mb-4">Add a card to speed through checkout next time.</p>
          <button onClick={startAdd} className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading inline-flex items-center gap-2">
            <Plus size={16} /> Add Your First Card
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.map((card) => (
            <div key={card.id} className="card-diner p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-full bg-midnight-cherry/10 flex items-center justify-center flex-shrink-0">
                <CreditCard size={20} className="text-midnight-cherry" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-heading text-base text-obsidian-roast">
                    {BRAND_BADGE[card.brand] || card.brand || 'Card'} •••• {card.last4}
                  </p>
                  {card.is_default && (
                    <span className="inline-flex items-center gap-1 text-xs bg-smashie-yellow/20 text-obsidian-roast px-2 py-0.5 rounded-full font-heading">
                      <Star size={11} className="fill-current" /> Default
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Expires {String(card.exp_month).padStart(2, '0')}/{String(card.exp_year).slice(-2)}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!card.is_default && (
                  <button onClick={() => handleSetDefault(card)} disabled={busyId === card.id}
                    className="text-xs text-patina-mint hover:text-teal-700 font-semibold transition-colors disabled:opacity-50">
                    {busyId === card.id ? '…' : 'Set default'}
                  </button>
                )}
                <button onClick={() => handleRemove(card)} disabled={busyId === card.id}
                  className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full transition-colors disabled:opacity-50"
                  aria-label="Remove card">
                  {busyId === card.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}