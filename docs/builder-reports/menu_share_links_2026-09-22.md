# Builder report: menu_share_links_2026-09-22

## Shareable Menu Item Links + Share Action

**Status:** applied  
**App entity:** BuilderReport `6ab31876b70f6dd7abe1d49f`

### Before

Menu items had no shareable permanent URL and no Share action on cards or the customization modal.

### After

IMPLEMENTED (static code review only, no test orders/texts). (1) Shareable item URLs: /menu?item=<stable id> opens that item's customization/detail modal (ModifierModal) focused and scrolled into view, without adding to cart. URL keyed by item.id so it survives name/category changes. Hidden items are filtered out of the menu list, so a hidden/deleted/invalid id yields focusMissing → a friendly 'This item isn't available' banner with a 'Back to full menu' button; the full menu still renders below. Sold-out items still open the detail view but the modal's Add-to-Order button is disabled showing 'Sold Out' (never offers ordering of unavailable items). Works on refresh and mobile (Menu is a keep-alive tab; useLocation drives focus; autoOpen effect opens/closes the modal as the query param changes, so navigating away closes the portal modal). (2) Share action: new ShareItemButton (src/components/ShareItemButton.jsx) added to every public item card (all 5 image_position layouts: none, background, left, right, top) and to the ModifierModal header. Uses navigator.share native sheet when available, copy-to-clipboard fallback with 'Link Copied' feedback. Favorite button shifted to right-12 to make room; share sits at right-3. Preserved: Customize & Add, cart, back navigation, category navigation, prices, descriptions, Square mappings, checkout, orders, promotions, SMS consent, rewards, settings, branding. Merch untouched. A2P remediation untouched; no Twilio campaign changes.
