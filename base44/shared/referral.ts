// Star Rewards referral codes (issue #83, Part A).
//
// A referral code is a reversible encoding of the referrer's phone number: the
// E.164 digits are XOR'd with an HMAC-SHA256 keystream (label `fi-referral-v1`)
// and the result is base36-encoded to 8 uppercase characters. Nothing is stored
// anywhere — the code carries the referrer, and only a server holding the
// signing secret can turn one back into a phone number, so a code sitting in a
// public URL or an email never exposes the number.
//
// The keystream key is TWILIO_AUTH_TOKEN — this app's existing signing secret
// (it already keys the HMAC webhook validation in twilioSmsSignature.ts). With
// no secret available no codes are issued or read, so the feature is simply off.

const LABEL = 'fi-referral-v1';
const CODE_LENGTH = 8;
const BASE36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{6,12}$/;

function signingSecret(): string {
  return String(Deno.env.get('TWILIO_AUTH_TOKEN') || '');
}

// 40 bits of keystream — enough to blind a 10-digit US number while keeping the
// encoded result inside 8 base36 characters (36^8 > 2^40).
async function keystreamMask(): Promise<bigint | null> {
  const secret = signingSecret();
  if (!secret) return null;
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const digest = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(LABEL)));
  let mask = 0n;
  for (let i = 0; i < 5; i++) mask = (mask << 8n) | BigInt(digest[i]);
  return mask;
}

function fromBase36(code: string): bigint | null {
  let value = 0n;
  for (const char of code) {
    const digit = BASE36.indexOf(char);
    if (digit < 0) return null;
    value = value * 36n + BigInt(digit);
  }
  return value;
}

// Normalize a `?ref=` value from a URL or a create-order payload. Anything that
// isn't a plausible code is dropped, so a junk param never reaches an Order.
export function normalizeReferralCode(value: unknown): string {
  const code = String(value ?? '').trim().toUpperCase();
  return REFERRAL_CODE_PATTERN.test(code) ? code : '';
}

// The referrer's shareable code, or null when the phone can't be encoded (not
// a phone number, or no signing secret configured).
export async function referralCodeForPhone(e164: string): Promise<string | null> {
  const digits = String(e164 || '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 12) return null;
  const mask = await keystreamMask();
  if (mask === null) return null;
  const encoded = (BigInt(digits) ^ mask).toString(36).toUpperCase();
  if (encoded.length > CODE_LENGTH) return null;
  return encoded.padStart(CODE_LENGTH, '0');
}

// Server-side only: turn a referral code back into the referrer's E.164 phone
// number. Returns null for anything that isn't a code this app issued.
export async function referralPhoneFromCode(code: string): Promise<string | null> {
  const clean = String(code || '').trim().toUpperCase();
  if (clean.length !== CODE_LENGTH) return null;
  const value = fromBase36(clean);
  if (value === null) return null;
  const mask = await keystreamMask();
  if (mask === null) return null;
  const digits = (value ^ mask).toString();
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}