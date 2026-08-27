import React, { useState, useEffect, useRef } from 'react';
import { PaymentRequestButtonElement, useStripe } from '@stripe/react-stripe-js';

// Google Pay / Apple Pay via the Stripe Payment Request API. Renders only
// when the browser/device supports a wallet; otherwise it stays hidden and
// the standard card form remains the fallback. Must be used inside <Elements>.
export default function WalletPayButton({ clientSecret, total, label, onSuccess, onError }) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [canPay, setCanPay] = useState(false);

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

    pr.canMakePayment()
      .then((res) => {
        if (res && (res.applePay || res.googlePay)) {
          setPaymentRequest(pr);
          setCanPay(true);
        }
      })
      .catch(() => {});

    const onPaymentMethod = async (ev) => {
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
      }
    };

    pr.on('paymentmethod', onPaymentMethod);
    return () => pr.off('paymentmethod', onPaymentMethod);
  }, [stripe, clientSecret, total, label]);

  if (!canPay || !paymentRequest) return null;

  return (
    <div className="mb-4">
      <PaymentRequestButtonElement
        options={{ paymentRequest, style: { paymentRequestButton: { height: '48px', type: 'pay' } } }}
        className="w-full"
      />
      <p className="text-center text-xs text-muted-foreground mt-2 mb-1">or pay with card</p>
    </div>
  );
}