import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Public account-existence lookup used by the sign-in and sign-up forms.
// It answers one boolean and nothing else, so it can never leak a customer's
// name, role or contact details.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60 * 1000;

// Per-IP counters, kept in memory. A recycled worker starts empty, which is
// fine for this: the guard only has to stop one client hammering the endpoint.
const hits = new Map();

function clientIp(req) {
  const forwarded = req.headers.get('x-forwarded-for') || '';
  return forwarded.split(',')[0].trim() || 'unknown';
}

export default async function (req) {
  try {
    const ip = clientIp(req);
    const now = Date.now();

    // Drop windows that have already expired before counting this request.
    for (const [key, bucket] of hits) {
      if (now - bucket.start >= RATE_WINDOW_MS) hits.delete(key);
    }

    const current = hits.get(ip);
    if (!current) {
      hits.set(ip, { start: now, count: 1 });
    } else {
      if (current.count >= RATE_LIMIT) {
        return Response.json({ error: 'rate limited' }, { status: 429 });
      }
      current.count += 1;
    }

    const body = await req.json().catch(() => ({}));
    const raw = body?.email;
    if (typeof raw !== 'string' || !raw.trim()) {
      return Response.json({ error: 'email required' }, { status: 400 });
    }

    const email = raw.trim().toLowerCase();
    if (!EMAIL_RE.test(email)) {
      return Response.json({ error: 'invalid email' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const found = await base44.asServiceRole.entities.User.filter({ email });
    const matches = Array.isArray(found) ? found : (found?.items || []);

    // Only existence leaves this function — never the account's details.
    return Response.json({ exists: matches.length > 0 });
  } catch (error) {
    // Never log the submitted address.
    console.error('checkAccountExists failed:', error?.message || 'unknown error');
    return Response.json({ error: 'lookup failed' }, { status: 500 });
  }
}