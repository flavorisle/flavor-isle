// ┌───────────────────────────────────────────────────────────────────────┐
// │  GOOGLE_REVIEW_URL — the public Google Business Profile review link.  │
// │                                                                       │
// │  >>> Replace the placeholder below with the real link from the Google  │
// │      Business Profile dashboard:                                      │
// │      Business > Reviews > "Ask for reviews" → copy the short link.    │
// │                                                                       │
// │  Both sendReviewRequestEmail and trackReviewClick import this single   │
// │  constant, so the real link only needs to be dropped in HERE.          │
// └───────────────────────────────────────────────────────────────────────┘
export const GOOGLE_REVIEW_URL = 'https://g.page/r/CV6yjuufbFatEAE/review';

// The same link, read from the app secret. The order-ready email's Google P.S.
// and the post-order review text (issue #37) are gated on this secret: when it
// is empty they are omitted entirely rather than risking a broken link going
// out to a customer. The review-request email above keeps using the constant,
// so it is never affected by the secret being unset.
export function googleReviewSecretUrl() {
  return String(Deno.env.get('GOOGLE_REVIEW_URL') || '').trim();
}