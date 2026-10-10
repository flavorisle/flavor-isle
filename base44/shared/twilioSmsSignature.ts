// Twilio webhook authenticity. Twilio signs every webhook POST with
// X-Twilio-Signature = base64(HMAC-SHA1(authToken, url + sorted params)).
// Without this check anyone can forge an inbound SMS/voice webhook and, for
// example, opt a stranger into marketing texts or silence a customer's order
// updates.
//
// The signed URL is the one Twilio was configured with, which for this app can
// be the published base44.app host, the custom domain, or the request's own
// URL — so every known shape for this function is tried. A forged request still
// cannot pass: the HMAC needs TWILIO_AUTH_TOKEN.
export async function validTwilioSignature(req, params, functionName = 'twilioSmsStatus') {
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const signature = req.headers.get('x-twilio-signature');
  if (!token || !signature) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(token),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );

  // Twilio's parameter string: names sorted, then name+value for each value.
  const fields = [...new Set(params.keys())]
    .sort()
    .map((name) =>
      [...new Set(params.getAll(name))]
        .sort()
        .map((value) => name + value)
        .join(''),
    )
    .join('');

  let requestUrl = '';
  try {
    const parsed = new URL(req.url);
    requestUrl = `${parsed.origin}${parsed.pathname}`;
  } catch {
    requestUrl = '';
  }

  const candidates = [
    `https://taste-isle-express.base44.app/functions/${functionName}`,
    `https://flavor-isle.com/functions/${functionName}`,
    requestUrl ? `${requestUrl}/functions/${functionName}` : '',
    requestUrl,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const value = `${candidate}${fields}`;
    const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
    const expected = btoa(String.fromCharCode(...bytes));
    if (expected.length !== signature.length) continue;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    if (diff === 0) return true;
  }
  return false;
}