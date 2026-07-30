import React, { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Lock, Check, CreditCard } from 'lucide-react';

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

// One person's payment form. Pays exactly this person's share.
function PersonPayment({ intent, onComplete }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);
  const [paid, setPaid] = useState(false);
  const [err, setErr] = useState('');

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || paid) return;
    setPaying(true);
    setErr('');
    const result = await stripe.confirmCardPayment(intent.clientSecret, {
      payment_method: { card: elements.getElement(CardElement) },
    });
    if (result.error) {
      setErr(result.error.message);
      setPaying(false);
    } else if (result.paymentIntent.status === 'succeeded') {
      setPaid(true);
      onComplete(intent);
    }
  };

  return (
    <div className={`rounded-2xl border-2 p-4 transition-all ${paid ? 'border-patina-mint bg-patina-mint/5' : 'border-border bg-muted'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CreditCard size={16} className="text-patina-mint" />
          <span className="font-heading text-sm text-obsidian-roast">{intent.person_name}</span>
        </div>
        <span className="font-heading text-base text-midnight-cherry">${intent.amount.toFixed(2)}</span>
      </div>

      {paid ? (
        <div className="flex items-center gap-2 text-patina-mint font-heading text-sm py-3">
          <Check size={16} /> Paid
        </div>
      ) : (
        <>
          <div className="border border-border rounded-xl px-3 py-3 bg-white mb-3">
            <CardElement options={CARD_STYLE} />
          </div>
          {err && <p className="text-xs text-destructive mb-2">{err}</p>}
          <button
            onClick={handlePay}
            disabled={paying || !stripe}
            className="btn-cherry chrome-hover w-full py-3 text-xs font-heading flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {paying ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Lock size={13} /> Pay ${intent.amount.toFixed(2)}</>}
          </button>
        </>
      )}
    </div>
  );
}

export default function SplitPayment({ intents, publishableKey, orderNumber, onSuccess, onError }) {
  const [stripePromise] = useState(() => loadStripe(publishableKey));
  const [paidIntents, setPaidIntents] = useState([]);

  const handleComplete = (intent) => {
    setPaidIntents(prev => {
      const next = prev.find(i => i.intentId === intent.intentId) ? prev : [...prev, intent];
      if (next.length === intents.length) {
        onSuccess(orderNumber);
      }
      return next;
    });
  };

  const progress = `${paidIntents.length}/${intents.length} paid`;

  return (
    <div className="card-diner p-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-heading text-lg text-obsidian-roast">Split Payment</h2>
        <span className="text-xs font-heading text-patina-mint bg-patina-mint/10 px-2 py-0.5 rounded-full">{progress}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-5">Each person pays their own share. One delivery fee shared across the group.</p>
      <div className="space-y-4">
        {intents.map(intent => (
          <Elements key={intent.intentId} stripe={stripePromise} options={{ clientSecret: intent.clientSecret }}>
            <PersonPayment intent={intent} onComplete={handleComplete} />
          </Elements>
        ))}
      </div>
    </div>
  );
}