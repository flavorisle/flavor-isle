const SQUARE_API = 'https://connect.squareup.com/v2';
const SQUARE_VERSION = '2024-01-18';

// Build several normalized variants of a phone number so Square's exact-match
// customer search is more likely to hit regardless of how the POS stored it.
function phoneVariants(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  const variants = new Set();
  if (raw) variants.add(raw);
  if (digits) {
    variants.add(digits);
    if (digits.length >= 10) variants.add(digits.slice(-10));
    if (digits.length === 10) variants.add('+1' + digits);
    if (digits.length === 11 && digits.startsWith('1')) variants.add('+' + digits);
  }
  return [...variants];
}

// Look up a Square customer by phone number. Returns { id, name, email } or null.
export async function lookupCustomerByPhone(base44, phone) {
  if (!phone) return null;
  const connection = await base44.asServiceRole.connectors.getConnection('square');
  const accessToken = connection?.accessToken;
  if (!accessToken) return null;

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
    'Square-Version': SQUARE_VERSION,
  };

  for (const variant of phoneVariants(phone)) {
    try {
      const res = await fetch(`${SQUARE_API}/customers/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: { filter: { phone_number: { exact: variant } } },
          limit: 1,
        }),
      });
      const data = await res.json();
      const c = data?.customers?.[0];
      if (c) {
        const name = [c.given_name, c.family_name].filter(Boolean).join(' ').trim() || c.company_name || '';
        return { id: c.id, name, email: c.email_address || '' };
      }
    } catch (e) {
      // try the next variant
    }
  }
  return null;
}