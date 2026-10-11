import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public click-tracker for links inside customer emails. Email clients hit
// this URL (a GET), we log the click, then 302-redirect to the real destination.
// This lets us count how often each email CTA is actually clicked.
//
// Redirect targets are strictly allowlisted: a same-site path, or an absolute URL
// on flavor-isle.com. A protocol-relative target ("//evil.example") used to pass
// the old startsWith('/') test and then resolve against the base's scheme, turning
// this into an open redirect on the very domain customers already trust.
const ALLOWED_HOST = 'flavor-isle.com';
// A single leading slash, not two: "//host" is protocol-relative, not a path.
const SAFE_PATH = /^\/(?!\/)/;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const linkId = url.searchParams.get('link') || 'unknown';
    const to = url.searchParams.get('to') || '/';
    const orderId = url.searchParams.get('order_id') || null;

    let safeTarget = '/';
    if (SAFE_PATH.test(to) && !to.includes('\\')) {
      safeTarget = to;
    } else {
      try {
        const parsed = new URL(to);
        // Exact host, or a subdomain of it — never a suffix match, which would
        // accept "evil-flavor-isle.com".
        if (parsed.hostname === ALLOWED_HOST || parsed.hostname.endsWith(`.${ALLOWED_HOST}`)) {
          safeTarget = parsed.pathname + parsed.search;
        }
      } catch {
        /* not a same-site path and not a URL — fall back to the homepage */
      }
    }

    // Best-effort log — never block the redirect on a log failure.
    try {
      await base44.asServiceRole.entities.EmailClick.create({
        link_id: linkId,
        target_url: to,
        order_id: orderId,
      });
    } catch (logErr) {
      console.error('EmailClick log failed:', logErr.message);
    }

    // Always redirect to the custom domain — the function is called via the
    // base44.app URL (custom domain can't serve /functions), but the visitor
    // should land on flavor-isle.com.
    const REDIRECT_BASE = 'https://flavor-isle.com';
    return Response.redirect(new URL(safeTarget, REDIRECT_BASE).toString(), 302);
  } catch (error) {
    console.error('trackEmailClick error:', error.message);
    // Never dead-end a click — fall back to the homepage.
    return Response.redirect('https://flavor-isle.com/', 302);
  }
}