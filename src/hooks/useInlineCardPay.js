import { useCallback, useState } from 'react';
import { base44 } from '@/api/base44Client';

// The card step for one saved order, with our own fields on our own page.
//
// The server hands back everything the fields need for that one order — the amount, the
// signature that proves we set it, and the public configuration token — so nothing here
// decides what a customer is charged, and the form's result is verified against the
// processor's own record before an order is ever marked paid.
//
// There is deliberately no popup path: when the card fields cannot be opened, the
// customer is told plainly and the order simply stays unpaid.
const UNAVAILABLE =
  'Card payment is temporarily unavailable. Call us at (270) 563-4618 or pay at pickup - nothing was charged.';
const FORM_ERROR =
  'We could not open the card form. Nothing was charged — please try again, or call us at (270) 563-4618.';

export default function useInlineCardPay() {
  const [form, setForm] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const startPayment = useCallback(async (orderNumber, tip) => {
    setError('');
    setStarting(true);
    try {
      const res = await base44.functions.invoke('createHelcimCardForm', {
        order_number: orderNumber,
        ...(tip === undefined || tip === null ? {} : { tip }),
      });
      const data = res?.data || {};
      if (data.available === false) {
        setError(UNAVAILABLE);
        return;
      }
      if (data.error || !data.amount_hash || !data.token) {
        setError(data.error || FORM_ERROR);
        return;
      }
      setForm({
        orderNumber: data.order_number || orderNumber,
        amount: data.amount,
        amountHash: data.amount_hash,
        token: data.token,
        // The fields post their result to our own endpoint on our own domain.
        action: `${window.location.origin}/functions/helcimJsResult`,
      });
    } catch (err) {
      setError(err?.response?.data?.error || FORM_ERROR);
    } finally {
      setStarting(false);
    }
  }, []);

  // Anything that changes what is being ordered makes the signed amount stale, so the
  // fields go away with the order they were signed for.
  const resetCardForm = useCallback(() => setForm(null), []);

  return { startPayment, resetCardForm, form, starting, error };
}