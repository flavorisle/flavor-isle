# Builder report: social_reviews_facebook_lukecollins_2026-09-25

## Reviews page social videos — add Luke Collins Facebook reel

**Status:** applied  
**App entity:** BuilderReport `6ab6bf9660d35c517a697b0b`

### Before

Reviews.jsx social section held the TIKTOK_VIDEOS list (4 entries incl. @ashtonsjokes) and one INSTAGRAM_REEL. LazyEmbed.jsx supported only tiktok and instagram types.

### After

Added a new `facebook` embed type to LazyEmbed.jsx (Facebook video plugin iframe: https://www.facebook.com/plugins/video.php?href=<encoded URL>&show_text=true) matching the existing Instagram iframe pattern. Added a FACEBOOK_REEL entry to Reviews.jsx (canonical URL https://www.facebook.com/reel/1611434090062222/, creator Luke Collins, caption 'Update on the amazing local restaurant that deserves all the love and support', stats 37K views · 830 reactions) rendered between the TikTok list and the Instagram reel in the social section. Existing TikTok entries (including @ashtonsjokes added first) and the Instagram reel were not removed or reordered. No new dependencies. Editor-only change per Wesley's direct chat instruction (Sep 25, 2026) — Wesley publishes. NOTE: Wesley should verify the Facebook reel renders in the published preview (no login wall); if Facebook's plugin rejects this reel URL, the fallback is the blockquote + connect.facebook.net SDK embed.
