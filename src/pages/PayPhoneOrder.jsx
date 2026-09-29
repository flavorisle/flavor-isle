import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { AlertTriangle, CheckCircle2, Store } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Seo from '@/components/Seo';
import PayOrderSummary from '@/components/pay/PayOrderSummary';
import PayTipSelector from '@/components/pay/PayTipSelector';
import PayOrderForm from '@/components/pay/PayOrderForm';
import PayPageState from '@/components/pay/PayPageState';
import PayPhoneDemo from '@/components/pay/PayPhoneDemo';
import { defaultTipPreset, tipAmountFor, tipPresetsFor } from '@/lib/phoneTip';

const FALLBACK_ERROR =
  'We could not open that payment page. Please try the link in your text again, or call us at (270) 563-4618.';
const PHONE = '(270) 563-4618';

// The page behind the short link Smashie texts (flavor-isle.com/pay/PH123456).
// The customer sees their order, picks a tip, and pays with the card form
// embedded right here — they never leave flavor-isle.com.
export default function PayPhoneOrder() {
  const { orderNumber } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [stripePromise, setStripePromise] = useState(null);
  const [stripeError, setStripeError] = useState('');
  const [payError, setPayError] = useState('');
  const [paid, setPaid] = useState(false);
  const [tipPreset, setTipPreset] = useState('18');
  const [customTip, setCustomTip] = useState('');

  useEffect(() => {
    if (orderNumber === 'demo') return;
    let active = true;
    setLoading(true);
    base44.functions
      .invoke('getPhoneOrderPayment', { order_number: orderNumber })
      .then((res) => {
        if (!active) return;
        const data = res.data || {};
        setOrder(data);
        setPaid(!!data.paid);
        setTipPreset(defaultTipPreset(data.subtotal || 0));
      })
      .catch((err) => {
        if (active) setLoadError(err?.response?.data?.error || FALLBACK_ERROR);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderNumber]);

  // Load the card form only once there is something to pay for.
  useEffect(() => {
    if (!order?.payable || !order?.publishableKey) return;
    let active = true;
    const fail = () => {
      if (active) setStripeError("We couldn't load the secure card form. Check your connection, turn off any ad blocker, then reload this page.");
    };
    loadStripe(order.publishableKey)
      .then((instance) => { if (active) { instance ? setStripePromise(instance) : fail(); } })
      .catch(fail);
    return () => { active = false; };
  }, [order]);

  const presets = tipPresetsFor(order?.subtotal || 0);
  const tip = tipAmountFor(tipPreset, presets, customTip);
  const totalDue =
    (Number(order?.subtotal) || 0) + (Number(order?.tax) || 0) + (Number(order?.delivery_fee) || 0) + tip;

  if (orderNumber === 'demo') return <PayPhoneDemo />;

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Pay for your Flavor Isle order"
        description="Pay for your Flavor Isle order on our secure payment page."
      />
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-8 space-y-4">
        <div className="text-center mb-2">
          <h1 className="font-heading text-3xl sm:text-4xl text-obsidian-roast leading-tight">
            {paid ? "YOU'RE ALL SET" : 'PAY FOR YOUR ORDER'}
          </h1>
          <p className="text-sm text-muted-foreground font-body mt-1">
            Flavor Isle · 103 N Main St, Smiths Grove
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div
              className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin mx-auto"
              style={{ borderTopColor: 'var(--midnight-cherry)' }}
            />
            <p className="text-sm text-muted-foreground font-body mt-3">Loading your order…</p>
          </div>
        ) : loadError ? (
          <PayPageState Icon={AlertTriangle} tone="bad" title="We couldn't open that page" body={loadError} />
        ) : paid ? (
          <PayPageState
            Icon={CheckCircle2}
            tone="good"
            title={`Order #${order.order_number} is paid`}
            body="The crew has it and the grill is already going. Thanks for ordering with us!"
          >
            <Link
              to={`/order-status?order=${order.order_number}`}
              className="btn-mint chrome-hover inline-flex items-center justify-center px-6 py-3 text-sm mt-4"
            >
              Track your order
            </Link>
          </PayPageState>
        ) : !order.payable ? (
          <PayPageState
            Icon={Store}
            tone="warn"
            title="Pay at the counter"
            body={`This order is set to be paid in person, so there's nothing to pay here. Come on in to the counter — we'll have it ready. Questions? Call ${PHONE}.`}
          />
        ) : (
          <>
            <PayOrderSummary order={order} tip={tip} />
            <PayTipSelector
              presets={presets}
              preset={tipPreset}
              onPreset={setTipPreset}
              customTip={customTip}
              onCustomTip={setCustomTip}
            />
            {stripeError ? (
              <p className="text-sm text-destructive text-center font-body">{stripeError}</p>
            ) : stripePromise ? (
              <Elements stripe={stripePromise} options={{ clientSecret: order.clientSecret }}>
                <PayOrderForm
                  orderNumber={order.order_number}
                  clientSecret={order.clientSecret}
                  tip={tip}
                  total={totalDue}
                  onSuccess={() => setPaid(true)}
                  onError={setPayError}
                />
              </Elements>
            ) : (
              <p className="text-center text-sm text-muted-foreground font-body py-6">Loading the secure card form…</p>
            )}
            {payError && <p className="text-sm text-destructive text-center font-body">{payError}</p>}
            <p className="text-center text-xs text-muted-foreground font-body">
              Trouble paying? Call us at{' '}
              <a href="tel:+12705634618" className="text-midnight-cherry font-semibold">
                {PHONE}
              </a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}