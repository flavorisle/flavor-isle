// The customer's card entered in fields on OUR page (Helcim.js, not the HelcimPay.js
// modal).
//
// The card processor's JavaScript reads the fields, sends the number straight from the
// customer's browser to the processor, and hands the result back to us — so the card
// number never touches this app, and the customer never leaves our own checkout.
//
// Two values come from the Helcim.js configuration in the merchant's Helcim account:
//   - the configuration token: the public half, which the browser needs so the fields
//     point at the right account,
//   - the secret key: never leaves the server. It signs the amount, so a customer
//     cannot change what they are charged.

import { round2 } from './helcimPayableOrder.ts';

export function helcimJsToken(): string {
  return (Deno.env.get('HELCIM_JS_TOKEN') || '').trim();
}

export function helcimJsSecret(): string {
  return (Deno.env.get('HELCIM_JS_SECRET') || '').trim();
}

// Our own card fields need both halves of the configuration. When either is missing the
// checkout keeps using the processor's own secure form instead.
export function helcimJsConfigured(): boolean {
  return !!helcimJsToken() && !!helcimJsSecret();
}

// The amount as the processor expects it: two decimals, no separators.
export function formatCardAmount(amountUsd: number): string {
  return round2(amountUsd).toFixed(2);
}

// sha256(secret + amount) — the processor recomputes it with the configuration's own
// settings and refuses the payment when it does not match, which is what keeps the
// amount out of the customer's hands (the amount travels in the form, the signature
// proves we set it).
export async function helcimAmountHash(amountUsd: number): Promise<string> {
  const amount = formatCardAmount(amountUsd);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${helcimJsSecret()}${amount}`));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}