# Builder report: page_share_cards_2026-09-24

## Page share cards — 8 routes (og/twitter meta via Seo)

**Status:** approved  
**App entity:** BuilderReport `6ab5384d97e30cf1547205d8`

### Before

8 routes (Menu, Milkshakes, Rewards, About, I65Exit38, MammothCaveDining, CorvetteCarClubs, Merch) had no per-route social share card og/twitter meta tags (5 had no Seo component at all; 3 had Seo with only title+description). Share previews fell back to the generic platform card.

### After

Added ogTitle/ogDescription/ogImage/ogImageAlt to the Seo component on all 8 routes (Menu, Milkshakes, Rewards, About, I65Exit38, MammothCaveDining, CorvetteCarClubs, Merch), mirroring the /reviews pattern exactly via the same Seo.jsx component and prop shape. I65Exit38/MammothCaveDining/CorvetteCarClubs already had Seo with title+description — only the 4 og props were added, existing title/description untouched. Menu/Milkshakes/Rewards/About/Merch had no Seo — added the import and a <Seo .../> with only the 4 og props (no title/description, so no page <title> copy changed). Rewards has 3 return paths (loading, logged-out, signed-in) — <Seo> added to all 3 so the card renders regardless of auth state. Images: referenced the provided public URLs directly (per the request's 'or reference the given public URLs directly' allowance) rather than re-uploading into this app's media, since no binary download/upload flow is available in the builder. /reviews and homepage untouched — no regression. Deviation: the shared Seo component emits og:title/description/image/alt and twitter:title/description/image but NOT twitter:card; left Seo.jsx unmodified so only the 8 listed routes change (modifying it would affect every route using Seo). No publication, no site testing, no test orders.
