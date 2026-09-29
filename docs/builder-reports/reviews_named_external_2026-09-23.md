# Builder report: reviews_named_external_2026-09-23

## /reviews page named external reviews (Yelp + Google)

**Status:** applied  
**App entity:** BuilderReport `6ab43d426896f01404375fbd`

### Before

EXTERNAL_REVIEWS in src/pages/Reviews.jsx had 2 entries: 'Tripadvisor reviewer' (Tripadvisor) and 'Facebook reviewer' (Facebook). Combined with up to 12 site-submitted Review entity records in the Wall of Love grid.

### After

Expanded EXTERNAL_REVIEWS in src/pages/Reviews.jsx from 2 to 15 entries. Kept the 2 existing (Tripadvisor reviewer/Tripadvisor, Facebook reviewer/Facebook) unchanged. Added 10 Yelp reviews (Sydney L., Holly W., Jeff S., Rebecca L., Emily A., William J., Chris S., Juwan C., John W., Kelly F.) and 3 Google reviews (Toby Wadey, Danielle Roller, Thomas Llewellyn), all verbatim with ellipses preserved. Each keeps {text, name, source} shape; existing per-source badge rendering unchanged. Grid already renders all entries (no cap), so all 15 external + up to 12 site-submitted show. Video embeds, rating badges, site Review entity list, other pages, and the share-card work untouched.
