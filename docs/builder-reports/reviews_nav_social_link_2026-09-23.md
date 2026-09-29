# Builder report: reviews_nav_social_link_2026-09-23

## Navigation: Reviews link replaces Social Reviews; /reviews links to /social-reviews

**Status:** applied  
**App entity:** BuilderReport `6ab443330d0e94cc48050f79`

### Before

NavMenuPanel Community group had 'Social Reviews' -> /social-reviews. /reviews page CTA band had 'Review us on Google' + 'Share Feedback' buttons only; no link to the /social-reviews Instagram rewards page.

### After

NavMenuPanel.jsx Community group: replaced 'Social Reviews' -> /social-reviews with 'Reviews' -> /reviews (Reviews now sits where Social Reviews was; Social Reviews removed from nav). Reviews.jsx: added Instagram icon import and a 'Post & Earn Points' link to /social-reviews in the bottom CTA band (white/10 pill on navy). /social-reviews page itself unchanged and still reachable via the new link. No other nav entries, pages, or business logic touched.
