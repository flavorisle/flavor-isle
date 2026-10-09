// Verifies that a request really came from OpenAI, per the Standard Webhooks
// spec that OpenAI uses for webhook deliveries:
//
//   signed content = `${webhook-id}.${webhook-timestamp}.${raw body}`
//   headers        = webhook-id, webhook-timestamp, webhook-signature ("v1,<base64 HMAC-SHA256>")
//
// The signing secret is shown once when the webhook endpoint is created in the
// OpenAI dashboard and stored as OPENAI_WEBHOOK_SECRET. Several signatures may
// arrive space-separated (key rotation), so every v1 entry is checked.

const TOLERANCE_SECONDS = 300; // reject replays older than five minutes

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function decodeSecret(secret: string): Uint8Array {
  const raw = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  try {
    return base64ToBytes(raw);
  } catch (e) {
    // Some endpoints hand out a plain-text secret instead of base64 — sign with
    // its raw bytes so both shapes work.
    return new TextEncoder().encode(raw);
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyOpenAIWebhookSignature(req: Request, rawBody: string, secret: string): Promise<boolean> {
  if (!secret) return false;

  const id = req.headers.get('webhook-id');
  const timestamp = req.headers.get('webhook-timestamp');
  const signature = req.headers.get('webhook-signature');
  if (!id || !timestamp || !signature) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > TOLERANCE_SECONDS) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    decodeSecret(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(`${id}.${timestamp}.${rawBody}`),
  );
  const expected = bytesToBase64(new Uint8Array(digest));

  return signature.split(' ').some((entry) => {
    const [version, value] = entry.split(',');
    return version === 'v1' && !!value && timingSafeEqual(value, expected);
  });
}