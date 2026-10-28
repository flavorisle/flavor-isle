// Message consolidation (Oct 28 2026): the post-order Google review TEXT is
// retired. The review ask now rides inside the single thank-you email sent by
// processPendingRecommendationEmails, so this scheduler deliberately does no
// work. It stays deployed so the workflow that calls it keeps succeeding.
//
// No existing SmsDeliveryLog rows are touched: history is preserved.
export default async function (req) {
  return Response.json({ ok: true, skipped: true, reason: 'Review text retired; review ask moved to the thank-you email (Oct 28 2026 consolidation)' });
}