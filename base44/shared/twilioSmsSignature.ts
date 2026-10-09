export async function validTwilioSmsSignature(req, params) {
  const token = Deno.env.get('TWILIO_AUTH_TOKEN');
  const signature = req.headers.get('x-twilio-signature');
  if (!token || !signature) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(token), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const query = new URL(req.url).search;
  const fields = [...new Set(params.keys())].sort().map(name =>
    [...new Set(params.getAll(name))].sort().map(value => name + value).join('')
  ).join('');
  // Old untracked senders used the custom-domain endpoint; new logged texts
  // use the published endpoint. Only these known URLs are accepted.
  for (const base of ['https://taste-isle-express.base44.app', 'https://flavor-isle.com']) {
    const value = `${base}/functions/twilioSmsStatus${query}${fields}`;
    const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value)));
    const expected = btoa(String.fromCharCode(...bytes));
    if (expected.length !== signature.length) continue;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    if (diff === 0) return true;
  }
  return false;
}