import React, { useState, useEffect } from 'react';
import { useStripe, useElements, PaymentRequestButtonElement } from '@stripe/react-stripe-js';

// Apple Pay / Google Pay button via Stripe's Payment Request API.
// Renders only when the browser/device supports a wallet payment; otherwise
// stays hidden and the standard card form remains the primary path.
// The wallet amount must match the PaymentIntent amount created on the server.

export default function WalletPayButton({ clientSecret, total, orderNumber, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [canMakePayment, setCanMakePayment] = useState(false);

  useEffect(() => {
    if (!stripe || !elements || !total) return;
    const pr = stripe.paymentRequest({
      country: 'US',
      currency: 'usd',
      total: { label: 'Flavor Isle order', amount: Math.round(total * 100) },
      requestPayerName: true,
      requestPayerEmail: true,
      requestPayerPhone: true,
    });

    pr.canMakePayment().then((result) => {
      if (result && (result.applePay || result.googlePay)) {
        setPaymentRequest(pr);
        setCanMakePayment(true);
      }
    }).catch(() => {});

    pr.on('paymentmethod', async (ev) => {
      const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: ev.paymentMethod.id,
      });
      if (error) {
        ev.complete('fail');
        onError(error.message);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        ev.complete('success');
        onSuccess(orderNumber);
      } else {
        ev.complete('fail');
        onError('Payment could not be completed. Please try your card instead.');
      }
    });
  }, [stripe, elements, total, clientSecret, orderNumber, onSuccess, onError]);

  if (!canMakePayment || !paymentRequest) return null;

  return (
    <div className="mb-4">
      <PaymentRequestButtonElement
        options={{
          paymentRequest,
          style: {
            paymentRequest: { type: 'buy', theme: 'dark', height: '48px' },
          },
        }}
      />
      <div className="flex items-center gap-3 mt-4 text-xs text-muted-foreground">
        <div className="flex-1 h-px bg-border" />
        <span className="font-heading uppercase tracking-wider">or pay with card</span>
        <div className="flex-1 h-px bg-border" />
      </div>
    </div>
  );
}