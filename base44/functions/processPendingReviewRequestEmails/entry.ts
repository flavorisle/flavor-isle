// Message consolidation (Oct 28 2026): the separate review-request email is
// retired. The review ask now rides inside the single thank-you email sent by
// processPendingRecommendationEmails, so this scheduler deliberately does no
// work. It stays deployed so the workflow that calls it keeps succeeding, and
// sendReviewRequestEmail stays deployed and unchanged for manual admin use.
export default async function (req: Request) {
  return Response.json({ ok: true, skipped: true, reason: 'Review request merged into the thank-you email (Oct 28 2026 consolidation)' });
}