# Builder report: menu_image_to_product_page_2026-09-24

## Menu item card photo → product page deep link

**Status:** approved  
**App entity:** BuilderReport `6ab5a165b31b687bdef2a5aa`

### Before

Menu item card photos were not clickable. Customers could only interact via the hover Quick Add / Customize overlay, the bottom Add to Order button, or the Share button's copyable deep link.

### After

On menu item cards, the item photo (image area) is now clickable and opens a dedicated product detail page at /product/:id — a full page showing the hero image, description, price, calories, tags, customer reviews/ratings, and add-to-cart (Customize & Add opens the existing modifier modal; Make it a Combo for burgers). Applies to every photo layout: background, top, left, right; the text-only 'none' layout is unchanged. Sold-out items still open the page. The hover Quick Add overlay, bottom Add to Order button, Share button, favorite button, badges, and Happy Hour/sold-out styling are unchanged. A GA4 select_item event fires on photo click, consistent with add/combo tracking. The Share button's /menu?item=<id> deep link (scroll + auto-open modal) is unchanged. Editor-only change — needs a Publish to go live.
