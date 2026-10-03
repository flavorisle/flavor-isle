import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { googleReviewSecretUrl } from '../../shared/googleReviewUrl.ts';

// Public click-tracker for the "Leave a Google review" button in review-request
// emails. Email clients hit this URL (a GET), we log the click to the EmailClick
// entity (link_id 'google_review'), then 302-redirect to the Google Business
// Profile review page. The redirect target comes from the GOOGLE_REVIEW_URL
// app secret or its canonical listing fallback, never from request input.
Deno.serve(async (req: Request) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const orderId = url.searchParams.get('order_id') || null;
    const reviewUrl = googleReviewSecretUrl();

    // Best-effort log — never block the redirect on a log failure.
    try {
      await base44.asServiceRole.entities.EmailClick.create({
        link_id: 'google_review',
        target_url: reviewUrl,
        order_id: orderId,
      });
    } catch (logErr) {
      console.error('EmailClick log failed:', logErr.message);
    }

    return Response.redirect(reviewUrl, 302);
  } catch (error) {
    console.error('trackReviewClick error:', error.message);
    return Response.redirect('https://flavor-isle.com/', 302);
  }
});