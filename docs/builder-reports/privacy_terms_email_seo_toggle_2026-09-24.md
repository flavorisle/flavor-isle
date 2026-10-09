# Builder report: privacy_terms_email_seo_toggle_2026-09-24

## Privacy Policy + Terms of Service contact email + SEO toggle

**Status:** approved  
**App entity:** BuilderReport `6ab5317eb971af0efd5f63e8`

### Before

mailto:hello@flavorisle.com on both PrivacyPolicy.jsx (~line 247) and TermsOfService.jsx (~line 245); Marketing SEO GEO Automatic titles/descriptions setting status unknown.

### After

Changed BOTH email buttons to mailto:hello@order.flavor-isle.com (Wesley's direct instruction). No other email addresses touched. SEO/GEO toggle: searched Base44 docs for the Marketing → SEO & GEO → Meta tags → 'Automatic titles and descriptions' toggle to turn it OFF (app now sets its own title/description via the Seo component). The docs search tool returned an error both attempts and could not confirm whether the toggle is reachable through the builder chat; it is a dashboard-side control Wesley can toggle himself under Marketing → SEO & GEO. No code or dashboard setting was changed for the SEO item.
