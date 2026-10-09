# Builder report: reviews_og_share_card_2026-09-23

## /reviews route social share preview (og/twitter meta tags)

**Status:** applied  
**App entity:** BuilderReport `6ab43c0f2a101783fefc138b`

### Before

/reviews used <Seo title + description only /> — no per-route og/twitter tags. All routes inherited index.html defaults: og:title 'Flavor Isle | Burger Restaurant Near Me — Smiths Grove, KY', og:image 1503a227d_IMG_0428.jpg storefront, twitter:card summary_large_image.

### After

Extended src/components/Seo.jsx with optional ogTitle/ogDescription/ogImage/ogImageAlt (sets og:title, og:description, og:image, og:image:alt, twitter:title, twitter:description, twitter:image; omitted props leave index.html defaults). /reviews now passes: ogTitle 'What People Are Saying | Flavor Isle - Smiths Grove, KY'; ogDescription 'Real reviews from Google, Facebook, Yelp and Tripadvisor, plus viral food videos. See why travelers on I-65 call Flavor Isle the best burger stop in Kentucky.'; ogImage https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/files/mp/public/6a3d84f2fe4ae4efe7f629bf/dfe735e71_reviews-og.png (exact 1200x630 uploaded unaltered); ogImageAlt 'Flavor Isle reviews card with logo, star ratings, and a customer quote'. Page title/description, content, video embeds, and all other routes untouched.
