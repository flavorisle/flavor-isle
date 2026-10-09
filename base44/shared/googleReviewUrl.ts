// ┌───────────────────────────────────────────────────────────────────────┐
// │  GOOGLE_REVIEW_URL — the public Google Business Profile review link.  │
// │                                                                       │
// │  The app secret GOOGLE_REVIEW_URL overrides this default so the link    │
// │  can be changed without a code update.                                 │
// │                                                                       │
// │  Both sendReviewRequestEmail and trackReviewClick import this single   │
// │  constant, so the real link only needs to be dropped in HERE.          │
// └───────────────────────────────────────────────────────────────────────┘
export const GOOGLE_REVIEW_URL = 'https://www.google.com/maps?cid=12490290050666246750';

// The app secret can replace the canonical listing URL without a code update.
export function googleReviewSecretUrl() {
  return String(Deno.env.get('GOOGLE_REVIEW_URL') || GOOGLE_REVIEW_URL).trim();
}