# Builder report: dessert_promo_priority_2026-09-22

## Dessert promo malt/sundae priority sort

**Status:** applied  
**App entity:** BuilderReport `6ab3499192c3dd7c96e196e6`

### Before

Discretionary promo selectors either picked randomly (birthday hero/grid, winback hero/grid, foodHero) or sorted fan-favorite-first without any malt/sundae priority (CartDessertUpsell, sendOrderRecommendationEmail available()), so a malt or sundae could be chosen while a suitable non-malt/sundae item was available. The winback email also had a blanket exclusion of plain 'Malt'/'Sundae' from its premium-dessert pool.

### After

IMPLEMENTED. Added base44/shared/dessertPriority.ts exporting isMaltOrSundae(item) (name matches \bmalt\b or \bsundae\b; shakes NOT demoted) and prioritySort(a,b) (non-malt/sundae tier 0 before malt/sundae tier 1, then fan-favorite flag, then fan_favorite_rank asc). Applied to every discretionary promo selector: (1) CartDessertUpsell.jsx — dessert rail sort now non-malt/sundae first then fan-favorite rank, slice(0,3); eligibility (DESSERT bucket, is_available, !is_hidden, image_url) unchanged; malts/sundaes fill remaining slots only if <3 other desserts. (2) sendOrderRecommendationEmail/entry.ts — available(bucket).sort(prioritySort) so all dessert branches (MAIN+SIDE no DESSERT -> 2 desserts, MAIN-only pairing dessert, fallback -> 2 desserts) pick non-malt/sundae first; SIDE/MAIN buckets unaffected (no malt/sundae there); item-appropriate email copy (itemCopy) unchanged. (3) sendBirthdayEmail/entry.ts — hero: treats.sort(prioritySort)[0] (non-malt/sundae treat preferred, malt/sundae fallback, withPhotos[0] deep fallback); grid: fanFaves.sort(prioritySort).slice(0,2) (non-malt/sundae fan favorites first, Sundae only if <2 others). (4) sendWinbackEmail/entry.ts — removed the blanket `if name==='malt'||name==='sundae' return false` exclusion (no blanket bans); hero: heroPool.sort(prioritySort)[0]; grid: pool.sort(prioritySort).slice(0,2); PREMIUM_DESSERT curated regex + fan-favorite fallback preserved. (5) sendOrderEmails.ts foodHeroHtml — withPhotos.sort(prioritySort)[0] instead of random. Net behavior: every selector prefers eligible non-malt/sundae items and only chooses a malt/sundae when no suitable non-malt/sundae alternative is available (or to fill remaining slots); fan-favorite rank orders items within each tier; no products removed, no static copy changed. Sundae remains a valid fallback and keeps its real units-sold rank #10 on the homepage (refreshFanFavorites untouched).
