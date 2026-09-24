import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { GOOGLE_REVIEW_URL } from '../../shared/googleReviewUrl.ts';

// Public click-tracker for the "Leave a Google review" button in review-request
// emails. Email clients hit this URL (a GET), we log the click to the EmailClick
// entity (link_id 'google_review'), then 302-redirect to the Google Business
// Profile review page. The redirect target is the hardcoded GOOGLE_REVIEW_URL
// constant — not user-controlled — so there's no open-redirect risk.
Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const orderId = url.searchParams.get('order_id') || null;

    // Best-effort log — never block the redirect on a log failure.
    try {
      await base44.asServiceRole.entities.EmailClick.create({
        link_id: 'google_review',
        target_url: GOOGLE_REVIEW_URL,
        order_id: orderId,
      });
    } catch (logErr) {
      console.error('EmailClick log failed:', logErr.message);
    }

    // If the Google review link hasn't been set yet, fall back to the site
    // homepage so the click doesn't dead-end.
    if (!GOOGLE_REVIEW_URL || GOOGLE_REVIEW_URL === 'REPLACE_WITH_GOOGLE_REVIEW_LINK') {
      return Response.redirect('https://flavor-isle.com/', 302);
    }

    return Response.redirect(GOOGLE_REVIEW_URL, 302);
  } catch (error) {
    console.error('trackReviewClick error:', error.message);
    return Response.redirect('https://flavor-isle.com/', 302);
  }
});