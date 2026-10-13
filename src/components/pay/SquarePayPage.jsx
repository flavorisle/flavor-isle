import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Store } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Seo from '@/components/Seo';
import PayOrderSummary from '@/components/pay/PayOrderSummary';
import PayTipSelector from '@/components/pay/PayTipSelector';
import PayPageState from '@/components/pay/PayPageState';
import SquareCardForm from '@/components/pay/SquareCardForm';
import { useCart } from '@/context/CartContext';
import { defaultTipPreset, tipAmountFor, tipPresetsFor } from '@/lib/phoneTip';

const FALLBACK_ERROR =
  'We could not open that payment page. Please try the link again, or call us at (270) 563-4618.';
const PHONE = '(270) 563-4618';

// Our own payment page. The customer sees their order and pays with Square's card
// form embedded right here — for online food orders, Tasty Threads merch, and the
// short link Smashie texts. Nothing sends them to a processor's hosted page.
//
// The amount charged is always the order's own saved total (plus the tip chosen
// here, when the customer hasn't chosen one yet) — never a number from the page.
export default function SquarePayPage({ orderNumber, tipEnabled = false, fromCheckout = false, readyFor = '' }) {
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [payError, setPayError] = useState('');
  const [paid, setPaid] = useState(false);
  const [tipPreset, setTipPreset] = useState('18');
  const [customTip, setCustomTip] = useState('');

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

  const base =
    (Number(order?.subtotal) || 0) + (Number(order?.tax) || 0) + (Number(order?.delivery_fee) || 0);
  const storedTotal = Number(order?.total) || 0;
  const showTipPicker = tipEnabled && !!order?.payable && order?.kind === 'food';
  const presets = tipPresetsFor(order?.subtotal || 0);
  // A checkout order already carries its tip inside its saved total, so no second
  // picker appears — the stored tip is shown as its own line instead.
  const tip = showTipPicker
    ? tipAmountFor(tipPreset, presets, customTip)
    : Math.max(0, Math.round((storedTotal - base) * 100) / 100);
  const totalDue = showTipPicker ? base + tip : storedTotal;

  const handlePaid = () => {
    setPaid(true);
    if (order?.kind === 'merch') {
      // Merch has its own confirmation screen, which clears the merch bag.
      window.location.href = `/merch-confirmation?order_number=${order.order_number}&square=1`;
      return;
    }
    if (fromCheckout) {
      clearCart();
      navigate(
        `/order-confirmation?order_number=${order.order_number}${readyFor ? `&ready_for=${encodeURIComponent(readyFor)}` : ''}`,
      );
    }
  };

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
            body={
              order.kind === 'merch'
                ? 'Thanks! Your Tasty Threads order is in and we will email tracking as soon as it ships.'
                : 'The crew has it and the grill is already going. Thanks for ordering with us!'
            }
          >
            {order.kind === 'merch' ? (
              <Link
                to="/merch"
                className="btn-mint chrome-hover inline-flex items-center justify-center px-6 py-3 text-sm mt-4"
              >
                Back to Tasty Threads
              </Link>
            ) : (
              <Link
                to={`/order-status?order=${order.order_number}`}
                className="btn-mint chrome-hover inline-flex items-center justify-center px-6 py-3 text-sm mt-4"
              >
                Track your order
              </Link>
            )}
          </PayPageState>
        ) : order.reason === 'own_card_form' ? (
          <PayPageState
            Icon={AlertTriangle}
            tone="warn"
            title={`Order #${order.order_number} pays on its own card page`}
            body={`This order was set up with its own card page, so there's nothing to pay here. Use the link you were sent — if it isn't working, call the counter at ${PHONE} and we'll sort it out with you.`}
          >
            <a
              href="tel:+12705634618"
              className="btn-mint chrome-hover inline-flex items-center justify-center px-6 py-3 text-sm mt-4"
            >
              Call the counter
            </a>
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
        ) : !order.payable ? (
          <PayPageState
            Icon={Store}
            tone="warn"
            title="Pay at the counter"
            body={`This order is set to be paid in person, so there's nothing to pay here. Come on in to the counter — we'll have it ready. Questions? Call ${PHONE}.`}
          />
        ) : (
          <>
            <PayOrderSummary order={order} tip={tip} kind={order.kind} />
            {showTipPicker && (
              <PayTipSelector
                presets={presets}
                preset={tipPreset}
                onPreset={setTipPreset}
                customTip={customTip}
                onCustomTip={setCustomTip}
              />
            )}
            <SquareCardForm
              orderNumber={order.order_number}
              amount={totalDue}
              tip={showTipPicker ? tip : 0}
              onSuccess={handlePaid}
              onError={setPayError}
            />
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