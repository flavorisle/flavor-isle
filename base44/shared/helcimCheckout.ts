// Helcim as the third secure-payment path (issue #97, Part B).
//
// This is the shared money helper for every path that takes a card through
// Helcim: the website checkout, the phone payment link Smashie texts, the /pay
// page, merch, refunds and the sweeper. It mirrors squareWebCheckout.ts so the
// two hosted paths behave identically from the customer's point of view — the
// customer only ever sees our own secure page and never a processor name.
//
// FAIL CLOSED: with no HELCIM_API_KEY token, every entry point below refuses with
// a clear error and the caller falls back to the Square path, so a missing
// credential can never produce a dead checkout or an unverifiable payment.
//
// Amounts are verified to the cent against what Helcim reports before an order
// is ever marked paid: the money rule is the same one the Square and Stripe
// paths enforce.
import { withTimeout } from './withTimeout.ts';

const DEFAULT_API_BASE = 'https://api.helcim.com/v2';

export function helcimApiBase(): string {
  return (Deno.env.get('HELCIM_API_BASE') || DEFAULT_API_BASE).replace(/\/$/, '');
}

// The credentials, or null when Helcim is not set up yet. Callers use this to
// decide between the Helcim path and the Square fallback.
//
// The API token alone authenticates every HelcimPay.js session; the account id is
// only used by the saved-card purchase path, so a merchant who cannot find it can
// still take card payments instead of being sent to the alternate processor.
export function helcimCredentials(): { apiKey: string; accountId: string } | null {
  const apiKey = (Deno.env.get('HELCIM_API_KEY') || '').trim();
  const accountId = (Deno.env.get('HELCIM_ACCOUNT_ID') || '').trim();
  if (!apiKey) return null;
  return { apiKey, accountId };
}

export function helcimConfigured(): boolean {
  return helcimCredentials() !== null;
}

export const HELCIM_NOT_CONFIGURED =
  'Helcim is not configured yet (the HELCIM_API_KEY token is missing), so no secure payment page was created.';

// Can this merchant account actually take a USD card right now?
//
// Helcim refuses /helcim-pay/initialize at the ACCOUNT level when the merchant has
// no active terminal for the currency ("No active terminals for USD currency"), and
// every session minted afterwards fails the same way — a customer is left staring at
// a payment page that can never be paid. Each entry point asks this first, so an
// account-level problem routes the customer to the alternate processor instead.
//
// No invoice request is sent, so a discarded probe leaves no invoice behind in the
// merchant's account, and it is bounded so a stalled Helcim call cannot hang checkout.
export async function helcimCanTakePayment(): Promise<boolean> {
  if (!helcimConfigured()) return false;
  try {
    await withTimeout(
      () =>
        helcimRequest('/helcim-pay/initialize', 'POST', {
          paymentType: 'purchase',
          amount: 1,
          currency: 'USD',
          language: 'en',
        }),
      6000,
      'Helcim checkout probe',
    );
    return true;
  } catch (error) {
    console.error('helcimCanTakePayment: Helcim will not open a checkout session:', (error as Error).message);
    return false;
  }
}

