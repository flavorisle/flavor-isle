import { squarePhoneApi } from './squarePhoneApi.ts';

// Our own card form, Square as the processor.
//
// The customer types their card on flavor-isle.com — nothing hands them to a
// processor's hosted page. The browser tokenizes the card with Square's Web
// Payments SDK (the token is single-use and worthless to anyone who intercepts
// it) and this module is the only place a token becomes money: it charges the
// EXACT total the order record holds and reports success only when Square
// answers with a completed USD payment for that same amount.

// The public application id the browser needs to initialize Square's form. It
// identifies the app and cannot move money, so it is safe on the page — it is
// kept with the account's other Square values as a platform secret.
export function squareApplicationId() {
  return Deno.env.get('SQUARE_APPLICATION_ID') || '';
}

// What the browser needs to render the card form, or the reason it cannot.
export async function squareWebConfig(base44) {
  const applicationId = squareApplicationId();
  if (!applicationId) {
    return { configured: false, reason: 'Card payment is not connected yet. Please pay at the counter or call us at (270) 563-4618.' };
  }

  let locationId = '';
  try {
    locationId = await (await squarePhoneApi(base44)).location();
  } catch (locationErr) {
    console.error('Square location lookup failed:', locationErr.message);
  }
  if (!locationId) {
    return { configured: false, reason: 'Square did not report an active store location, so cards cannot be taken right now.' };
  }

  return { configured: true, applicationId, locationId };
}

// Charge a tokenized card for an exact amount, in cents. Anything other than a
// completed USD payment of exactly that amount is a failure — an underpayment
// must never become a kitchen ticket.
export async function chargeSquareToken(base44, opts) {
  const api = await squarePhoneApi(base44);
  const locationId = await api.location();
  if (!locationId) throw new Error('Square location is unavailable.');

  const data = await api.request('payments', 'POST', {
    idempotency_key: opts.idempotencyKey,
    source_id: opts.sourceId,
    amount_money: { amount: opts.amountCents, currency: 'USD' },
    location_id: locationId,
    reference_id: String(opts.referenceId || '').slice(0, 40),
    note: String(opts.note || '').slice(0, 500),
    autocomplete: true,
    ...(opts.buyerEmail ? { buyer_email_address: opts.buyerEmail } : {}),
  });

  const payment = data?.payment;
  if (!payment) throw new Error('Square did not return a payment.');
  if (payment.status !== 'COMPLETED') throw new Error(`Square payment is ${payment.status || 'not completed'}.`);
  if (payment.total_money?.currency !== 'USD') throw new Error('Square returned a non-USD payment.');
  if (Number(payment.total_money?.amount) !== Number(opts.amountCents)) {
    console.error(
      `Square charged ${payment.total_money?.amount}c for order ${opts.referenceId} but the order is ${opts.amountCents}c`,
    );
    throw new Error('The amount Square charged did not match the order.');
  }

  return payment;
}