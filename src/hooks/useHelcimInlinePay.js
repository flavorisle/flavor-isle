import { useCallback, useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { closeHelcimPay, loadHelcimPay, openHelcimPay } from '@/lib/helcimPay';

// Helcim's card form, opened over the page the customer is already on: the checkout
// page for a website order, and our own pay page for a link that was texted.
//
// The session token is minted server-side for the SAVED order, so neither an amount
// nor a card number ever passes through this code. Helcim answers on
// window.postMessage keyed to that token; only a SUCCESS is trusted, and even then
// the payment is verified against Helcim's own record before the caller hears that
// the order is paid.
const PAY_ERROR =
  'We could not open the secure payment form. Nothing was charged — please try again, or call us at (270) 563-4618.';

// Helcim approved the card — the money still has to be confirmed against this order's
// own total before the kitchen is told anything. Helcim's record is the only thing
// that can mark an order paid, so this retries briefly to cover the moment between
// the approval and that record being readable.
async function settleUntilConfirmed(orderNumber) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await base44.functions.invoke('settleHelcimWebPayment', { order_number: orderNumber });
      if (res?.data?.settled) return true;
    } catch (err) {
      console.error('Helcim payment confirmation failed:', err);
    }
    if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  return false;
}

// onPaid(orderNumber) runs only once a payment is confirmed as that order's own.
export default function useHelcimInlinePay(onPaid) {
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const tokenRef = useRef('');
  const orderRef = useRef('');
  const onPaidRef = useRef(onPaid);
  useEffect(() => { onPaidRef.current = onPaid; });

  // Safety net: a half-finished attempt never leaves Helcim's overlay behind on a
  // page the customer has moved on from.
  useEffect(() => () => closeHelcimPay(), []);

  useEffect(() => {
    const onHelcimEvent = async (event) => {
      const data = event?.data;
      const token = tokenRef.current;
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
      closeHelcimPay();
      setStarting(false);
      if (!settled) {
        console.warn(`Helcim approved order ${orderNumber} but it is not settled yet — the sweeper will retry.`);
      }
      onPaidRef.current?.(orderNumber);
    };
    window.addEventListener('message', onHelcimEvent);
    return () => window.removeEventListener('message', onHelcimEvent);
  }, []);

  // Open the card form for one saved order. A tip is only ever passed by the pay page
  // a customer reaches from a text, where it is picked; a website checkout order
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
      await loadHelcimPay();
      tokenRef.current = token;
      openHelcimPay(token);
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