import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Public by design: visitors are recorded before they ever sign in. The IP comes from
// the request headers (only the server can see it), and the account, when there is one,
// is read from the caller's own token — never from the payload, so a visitor cannot
// claim to be someone else.
//
// Issue #161: every row is classified on the way in. Bots and prerender probes stay in
// the log — they are simply never counted as visitors — and a prerender probe path
// writes no row at all.
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

const PRERENDER_PREFIX = '/prerender-probe';

const BOT_TOKENS = [
  'bot', 'crawler', 'spider', 'GPTBot', 'ClaudeBot', 'Claude-Web', 'PerplexityBot',
  'Googlebot', 'bingbot', 'Applebot', 'AhrefsBot', 'SemrushBot', 'MJ12bot', 'Amazonbot',
  'DotBot', 'YandexBot', 'facebookexternalhit', 'Twitterbot', 'Slackbot', 'Discordbot',
  'LinkedInBot', 'HeadlessChrome', 'Lighthouse', 'Pingdom', 'UptimeRobot', 'curl/',
  'Wget', 'python-requests', 'Go-http-client', 'node-fetch', 'Base44-Backend',
];

// First matching rule wins, in this order. A prerender probe reaches the path rule
// only in theory — the hard skip above returns before any row is written.
function classify(ua: string, webdriver: unknown, vw: number, vh: number, path: string) {
  if (!ua) return { isBot: true, reason: 'no user agent' };
  if (webdriver === true) return { isBot: true, reason: 'webdriver' };
  const hay = ua.toLowerCase();
  const token = BOT_TOKENS.find((t) => hay.includes(t.toLowerCase()));
  if (token) return { isBot: true, reason: token };
  if (!vw || !vh) return { isBot: true, reason: 'no viewport' };
  if (path.startsWith(PRERENDER_PREFIX)) return { isBot: true, reason: 'prerender probe' };
  return { isBot: false, reason: '' };
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const path = cleanPath(body?.path);

    // Prerender probes are plumbing, not visitors: no row at all.
    if (path.startsWith(PRERENDER_PREFIX)) {
      return Response.json({ ok: true, skipped: true });
    }

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
    const visitorUa = String(body?.ua || '').slice(0, 400);
    const viewportW = Number(body?.vw) || 0;
    const viewportH = Number(body?.vh) || 0;
    const verdict = classify(visitorUa, body?.webdriver, viewportW, viewportH, path);

    await base44.asServiceRole.entities.VisitorPageView.create({
      ip: clientIp(req),
      path,
      user_email: user?.email || '',
      user_id: user?.id || '',
      user_name: user?.full_name || '',
      referrer,
      user_agent: userAgent,
      is_bot: verdict.isBot,
      bot_reason: verdict.reason,
      classified: true,
      visitor_ua: visitorUa,
      viewport_w: viewportW,
      viewport_h: viewportH,
      session_id: String(body?.sid || '').slice(0, 100),
    });

    return Response.json({ ok: true });
  } catch (error) {
    console.error('logPageView error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}