// One place for the authenticated Helcim call, so the key never leaves this
// module and every failure carries the status and Helcim's own message.
export async function helcimRequest(path: string, method = 'GET', body?: any) {
  const credentials = helcimCredentials();
  if (!credentials) throw new Error(HELCIM_NOT_CONFIGURED);

  const response = await fetch(`${helcimApiBase()}${path}`, {
    method,
    headers: {
      'api-token': credentials.apiKey,
      accept: 'application/json',
      'content-type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const text = await response.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text.slice(0, 500) };
    }
  }
  if (!response.ok) {
    throw new Error(`Helcim ${method} ${path} failed (${response.status}): ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

function unwrap(data: any) {
  return Array.isArray(data) ? data : data?.payments || data?.data || [];
}

// ── Creating the hosted checkout ──
//
// Helcim Pay hands the card fields to Helcim inside our own page: Helcim returns
// a checkout token, and the customer enters their card on the page that token
// renders. We keep the customer on flavor-isle.com, and the payment is verified
// server-side afterwards — the same shape as the Square hosted link.
// Our own secure page for one order. The link carries only the order number —
// never a checkout token — so a link that is re-sent an hour later still opens a
// page that mints a fresh session instead of one Helcim has already expired.
export function helcimPayPageUrl(payPageOrigin: string, orderNumber: string, fromCheckout = false) {
  const base = `${payPageOrigin}/pay-helcim?order_number=${encodeURIComponent(orderNumber)}`;
  return fromCheckout ? `${base}&from=checkout` : base;
}

export async function createHelcimCheckoutLink(
  opts: {
    invoiceNumber: string;
    orderNumber: string;
    amountUsd: number;
    payPageOrigin: string;
    fromCheckout?: boolean;
  },
): Promise<{ url: string; checkoutToken: string }> {
  const credentials = helcimCredentials();
  if (!credentials) throw new Error(HELCIM_NOT_CONFIGURED);

  const amount = Math.round((Number(opts.amountUsd) + Number.EPSILON) * 100) / 100;

  // invoiceRequest creates the record of this payment with OUR order id as the
  // invoice number, so Helcim reports that number back on the transaction and the
  // money is matched to this order and to nothing else. Its line item total has to
  // equal the amount charged, to the cent.
  const init = await helcimRequest('/helcim-pay/initialize', 'POST', {
    paymentType: 'purchase',
    amount,
    currency: 'USD',
    language: 'en',
    confirmationScreen: true,
    invoiceRequest: {
      invoiceNumber: opts.invoiceNumber,
      lineItems: [
        {
          sku: opts.orderNumber,
          description: `Flavor Isle order #${opts.orderNumber}`,
          quantity: 1,
          price: amount,
          total: amount,
        },
      ],
    },
  });

  const checkoutToken = init?.checkoutToken || init?.data?.checkoutToken;
  if (!checkoutToken) throw new Error('Helcim did not return a checkout token.');

  return {
    url: helcimPayPageUrl(opts.payPageOrigin, opts.orderNumber, opts.fromCheckout === true),
    checkoutToken,
  };
}

// ── Reading the payment back ──

// Every APPROVED USD payment Helcim recorded for one invoice. The invoice number
// is the order id we sent at checkout, so an order is matched back to its own
// money and to nothing else.
export async function helcimPaymentsForInvoice(invoiceNumber: string) {
  // Get card transactions, filtered by the invoice number we set at checkout —
  // the documented way to pull the transactions that belong to one invoice.
  const data = await helcimRequest(`/card-transactions?invoiceNumber=${encodeURIComponent(invoiceNumber)}`);
  return unwrap(data)
    .filter((payment: any) => String(payment?.status || '').toUpperCase() === 'APPROVED')
    .filter((payment: any) => !payment?.currency || String(payment.currency).toUpperCase() === 'USD')
    .map((payment: any) => ({
      transactionId: String(payment.transactionId || payment.id || ''),
      amountCents: Math.round(Number(payment.amount || payment.total || 0) * 100),
      tipCents: Math.round(Number(payment.tipAmount || payment.tip || 0) * 100),
      currency: String(payment.currency || 'USD').toUpperCase(),
      createdAt: payment.dateCreated || payment.createdAt || '',
    }));
}

export async function helcimPaymentByTransaction(transactionId: string) {
  const data = await helcimRequest(`/card-transactions/${encodeURIComponent(transactionId)}`);
  const payment = data?.data || data?.payment || data;
  if (!payment || (!payment.transactionId && !payment.id)) return null;
  return {
    transactionId: String(payment.transactionId || payment.id || ''),
    amountCents: Math.round(Number(payment.amount || payment.total || 0) * 100),
    tipCents: Math.round(Number(payment.tipAmount || payment.tip || 0) * 100),
    currency: String(payment.currency || 'USD').toUpperCase(),
    status: String(payment.status || '').toUpperCase(),
    createdAt: payment.dateCreated || payment.createdAt || '',
  };
}

