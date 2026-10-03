import React, { useState, useEffect, useRef } from 'react';
import { useStripe } from '@stripe/react-stripe-js';

// One-tap Apple Pay / Google Pay express checkout. The buttons only render
// when Stripe confirms the device/browser can actually pay with a wallet
// (canMakePayment), so unsupported setups never show a broken button. Must
// be inside <Elements>.
export default function ExpressCheckout({ total, label, createIntent, onSuccess, onError, onAvailability }) {
  const stripe = useStripe();
  const [paymentRequest, setPaymentRequest] = useState(null);
  // null = still checking support, true = wallet available, false = unsupported
  const [canPay, setCanPay] = useState(null);
  const [busy, setBusy] = useState(false);

  // Keep latest callbacks without re-running the setup effect on every render.
  const cbRef = useRef({ onSuccess, onError, createIntent, onAvailability });
  cbRef.current = { onSuccess, onError, createIntent, onAvailability };

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
    setPaymentRequest(pr);

    // Only advertise wallet pay when the device can actually use it. Apple Pay
    // needs a verified domain + Safari; Google Pay needs Chrome/Android with a
    // saved card. In cross-origin iframes (e.g. the builder preview) both are
    // unavailable, so we hide the buttons instead of showing a dead tap.
    pr.canMakePayment()
      .then((res) => {
        const available = !!(res && (res.applePay || res.googlePay));
        setCanPay(available);
        cbRef.current.onAvailability?.(available);
      })
      .catch(() => {
        setCanPay(false);
        cbRef.current.onAvailability?.(false);
      });

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
        const { clientSecret, orderNumber, orderId } = data;

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
          cbRef.current.onSuccess(orderNumber, paymentIntent.id, orderId);
        } else if (paymentIntent.status === 'requires_action') {
          const { error: err2, paymentIntent: pi2 } = await stripe.confirmCardPayment(clientSecret);
          if (err2) {
            ev.complete('fail');
            cbRef.current.onError(err2.message);
          } else if (pi2 && pi2.status === 'succeeded') {
            ev.complete('success');
            cbRef.current.onSuccess(orderNumber, pi2.id, orderId);
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

  // Trigger the native payment sheet (Apple Pay on Apple devices, Google Pay on
  // Android/Chrome). On unsupported browsers show() rejects — surface a friendly
  // fallback so the customer uses the card form instead.
  const handlePay = () => {
    if (!paymentRequest || busy) return;
    paymentRequest.show().catch(() => {
      cbRef.current.onError('Apple Pay / Google Pay is not available on this device. Use the card form below.');
    });
  };

  // Still checking support — show pulse placeholders.
  if (canPay === null || !paymentRequest) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="h-12 rounded-xl bg-black/80 animate-pulse" />
        <div className="h-12 rounded-xl bg-gray-200 animate-pulse" />
      </div>
    );
  }

  // No wallet available — render nothing so the card form is the only path.
  if (!canPay) return null;

  return (
    <div className="relative grid grid-cols-2 gap-3">
      <button
        type="button"
        onClick={handlePay}
        disabled={busy}
        className="h-12 rounded-xl bg-black text-white font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60 tap-44"
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
      {busy && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 rounded-2xl pointer-events-none">
          <div className="w-5 h-5 border-2 border-midnight-cherry border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}