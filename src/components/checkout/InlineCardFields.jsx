import React, { useEffect, useState } from 'react';
import { AlertTriangle, Lock } from 'lucide-react';
import { loadHelcimJs, submitHelcimForm } from '@/lib/helcimJs';

// Our own card fields, on our own page.
//
// The ids below are the card processor's contract: every field keeps its id and carries
// no `name`, so what the customer types is read by the processor's script and sent
// straight from their browser to the processor — it is never posted to us, and Flavor
// Isle never sees a card number.
//
// The amount, and the signature that proves we set it, arrive from the server with the
// form, so nothing on this page can change what the customer is charged.
const digitsOnly = (value, max) => value.replace(/\D/g, '').slice(0, max);
const labelClass = 'text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block';
const inputClass =
  'w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry';

export default function InlineCardFields({
  form,
  defaultName = '',
  defaultAddress = '',
  defaultPostalCode = '',
}) {
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    let active = true;
    loadHelcimJs()
      .then(() => { if (active) setReady(true); })
      .catch((err) => {
        console.error('Card fields could not be loaded:', err);
        if (active) setFailed(true);
      });
    return () => { active = false; };
  }, []);

  // Digits only in the field; the number is shown in groups of four for reading and
  // stripped back to digits when the form is sent, which is the only shape the
  // processor accepts.
  const formatCardNumber = (input) => {
    input.value = digitsOnly(input.value, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
  };
  const tidy = (id, max) => {
    const field = document.getElementById(id);
    if (field) field.value = digitsOnly(field.value, max);
  };

  const handleProcess = () => {
    if (processing || !ready) return;
    tidy('cardNumber', 19);
    tidy('cardExpiryMonth', 2);
    tidy('cardExpiryYear', 4);
    tidy('cardCVV', 4);
    setProcessing(true);
    // A successful payment takes the page on to the confirmation by itself; this only
    // clears the spinner on a card that was refused, which the processor explains in
    // the results line above.
    setTimeout(() => setProcessing(false), 12000);
    if (!submitHelcimForm()) {
      setProcessing(false);
      setFailed(true);
    }
  };

  return (
    <form
      id="helcimForm"
      name="helcimForm"
      method="POST"
      action={form.action}
      onSubmit={(event) => event.preventDefault()}
      className="space-y-3"
    >
      {/* The processor's contract: its public configuration token, the amount and the
          signature that proves we set it, and our own order number — which is how the
          result finds this order again. */}
      <input type="hidden" id="token" defaultValue={form.token} />
      <input type="hidden" id="amount" defaultValue={form.amount} />
      <input type="hidden" id="amountHash" defaultValue={form.amountHash} />
      <input type="hidden" id="language" defaultValue="en" />
      <input type="hidden" name="order_number" defaultValue={form.orderNumber} />
      <input type="hidden" name="return_url" defaultValue={window.location.origin} />
      <input type="hidden" name="return_path" defaultValue={`${window.location.pathname}${window.location.search}`} />

      {/* The processor writes its own message here, so a refused card is explained on
          our own page. */}
      <div id="helcimResults" className="text-xs text-destructive" />

      <div>
        <label htmlFor="cardNumber" className={labelClass}>Card Number</label>
        <input
          id="cardNumber"
          type="text"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 5678 9012 3456"
          onChange={(event) => formatCardNumber(event.target)}
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label htmlFor="cardExpiryMonth" className={labelClass}>Exp. Month</label>
          <input
            id="cardExpiryMonth"
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp-month"
            placeholder="MM"
            maxLength={2}
            onChange={(event) => { event.target.value = digitsOnly(event.target.value, 2); }}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="cardExpiryYear" className={labelClass}>Exp. Year</label>
          <input
            id="cardExpiryYear"
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp-year"
            placeholder="YY or YYYY"
            maxLength={4}
            onChange={(event) => { event.target.value = digitsOnly(event.target.value, 4); }}
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="cardCVV" className={labelClass}>CVV</label>
          <input
            id="cardCVV"
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="123"
            maxLength={4}
            onChange={(event) => { event.target.value = digitsOnly(event.target.value, 4); }}
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="cardHolderName" className={labelClass}>Name on Card</label>
        <input
          id="cardHolderName"
          type="text"
          autoComplete="cc-name"
          defaultValue={defaultName}
          placeholder="Jane Smith"
          className={inputClass}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div>
          <label htmlFor="cardHolderAddress" className={labelClass}>Billing Address</label>
          <input
            id="cardHolderAddress"
            type="text"
            autoComplete="billing street-address"
            defaultValue={defaultAddress}
            placeholder="123 Main St"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="cardHolderPostalCode" className={labelClass}>ZIP</label>
          <input
            id="cardHolderPostalCode"
            type="text"
            inputMode="numeric"
            autoComplete="billing postal-code"
            defaultValue={defaultPostalCode}
            placeholder="42171"
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="button"
        id="buttonProcess"
        onClick={handleProcess}
        disabled={!ready || processing}
        className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {processing ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <><Lock size={15} /> Pay ${form.amount}</>
        )}
      </button>

      {failed && (
        <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-2xl p-3 text-xs">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <span>We could not open the card fields. Please refresh the page, or call us at (270) 563-4618.</span>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Your card is sent straight to our payment processor — Flavor Isle never sees your card number.
      </p>
    </form>
  );
}