// What an order's payment really is, in the form the settlement code needs:
// paid only when Helcim reports an APPROVED USD payment, with the food amount
// (what was taken minus any tip added on the secure page) and the tip split out.
export async function helcimCheckoutTotals(
  invoiceNumber: string,
  expectedCents: number,
  suppliedTransactionId?: string,
) {
  const payments = suppliedTransactionId
    ? [await helcimPaymentByTransaction(suppliedTransactionId)].filter(Boolean)
    : await helcimPaymentsForInvoice(invoiceNumber);

  const approved = (payments as any[]).filter((payment) => {
    if (!payment?.transactionId) return false;
    if (payment.status && payment.status !== 'APPROVED') return false;
    return payment.currency === 'USD';
  });
  if (approved.length === 0) return { paid: false };

  // Exactly one payment matching the order, to the cent. Two payments for one
  // invoice mean a double charge: report it as a mismatch so a human looks,
  // rather than silently settling on whichever came first.
  const matching = approved.filter((payment) => payment.amountCents === expectedCents);
  const receivedCents = approved.reduce((sum: number, payment: any) => sum + payment.amountCents, 0);
  const tipCents = approved.reduce((sum: number, payment: any) => sum + payment.tipCents, 0);

  return {
    paid: true,
    receivedCents,
    tipCents,
    foodCents: receivedCents - tipCents,
    transactionId: matching[0]?.transactionId || approved[0]?.transactionId,
    matched: approved.length === 1 && matching.length === 1,
  };
}

// ── Refunds ──

// Refund a Helcim transaction in full. Used by refundOrder and cancelOrder for
// orders whose payment_provider is helcim.
export async function refundHelcimTransaction(transactionId: string, amountCents: number, reference: string) {
  if (!transactionId) throw new Error('No Helcim transaction found on this order');
  const refund = await helcimRequest(`/payments/${encodeURIComponent(transactionId)}/refund`, 'POST', {
    amount: (amountCents / 100).toFixed(2),
    // Helcim echoes this back on the refund record, so a retried cancellation is
    // identifiable instead of looking like a second refund.
    reference,
  });
  const record = refund?.data || refund;
  return {
    refundId: String(record?.refundId || record?.transactionId || record?.id || ''),
    refundedCents: Math.round(Number(record?.amount || 0) * 100) || amountCents,
  };
}

// ── Card vault (issue #97 step 14) ──
//
// Only the Helcim path uses these. The Stripe vault and its SavedPaymentMethod
// records are never touched by this module.
export async function listHelcimCards(customerCode: string) {
  const data = await helcimRequest(`/cards?customerCode=${encodeURIComponent(customerCode)}`);
  const list = Array.isArray(data) ? data : data?.cards || data?.data || [];
  return (list || []).map((card: any) => ({
    cardId: String(card.cardId || card.id || ''),
    cardToken: String(card.cardToken || ''),
    cardHolderName: card.cardHolderName || '',
    cardNumber: String(card.cardNumber || ''),
    cardExpiry: String(card.cardExpiry || card.expiry || ''),
    cardType: card.cardType || '',
    customerCode: card.customerCode || customerCode,
  }));
}

export async function createHelcimCard(customerCode: string, cardToken: string, cardHolderName?: string) {
  const data = await helcimRequest('/cards', 'POST', {
    customerCode,
    cardToken,
    ...(cardHolderName ? { cardHolderName } : {}),
  });
  const card = data?.data || data?.card || data;
  return {
    cardId: String(card?.cardId || card?.id || ''),
    cardToken: String(card?.cardToken || cardToken || ''),
    cardNumber: String(card?.cardNumber || ''),
    cardExpiry: String(card?.cardExpiry || ''),
    cardType: card?.cardType || '',
    cardHolderName: card?.cardHolderName || cardHolderName || '',
  };
}

export async function deleteHelcimCard(cardId: string) {
  await helcimRequest(`/cards/${encodeURIComponent(cardId)}`, 'DELETE');
}

// Charge a vaulted card for an exact amount. Only used when the owner has both
// switched the checkout to Helcim and supplied the credentials.
export async function chargeHelcimCard(opts: {
  cardToken: string;
  amountUsd: number;
  invoiceNumber: string;
}) {
  const credentials = helcimCredentials();
  if (!credentials) throw new Error(HELCIM_NOT_CONFIGURED);
  const data = await helcimRequest('/payments/purchase', 'POST', {
    accountId: credentials.accountId,
    paymentType: 'purchase',
    amount: Number(opts.amountUsd).toFixed(2),
    currency: 'USD',
    cardToken: opts.cardToken,
    invoiceNumber: opts.invoiceNumber,
  });
  const payment = data?.data || data;
  return {
    transactionId: String(payment?.transactionId || payment?.id || ''),
    status: String(payment?.status || '').toUpperCase(),
    amountCents: Math.round(Number(payment?.amount || 0) * 100),
  };
}