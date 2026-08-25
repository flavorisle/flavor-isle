import React, { useState, useEffect, useRef } from 'react';
import { PaymentRequestButtonElement, useStripe } from '@stripe/react-stripe-js';

// One-tap Apple Pay / Google Pay express checkout. Renders only when the
// device supports a wallet. The payment intent is created on the fly when the
// wallet confirms, using contact details supplied by the wallet sheet, so the
// customer can pay without filling out the form first. Must be inside <Elements>.
export default function ExpressCheckout({ total, label, createIntent, onSuccess, onError }) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState(null);
  const [canPay, setCanPay] = useState(false);
  const [busy, setBusy] = useState(false);

  // Keep latest callbacks without re-running the setup effect on every render.
  const cbRef = useRef({ onSuccess, onError, createIntent });
  cbRef.current = { onSuccess, onError, createIntent };

  useEffect(() => {
    if (!stripe) return;

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
      setBusy(true);
      try {
        const bd = ev.paymentMethod.billing_details || {};
        const walletCustomer = {
          name: bd.name || '',
          email: bd.email || '',
          phone: bd.phone || '',
        };

        if (!walletCustomer.name || !walletCustomer.email) {
          ev.complete('fail');
          cbRef.current.onError('Please add your name and email below, then tap again.');
          return;
        }

        // Create the intent now (using wallet contact details) and confirm with
        // the wallet's payment method.
        const data = await cbRef.current.createIntent(walletCustomer);
        const { clientSecret, orderNumber } = data;

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

        if (paymentIntent.status === 'succeeded') {
          ev.complete('success');
          cbRef.current.onSuccess(orderNumber);
        } else if (paymentIntent.status === 'requires_action') {
          const { error: err2, paymentIntent: pi2 } = await stripe.confirmCardPayment(clientSecret);
          if (err2) {
            ev.complete('fail');
            cbRef.current.onError(err2.message);
          } else if (pi2 && pi2.status === 'succeeded') {
            ev.complete('success');
            cbRef.current.onSuccess(orderNumber);
          } else {
            ev.complete('fail');
            cbRef.current.onError('Payment could not be completed.');
          }
        } else {
          ev.complete('fail');
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
  }, [stripe, total, label]);

  if (!canPay || !paymentRequest) return null;

  return (
    <div className="relative">
      <PaymentRequestButtonElement
        options={{ paymentRequest, style: { paymentRequestButton: { height: '48px', type: 'pay' } } }}
        className="w-full"
      />
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-2xl pointer-events-none">
          <div className="w-5 h-5 border-2 border-midnight-cherry border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}