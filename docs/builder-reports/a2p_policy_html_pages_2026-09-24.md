# Builder report: a2p_policy_html_pages_2026-09-24

## A2P fix — plain-HTML policy pages + two-word wording fix

**Status:** approved  
**App entity:** BuilderReport `6ab546f449875d2479d7daff`

### Before

PrivacyPolicy.jsx and TermsOfService.jsx were client-rendered only — Twilio A2P carrier reviewers couldn't read them (campaign rejected 3x). The data-sharing sentence in both files ended '...to third parties or affiliates for marketing.' (PrivacyPolicy ~line 126, TermsOfService ~line 43). No static, no-JS version existed.

### After

Created two PUBLIC backend functions — publicPrivacyPolicy and publicTermsOfService — each returning 200 text/html with the COMPLETE policy text word-for-word (all sections, zero JavaScript) so carrier review bots can fetch it. Applied the two-word fix in BOTH the live React pages and the plain HTML: the sentence now reads exactly 'We do not share, sell, or provide your mobile phone number or messaging consent data to third parties or affiliates for marketing or promotional purposes.' Both functions tested and return 200 text/html with full policy text to a plain no-JS fetch. EXACT PUBLIC URLs: https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/functions/publicPrivacyPolicy and https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/functions/publicTermsOfService (also reachable at https://taste-isle-express.base44.app/functions/publicPrivacyPolicy and https://taste-isle-express.base44.app/functions/publicTermsOfService). No other copy changed; /reviews, homepage, and checkout untouched.
