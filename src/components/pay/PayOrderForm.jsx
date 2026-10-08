import React, { useState } from 'react';
import { PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// The card step on the pay page. Tapping Pay prices the tip onto the order
// first — server-side, against the order's real subtotal — and only then
// confirms, so the amount charged is always the amount the server computed.
// A step that never answers must never leave the button spinning forever, so
// every wait on the way to the charge is bounded.
const withDeadline = (promise, ms) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('timed out')), ms)),
  ]);

export default function PayOrderForm({ orderNumber, clientSecret, tip, total, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);

  const handlePay = async (e) => {
    e.preventDefault();
    if (!stripe || !elements || paying) return;
    setPaying(true);
    onError('');

    try {
      // The tip is priced server-side against the order's real subtotal.
      const tipRes = await withDeadline(
        base44.functions.invoke('applyPhoneOrderTip', { order_number: orderNumber, tip }),
        12000,
      );
      if (tipRes.data?.ok !== true) {
        onError(tipRes.data?.error || 'We could not price that tip. Please try again.');
        setPaying(false);
        return;
      }

      // Keep the card form's amount in step with the re-priced total. The amount
      // is already set on the payment itself, so a slow refresh here must not
      // hold up the confirmation.
      if (typeof elements.fetchUpdates === 'function') {
        try {
          await withDeadline(elements.fetchUpdates(), 5000);
        } catch (refreshErr) {
          console.error('Payment form refresh skipped:', refreshErr.message);
        }
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        clientSecret,
        confirmParams: { return_url: `${window.location.origin}/pay/${orderNumber}` },
        redirect: 'if_required',
      });

      if (error) {
        onError(error.message || 'That payment did not go through. Please try again.');
        setPaying(false);
        return;
      }
      if (paymentIntent?.status === 'succeeded') {
        onSuccess();
        return;
      }
      onError('Your payment is still processing. If it does not settle shortly, call us at (270) 563-4618.');
      setPaying(false);
    } catch (err) {
      console.error('Pay page charge failed to start:', err?.message);
      onError(
        err?.response?.data?.error ||
          "We couldn't start that payment. Check your connection and tap Pay again, or call us at (270) 563-4618.",
      );
      setPaying(false);
    }
  };

  const disabled = !ready || paying;

  return (
    <form onSubmit={handlePay} className="card-diner p-5">
      <PaymentElement onReady={() => setReady(true)} />
      {!ready && <p className="text-xs text-muted-foreground mt-3">Loading the secure card form…</p>}
      <button
        type="submit"
        disabled={disabled}
        className={`w-full mt-4 py-4 font-heading text-sm flex items-center justify-center gap-2 ${
          disabled ? 'rounded-full bg-muted text-muted-foreground cursor-not-allowed' : 'btn-cherry chrome-hover'
        }`}
      >
        <Lock size={15} />
        {paying ? 'Processing…' : `Pay $${total.toFixed(2)}`}
      </button>
      <p className="text-[11px] text-muted-foreground text-center mt-3">
        Nothing is cooked until this goes through.
      </p>
    </form>
  );
}