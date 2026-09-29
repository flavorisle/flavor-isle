# Builder report: reviews_google_stats_2026-09-23

## /reviews hero Google rating-badge card (CTA -> stats)

**Status:** applied  
**App entity:** BuilderReport `6ab4421d9749bbae211a6e08`

### Before

Hero Google card was a CTA: main line 'Review us', sub line 'on Google', linking to GOOGLE_REVIEW_URL with amber Star icon. Facebook card showed '90% / 249 reviews', Tripadvisor '4.5/5 / Tripadvisor'.

### After

In src/pages/Reviews.jsx hero rating-badges row, converted the Google card from a CTA ('Review us' / 'on Google') into a stats card matching the Facebook card style, while keeping it a link to GOOGLE_REVIEW_URL (target _blank, rel noopener noreferrer, hover:shadow-float-lg). Main line now '4.7'; sub line now '445 reviews · Google'. Amber circle + Star icon unchanged. Facebook card, Tripadvisor card, EXTERNAL_REVIEWS, video embeds, site-submitted Review list, and all other pages untouched.
