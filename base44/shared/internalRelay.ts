// Shared relay key for the app's own server-to-server calls.
//
// A few endpoints are meant to be reached only by this app's backend (the phone
// pipeline, Twilio TwiML fetches, provider webhooks) but live on a public URL,
// where anyone could otherwise drive them directly. Those callers now pass the
// relay key, and the endpoint refuses requests without it. The key is an
// existing platform secret, never a value in this repo.
export function relayKeyValue(): string {
  return Deno.env.get('OPENAI_WEBHOOK_SECRET') || '';
}

function safeEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// True when `value` is the relay key. Always false when the secret is unset, so
// a missing secret locks the endpoint instead of opening it.
export function hasValidRelayKey(value: string | null | undefined): boolean {
  return safeEqual(String(value || ''), relayKeyValue());
}

// Adds the relay key to a URL the app itself builds for a backend call.
export function withRelayKey(url: URL): URL {
  const key = relayKeyValue();
  if (key) url.searchParams.set('key', key);
  return url;
}

// Printful lets a webhook URL carry extra params but signs nothing, so the
// store's own API key is used as the HMAC key to derive a webhook token. The
// token is one-way (it never reveals the API key) and is what the registered
// webhook URL carries, so only Printful's own traffic can reach the handler.
export async function printfulWebhookKey(): Promise<string> {
  const apiKey = Deno.env.get('PRINTFUL_API_KEY') || '';
  if (!apiKey) return '';
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(apiKey),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('printful-webhook-v1')),
  );
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hasValidPrintfulKey(value: string | null | undefined): Promise<boolean> {
  const expected = await printfulWebhookKey();
  return safeEqual(String(value || ''), expected);
}