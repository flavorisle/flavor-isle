import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { closeCardPay, loadCardPay, openCardPay } from '@/lib/cardPay';

// The card form, opened over the page the customer is already on: our own payment
// page, for a website order and for a link that was texted.
//
// The session token is minted server-side for the SAVED order, so neither an amount
// nor a card number ever passes through this code. The form answers on
// window.postMessage keyed to that token; only a SUCCESS is trusted, and even then the
// payment is verified against the processor's own record before the caller hears that
// the order is paid.
const PAY_ERROR =
  'We could not open the secure payment form. Nothing was charged — please try again, or call us at (270) 563-4618.';

// The card was approved — the money still has to be confirmed against this order's own
// total before the kitchen is told anything. The processor's own record is the only
// thing that can mark an order paid, so this retries briefly to cover the moment
// between the approval and that record being readable.
async function settleUntilConfirmed(orderNumber) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await base44.functions.invoke('settleHelcimWebPayment', { order_number: orderNumber });
      if (res?.data?.settled) return true;
    } catch (err) {
      console.error('Card payment confirmation failed:', err);
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  return false;
}

// onPaid(orderNumber) runs only once a payment is confirmed as that order's own.
export default function useCardPay(onPaid) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const tokenRef = useRef('');
  const orderRef = useRef('');
  const onPaidRef = useRef(onPaid);
  useEffect(() => { onPaidRef.current = onPaid; });

  // Safety net: a half-finished attempt never leaves the card overlay behind on a page
  // the customer has moved on from.
  useEffect(() => () => closeCardPay(), []);

  useEffect(() => {
    const onFormEvent = async (event) => {
      const data = event?.data;
      const token = tokenRef.current;
      // The event name is the processor's own protocol, keyed to the session token.
      if (!token || !data?.eventName || data.eventName !== `helcim-pay-js-${token}`) return;
      if (data.eventStatus === 'HIDE') return;
      if (data.eventStatus === 'ABORTED') {
        setError('That card was not approved, and nothing was charged. Please try another card.');
        return;
      }
      if (data.eventStatus !== 'SUCCESS') return;

      setError('');
      setStarting(true);
      const orderNumber = orderRef.current;
      const settled = await settleUntilConfirmed(orderNumber);
      closeCardPay();
      setStarting(false);
      if (!settled) {
        console.warn(`Card approved for order ${orderNumber} but it is not settled yet — the sweeper will retry.`);
      }
      onPaidRef.current?.(orderNumber);
    };
    window.addEventListener('message', onFormEvent);
    return () => window.removeEventListener('message', onFormEvent);
  }, []);

  // Open the card form for one saved order. A tip is only ever passed by the payment
  // page a customer reaches from a text, where it is picked; a website checkout order
  // already carries its tip inside its own saved total.
  const startPayment = useCallback(async (orderNumber, tip) => {
    setError('');
    setStarting(true);
    orderRef.current = orderNumber;
    try {
      const res = await base44.functions.invoke('createHelcimPaySession', {
        order_number: orderNumber,
        ...(tip === undefined || tip === null ? {} : { tip }),
      });
      const token = res?.data?.checkout_token;
      if (!token) {
        setError(res?.data?.error || PAY_ERROR);
        return false;
      }
      await loadCardPay();
      tokenRef.current = token;
      openCardPay(token);
      return true;
    } catch (err) {
      setError(err?.response?.data?.error || PAY_ERROR);
      return false;
    } finally {
      setStarting(false);
    }
  }, []);

  return { startPayment, starting, error };
}