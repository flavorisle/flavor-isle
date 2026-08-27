import React, { useState, useEffect, useRef } from 'react';
import { useStripe } from '@stripe/react-stripe-js';

// Google Pay / Apple Pay via the Stripe Payment Request API. The branded
// buttons are always displayed so customers on supported devices can tap to
// pay; on unsupported browsers the native sheet won't open and the card form
// below remains the fallback. Must be used inside <Elements>.
export default function WalletPayButton({ clientSecret, total, label, onSuccess, onError }) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [busy, setBusy] = useState(false);

  // Keep the latest callbacks without re-running the setup effect on every render.
  const cbRef = useRef({ onSuccess, onError });
  cbRef.current = { onSuccess, onError };

  useEffect(() => {
    if (!stripe || !clientSecret) return;

    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: { label: label || 'Flavor Isle order', amount: Math.round((total || 0) * 100) },
      requestPayerName: true,
      requestPayerEmail: true,
      requestPayerPhone: true,
    });
    setPaymentRequest(pr);

    const onPaymentMethod = async (ev) => {
      setBusy(true);
      try {
        const { error, paymentIntent } = await stripe.confirmCardPayment(
          clientSecret,
          { payment_method: ev.paymentMethod.id },
          { handleActions: false }
        );

        if (error) {
          ev.complete('fail');
          cbRef.current.onError(error.message);
          return;
        }

        ev.complete('success');

        if (paymentIntent.status === 'succeeded') {
          cbRef.current.onSuccess();
        } else if (paymentIntent.status === 'requires_action') {
          const { error: err2, paymentIntent: pi2 } = await stripe.confirmCardPayment(clientSecret);
          if (err2) cbRef.current.onError(err2.message);
          else if (pi2 && pi2.status === 'succeeded') cbRef.current.onSuccess();
          else cbRef.current.onError('Payment could not be completed.');
        } else {
          cbRef.current.onError('Payment could not be completed.');
        }
      } catch (e) {
        ev.complete('fail');
        cbRef.current.onError(e.message || 'Wallet payment failed.');
      } finally {
        setBusy(false);
      }
    };

    pr.on('paymentmethod', onPaymentMethod);
    return () => pr.off('paymentmethod', onPaymentMethod);
  }, [stripe, clientSecret, total, label]);

  // Open the native payment sheet (Apple Pay on Apple devices, Google Pay on
  // Android/Chrome). On unsupported browsers show() rejects — surface a friendly
  // fallback so the customer uses the card form instead.
  const handlePay = () => {
    if (!paymentRequest || busy) return;
    paymentRequest.show().catch(() => {
      cbRef.current.onError('Apple Pay / Google Pay is not available on this device. Use the card form below.');
    });
  };

  if (!paymentRequest) {
    return (
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="h-12 rounded-xl bg-black/80 animate-pulse" />
        <div className="h-12 rounded-xl bg-gray-200 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="relative grid grid-cols-2 gap-3 mb-4">
      <button
        type="button"
        onClick={handlePay}
        disabled={busy}
        className="h-12 rounded-xl bg-black text-white font-semibold flex items-center justify-center disabled:opacity-60 tap-44"
      >
        Apple Pay
      </button>
      <button
        type="button"
        onClick={handlePay}
        disabled={busy}
        className="h-12 rounded-xl bg-white border border-gray-300 text-gray-800 font-semibold flex items-center justify-center gap-0.5 disabled:opacity-60 tap-44"
      >
        <span className="font-bold" style={{ color: '#4285F4' }}>G</span>
        <span style={{ color: '#EA4335' }}>o</span>
        <span style={{ color: '#FBBC05' }}>o</span>
        <span style={{ color: '#4285F4' }}>g</span>
        <span style={{ color: '#34A853' }}>l</span>
        <span style={{ color: '#EA4335' }}>e</span>
        <span className="ml-1">Pay</span>
      </button>
      <p className="col-span-2 text-center text-xs text-muted-foreground mt-1 mb-1">or pay with card</p>
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-2xl pointer-events-none">
          <div className="w-5 h-5 border-2 border-midnight-cherry border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}