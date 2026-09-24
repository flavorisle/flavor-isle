import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Public click-tracker for links inside customer emails. Email clients hit
// this URL (a GET), we log the click, then 302-redirect to the real destination.
// This lets us count how often each email CTA is actually clicked.
Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const linkId = url.searchParams.get('link') || 'unknown';
    const to = url.searchParams.get('to') || '/';
    const orderId = url.searchParams.get('order_id') || null;

    // Only allow redirects to our own app (relative path or our domain) so this
    // endpoint can't be abused as an open redirect to arbitrary sites.
    let safeTarget = '/';
    if (to.startsWith('/')) {
      safeTarget = to;
    } else {
      try {
        const parsed = new URL(to);
        if (parsed.hostname.endsWith('flavor-isle.com')) {
          safeTarget = parsed.pathname + parsed.search;
        }
      } catch {
        /* ignore malformed */
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
});