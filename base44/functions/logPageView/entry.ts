import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Public by design: visitors are recorded before they ever sign in. The IP comes from
// the request headers (only the server can see it), and the account, when there is one,
// is read from the caller's own token — never from the payload, so a visitor cannot
// claim to be someone else.
function clientIp(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim().slice(0, 64);
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim().slice(0, 64);
  return (req.headers.get('x-real-ip') || 'unknown').slice(0, 64);
}

function cleanPath(value: unknown): string {
  const raw = String(value || '/').split('?')[0].split('#')[0].trim();
  if (!raw.startsWith('/')) return '/';
  return raw.slice(0, 200);
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const path = cleanPath(body?.path);

    // Signed-in visitor? An anonymous call has no valid token, so a failed read is
    // simply a guest rather than an error worth failing the view over.
    let user: any = null;
    try {
      user = await base44.auth.me();
    } catch {
      user = null;
    }

    const referrer = String(body?.referrer || '').trim().slice(0, 400);
    const userAgent = (req.headers.get('user-agent') || '').slice(0, 300);

    await base44.asServiceRole.entities.VisitorPageView.create({
      ip: clientIp(req),
      path,
      user_email: user?.email || '',
      user_id: user?.id || '',
      user_name: user?.full_name || '',
      referrer,
      user_agent: userAgent,
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('logPageView error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}