// The card processor as the third secure-payment path (issue #97, Part B).
//
// This is the shared money helper for every path that takes a card through
// the card processor: the website checkout, the phone payment link Smashie texts, the /pay
// page, merch, refunds and the sweeper. It mirrors squareWebCheckout.ts so the
// two hosted paths behave identically from the customer's point of view — the
// customer only ever sees our own secure page and never a processor name.
//
// FAIL CLOSED: with no HELCIM_API_KEY token, every entry point below refuses with
// a clear error and the caller falls back to the Square path, so a missing
// credential can never produce a dead checkout or an unverifiable payment.
//
// Amounts are verified to the cent against what the processor reports before an order
// is ever marked paid: the money rule is the same one the Square and Stripe
// paths enforce.
import { withTimeout } from './withTimeout.ts';

const DEFAULT_API_BASE = 'https://api.helcim.com/v2';

export function helcimApiBase(): string {
  return (Deno.env.get('HELCIM_API_BASE') || DEFAULT_API_BASE).replace(/\/$/, '');
}

// The credentials, or null when card payments are not set up yet. Callers use this to
// decide between the card path and the Square fallback.
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
  'Secure card payments are not configured yet (the card API token is missing), so no secure payment page was created.';

// Can this merchant account actually take a USD card right now?
//
// The processor refuses /helcim-pay/initialize at the ACCOUNT level when the merchant has
// no active terminal for the currency ("No active terminals for USD currency"), and
// every session minted afterwards fails the same way — a customer is left staring at
// a payment page that can never be paid. Each entry point asks this first, so an
// account-level problem routes the customer to the alternate processor instead.
//
// No invoice request is sent, so a discarded probe leaves no invoice behind in the
// merchant's account, and it is bounded so a stalled card call cannot hang checkout.
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
      'Card checkout probe',
    );
    return true;
  } catch (error) {
    console.error('helcimCanTakePayment: the card processor will not open a checkout session:', (error as Error).message);
    return false;
  }
}

// One place for the authenticated card call, so the key never leaves this
// module and every failure carries the status and the processor's own message.
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
    throw new Error(`Card API ${method} ${path} failed (${response.status}): ${JSON.stringify(data).slice(0, 300)}`);
  }
  return data;
}

function unwrap(data: any) {
  return Array.isArray(data) ? data : data?.payments || data?.data || [];
}

// ── Our own page for one order ──
//
// Our own secure page for card orders, wherever the customer came from: the website
// checkout, the Tasty Threads checkout, or the short link Smashie texts. The card fields
// are rendered on that page itself (src/components/checkout/InlineCardFields.jsx) and the
// payment is verified server-side afterwards, so no checkout token and no processor page
// is ever handed out.
//
// The link carries only the order number — never a checkout token — so a link that is
// re-sent an hour later still opens a page that computes the amount afresh instead of one
// that has already expired.
export function helcimPayPageUrl(payPageOrigin: string, orderNumber: string, fromCheckout = false) {
  const base = `${payPageOrigin}/pay?order_number=${encodeURIComponent(orderNumber)}`;
  return fromCheckout ? `${base}&from=checkout` : base;
}



// ── Reading the payment back ──

// Every APPROVED USD payment the processor recorded for one invoice. The invoice number
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

// The rescue path for inline card-form payments: the form posts the order
// number, not an invoice number, so the invoice lookup above finds nothing even
// when the payment landed. This asks the processor for the transactions that
// name this order. If the API ignores the filter and returns unrelated
// transactions, the consistency check below empties the result — fail safe,
// never a false match.
export async function helcimPaymentsForOrderNumber(orderNumber: string) {
  const data = await helcimRequest(`/card-transactions?orderNumber=${encodeURIComponent(orderNumber)}`);
  return unwrap(data)
    // The inline card form stamps the order number onto the transaction Helcim creates,
    // and Helcim stores it under invoiceNumber (not orderNumber), so match either field.
    .filter((payment: any) => {
      const want = String(orderNumber).trim();
      return String(payment?.orderNumber ?? '').trim() === want || String(payment?.invoiceNumber ?? '').trim() === want;
    })
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
// paid only when the processor reports an APPROVED USD payment, with the food amount
// (what was taken minus any tip added on the secure page) and the tip split out.
export async function helcimCheckoutTotals(
  invoiceNumber: string,
  expectedCents: number,
  suppliedTransactionId?: string,
  orderNumber?: string,
) {
  // The inline card form stamps the order number onto the transaction Helcim creates,
  // and Helcim stores it under the transaction's invoiceNumber — so the order number
  // the form sent is the invoice number the processor actually knows. The browser also
  // posts a transaction id that is not always the card-transaction id Helcim can retrieve
  // directly (it 400s), so each lookup below is best-effort and the union is what settles
  // an order: a payment is matched on exact money, never on which id happened to resolve.
  const collected: any[] = [];

  if (suppliedTransactionId) {
    const byId = await helcimPaymentByTransaction(suppliedTransactionId).catch(() => null);
    if (byId) collected.push(byId);
  }

  // The order number is what the card form sent and what Helcim stored as the invoice
  // number — this is the lookup that reliably finds an inline card-form payment.
  if (orderNumber) {
    const byInvoiceOrderNumber = await helcimPaymentsForInvoice(orderNumber).catch(() => []);
    collected.push(...(byInvoiceOrderNumber || []));
  }

  // The hosted-page path may have stamped the order's own id as the invoice number.
  if (invoiceNumber) {
    const byInvoiceId = await helcimPaymentsForInvoice(invoiceNumber).catch(() => []);
    collected.push(...(byInvoiceId || []));
  }

  // Last resort: the order-number filter (Helcim may store it on orderNumber too).
  if (orderNumber) {
    const byOrderNumber = await helcimPaymentsForOrderNumber(orderNumber).catch(() => []);
    collected.push(...(byOrderNumber || []));
  }

  // Dedupe by transaction id so a payment found by two lookups is counted once.
  const seen = new Set<string>();
  const payments = collected.filter((payment: any) => {
    if (!payment?.transactionId) return false;
    if (seen.has(payment.transactionId)) return false;
    seen.add(payment.transactionId);
    return true;
  });

  const approved = payments.filter((payment) => {
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

// Refund a card transaction in full. Used by refundOrder and cancelOrder for
// orders whose payment_provider is helcim.
export async function refundHelcimTransaction(transactionId: string, amountCents: number, reference: string) {
  if (!transactionId) throw new Error('No card transaction found on this order');
  const refund = await helcimRequest(`/payments/${encodeURIComponent(transactionId)}/refund`, 'POST', {
    amount: (amountCents / 100).toFixed(2),
    // The processor echoes this back on the refund record, so a retried cancellation is
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
// Only the card path uses these. The Stripe vault and its SavedPaymentMethod
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
// switched the checkout to cards and supplied the credentials.
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