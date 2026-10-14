import { useCallback, useState } from 'react';
import { base44 } from '@/api/base44Client';
import useCardPay from '@/hooks/useCardPay';

// The card step for one saved order, with our own fields on our own page.
//
// The server hands back everything the fields need for that one order — the amount, the
// signature that proves we set it, and the public configuration token — so nothing here
// decides what a customer is charged.
//
// Until the inline configuration is in place on the account, the server says so and the
// processor's own secure form takes the card instead: a checkout that cannot be paid is
// worse than one more click.
const FORM_ERROR =
  'We could not open the card form. Nothing was charged — please try again, or call us at (270) 563-4618.';

export default function useInlineCardPay(onPaid) {
  const [form, setForm] = useState(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const modal = useCardPay(onPaid);

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
        await modal.startPayment(orderNumber, tip);
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
  }, [modal]);

  // Anything that changes what is being ordered makes the signed amount stale, so the
  // fields go away with the order they were signed for.
  const resetCardForm = useCallback(() => setForm(null), []);

  return {
    startPayment,
    resetCardForm,
    form,
    starting: starting || modal.starting,
    error: error || modal.error,
  };
}