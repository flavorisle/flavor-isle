import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, CreditCard, Store } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Seo from '@/components/Seo';
import PayOrderSummary from '@/components/pay/PayOrderSummary';
import PayTipSelector from '@/components/pay/PayTipSelector';
import PayPageState from '@/components/pay/PayPageState';
import useInlineCardPay from '@/hooks/useInlineCardPay';
import InlineCardFields from '@/components/checkout/InlineCardFields';
import { defaultTipPreset, tipAmountFor, tipPresetsFor } from '@/lib/phoneTip';

const FALLBACK_ERROR =
  'We could not open that payment page. Please try the link again, or call us at (270) 563-4618.';
const PHONE = '(270) 563-4618';

// Our own secure payment page for card orders — the website's food checkout, the
// Tasty Threads merch checkout, and the short link Smashie texts. The customer sees
// their order, picks a tip if the order has not got one yet, and types their card in
// fields on this page; every amount is rebuilt server-side from the saved order, and
// nothing is counted as paid until the processor's own record confirms it.
export default function PayCard() {
  const params = new URLSearchParams(window.location.search);
  const orderNumber = params.get('order_number') || '';
  // A website checkout order already carries its tip inside its saved total, so
  // it is never asked for one twice.
  const fromCheckout = params.get('from') === 'checkout';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [paid, setPaid] = useState(false);
  const [tipPreset, setTipPreset] = useState('18');
  const [customTip, setCustomTip] = useState('');

  const { startPayment: startCardPay, form: cardForm, starting, error: payError, resetCardForm } = useInlineCardPay();

  // A different tip is a different amount, so the card fields signed for the old one go
  // away with it.
  useEffect(() => { resetCardForm(); }, [tipPreset, customTip, resetCardForm]);

  useEffect(() => {
    if (!orderNumber) {
      setLoadError(FALLBACK_ERROR);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    base44.functions
      .invoke('getPayableOrder', { order_number: orderNumber })
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
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [orderNumber]);

  const base = (Number(order?.subtotal) || 0) + (Number(order?.tax) || 0) + (Number(order?.delivery_fee) || 0);
  const storedTotal = Number(order?.total) || 0;
  const showTipPicker = !fromCheckout && !!order && order.kind === 'food' && !paid;
  const presets = tipPresetsFor(order?.subtotal || 0);
  const tip = showTipPicker
    ? tipAmountFor(tipPreset, presets, customTip)
    : Math.max(0, Math.round((storedTotal - base) * 100) / 100);
  const totalDue = showTipPicker ? Math.round((base + tip) * 100) / 100 : storedTotal;

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
        ) : order.reason === 'payment_closed' ? (
          <PayPageState
            Icon={AlertTriangle}
            tone="warn"
            title={`Order #${order.order_number} is no longer open`}
            body={`This order was cancelled or refunded, so this payment page is closed. Call the counter at ${PHONE} and we'll sort it out with you, or start a fresh order online.`}
          >
            <div className="flex flex-col sm:flex-row gap-2 justify-center mt-4">
              <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center justify-center px-6 py-3 text-sm">
                Start a new order
              </Link>
              <a href="tel:+12705634618" className="btn-mint chrome-hover inline-flex items-center justify-center px-6 py-3 text-sm">
                Call the counter
              </a>
            </div>
          </PayPageState>
        ) : order.reason === 'own_card_form' ? (
          <PayPageState
            Icon={AlertTriangle}
            tone="warn"
            title={`Order #${order.order_number} pays on its own page`}
            body={`This order was set up to pay on the page you were sent, so there is nothing to pay here. Use the link from your text or email, or call the counter at ${PHONE} and we'll take it from there.`}
          />
        ) : order.reason === 'pay_at_counter' ? (
          <PayPageState
            Icon={Store}
            tone="warn"
            title="Pay at the counter"
            body={`This order is set to be paid in person, so there's nothing to pay here. Come on in to the counter — we'll have it ready. Questions? Call ${PHONE}.`}
          />
        ) : (
          <>
            <PayOrderSummary order={order} tip={tip} kind={order.kind} total={totalDue} />
            {cardForm ? (
              <div className="card-diner p-5 space-y-3">
                <div>
                  <h2 className="font-heading text-lg text-obsidian-roast">Enter your card</h2>
                  <p className="text-xs text-muted-foreground font-body">
                    Paying ${cardForm.amount} for order #{cardForm.orderNumber}.
                  </p>
                </div>
                <InlineCardFields form={cardForm} defaultName={order.first_name || ''} />
              </div>
            ) : (
              <>
                {showTipPicker && (
                  <PayTipSelector
                    presets={presets}
                    preset={tipPreset}
                    onPreset={setTipPreset}
                    customTip={customTip}
                    onCustomTip={setCustomTip}
                  />
                )}
                <button
                  type="button"
                  onClick={() => startCardPay(order.order_number, showTipPicker ? tip : undefined)}
                  disabled={starting}
                  className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {starting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CreditCard size={16} /> Pay ${totalDue.toFixed(2)} securely
                    </>
                  )}
                </button>
                {payError && (
                  <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-2xl p-3 text-sm">
                    <AlertTriangle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{payError}</span>
                  </div>
                )}
              </>
            )}
            <p className="text-center text-xs text-muted-foreground font-body">
              Your card details are entered on our secure payment form — Flavor Isle never sees your card
              number. Trouble paying? Call us at{' '}
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