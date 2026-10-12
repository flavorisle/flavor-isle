// Phone number normalization for the customer directory (issue #96, section A).
//
// One rule, used everywhere a phone number identifies a customer: strip every
// non-digit, then put it in +1XXXXXXXXXX form. Anything that is not a 10-digit
// number or an 11-digit number starting with 1 is returned UNCHANGED — never
// null, so callers can store the result directly and a junk value can never
// erase the phone a customer typed.
export function normalizePhone(raw: unknown): string {
  const text = raw == null ? '' : String(raw).trim();
  const digits = text.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+1${digits.slice(1)}`;
  return text;
}

// The last ten digits of a phone number, for matching one format against
// another (the same rule the blocked-contact list uses). Empty when the input
// does not hold ten digits — callers treat that as "no phone to match on".
export function phoneDigits(raw: unknown): string {
  const digits = String(raw == null ? '' : raw).replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return '';
}