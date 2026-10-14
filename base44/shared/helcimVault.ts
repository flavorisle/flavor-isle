// Card customer/vault helpers (issue #97, Part B step 14).
//
// Thin, fail-closed wrappers over the card endpoints in helcimCheckout.ts so the
// saved-card function has one place to name a customer. Nothing here runs today:
// Card credentials do not exist yet, so every call refuses with the shared
// "not configured" error and the checkout falls back to the live card path. The
// Stripe vault and its records are untouched by this module.
import { helcimConfigured, HELCIM_NOT_CONFIGURED, listHelcimCards, createHelcimCard, deleteHelcimCard, chargeHelcimCard } from './helcimCheckout.ts';

// A vaulting customer code derived from the account email, stable across
// sessions so the same person's saved cards are found again.
export function helcimCustomerCode(email: string) {
  const clean = String(email || '').trim().toLowerCase();
  return `flavor-isle-${clean.replace(/[^a-z0-9]/g, '').slice(0, 24)}`;
}

export async function savedHelcimCards(email: string) {
  if (!helcimConfigured()) return { configured: false, cards: [] };
  const cards = await listHelcimCards(helcimCustomerCode(email));
  return { configured: true, cards };
}

export async function saveHelcimCard(email: string, cardToken: string, cardHolderName?: string) {
  if (!helcimConfigured()) throw new Error(HELCIM_NOT_CONFIGURED);
  if (!cardToken) throw new Error('A card token from the secure payment page is required.');
  return createHelcimCard(helcimCustomerCode(email), cardToken, cardHolderName);
}

export async function removeHelcimCard(cardId: string) {
  if (!helcimConfigured()) throw new Error(HELCIM_NOT_CONFIGURED);
  return deleteHelcimCard(cardId);
}

export async function payWithHelcimCard(opts: { cardToken: string; amountUsd: number; invoiceNumber: string }) {
  if (!helcimConfigured()) throw new Error(HELCIM_NOT_CONFIGURED);
  return chargeHelcimCard(opts);
}