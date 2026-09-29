# Builder report: rec_email_combo_builder_2026-09-24

## sendOrderRecommendationEmail — MAIN-only branch (combo-builder for burgers)

**Status:** draft  
**App entity:** BuilderReport `6ab59b54d5d018f5c5281b08`

### Before

MAIN-only branch (hasMain && !hasSide && !hasDessert) always sent emailType 'pairing' with subject 'Complete the combo 🍟', recommending a fan-favorite SIDE + DESSERT to round out the meal — regardless of whether the ordered main was a burger or a non-burger (chicken, hot dog, etc.).

### After

MAIN-only branch now splits on burger detection. A MAIN counts as a burger if its category is 'burgers' OR its name matches /burger|melt|hamburger/ (consistent with bucketItem). BURGER mains: emailType 'combo_builder', subject 'Your {burgerName} costs less as a combo 🍔' (fallback 'Combo it next time 🍔' when >45 chars), bodyLine nudges the Combo Builder, NO side/dessert item cards (recommendations = []), CTA links to /combos via trackEmailClick with link id 'recommendation_combo_builder', button label 'BUILD YOUR COMBO →'. NON-burger mains: unchanged — keep the existing 'pairing' side+dessert email exactly as-is. The mandatory-photo filter and _bucket tagging are skipped for combo_builder (no item recs). Everything else untouched: dessert/similar_main/fallback branches, SMS-consent gate, 7-day frequency cap, skip list, atomic claim, and RecommendationEmail tracking-record creation (combo_builder records suggested_item_ids = []).

VERIFICATION (test_mode, no real customers, no tracking records): burger-only order 'mini burger' (6ab5737173f8846b175e4961) → {ok:true, email_type:'combo_builder', suggested:[]}. Non-burger main-only order 'chuckwagon sandwich' (6ab45c6b1e66ed1a2d164eee) → {ok:true, email_type:'pairing', suggested:['Zesty Bacon Ranch French Fries','Banana Split']} (regression confirmed).

CONFLICT / DEAD-END FLAG: /combos currently renders a 'Coming Soon' teaser for public WEB visitors (isNativeApp() === false) and only mounts the live ComboBuilderSection inside the native app/PWA build. So a web recipient clicking the CTA lands on a non-functional teaser. Per the approval instructions, the combo_builder bodyLine is framed as 'in the app' ('Next time, grab the app to build your combo...') so web recipients aren't sent to a dead end. The CTA still points to /combos (app users get the live builder; web users see the Coming Soon page, which is a soft landing rather than a 404). If/when the Combo Builder goes live on public web, the 'in the app' framing should be revisited.
