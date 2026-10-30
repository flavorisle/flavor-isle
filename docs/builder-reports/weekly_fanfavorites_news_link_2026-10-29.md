# BuilderReport — Weekly Fan Favorites + Community News link (Oct 29 2026)

**Issue:** flavorisle/flavor-isle#132
**Scope:** exactly four files. No menu data touched (no items, categories, orders, prices, photos, hidden flags), no orders placed, no customers contacted, no Square writes, no database writes, no new files, no deleted files, no new dependencies.

**Build:** `npm run build` → **exit 0**

**Files changed (4):**

```
 base44/functions/refreshFanFavorites/entry.ts
 base44/workflows/Refresh Fan Favorites.jsonc
 src/components/FanFavoritesSection.jsx
 src/pages/Home.jsx
```

---

## CHANGE 1 — `base44/functions/refreshFanFavorites/entry.ts` (comment text)

The header comment describing the aggregation window. Comment only — no behaviour.

**Before**
```ts
// (online + in-store POS) from COMPLETED, PAID orders in the last 60 days,
```

**After**
```ts
// (online + in-store POS) from COMPLETED, PAID orders in the last 7 days,
```

## CHANGE 2 — `base44/functions/refreshFanFavorites/entry.ts` (the constant)

**Before**
```ts
const LOOKBACK_DAYS = 60;
```

**After**
```ts
const LOOKBACK_DAYS = 7;
```

Nothing else in the file changed. Both derived uses are untouched and still read the constant:

- `const pullStart = new Date(Date.now() - LOOKBACK_DAYS * 86400000).toISOString();`
- `... lookback_days: LOOKBACK_DAYS, computed_at: new Date().toISOString() };` (FanFavoriteSnapshot)

So the Square order pull window and the stored `lookback_days` both become 7 automatically.

## CHANGE 2b — `base44/workflows/Refresh Fan Favorites.jsonc`

Step `x-base44` description only.

**Before**
```json
"description": "Aggregate 60 days of Square sales, stamp top 10"
```

**After**
```json
"description": "Aggregate 7 days of Square sales, stamp top 10"
```

Unchanged, verified: `cron_expression` `0 3 * * *`, `timezone` `America/Chicago`, `schedule_mode` `recurring`, `ends_type` `never`, workflow `active` status, `function_name` `refreshFanFavorites`, `args` `{}`, the `x-base44.title`, and the rest of the definition.

## CHANGE 3 — `src/components/FanFavoritesSection.jsx` (badge text, line 38)

**Before**
```jsx
              TOP #{item.rank}
```

**After**
```jsx
              Top Fan Favorite #{item.rank}
```

The badge `<span>` and every one of its className values are byte-for-byte identical — no class added, removed, reordered or recoloured; no size or layout change. Only the text node changed.

## CHANGE 4 — `src/pages/Home.jsx` (import + news link)

**4a — lucide-react import (line 3)**

Before
```jsx
import { ArrowRight, Clock, MapPin, Utensils, ShoppingBag, Bike, HelpCircle, Car } from 'lucide-react';
```

After
```jsx
import { ArrowRight, Clock, MapPin, Utensils, ShoppingBag, Bike, HelpCircle, Car, Newspaper } from 'lucide-react';
```

`Link` and `ArrowRight` were already imported, so no other import was added.

**4b — new block inserted between `<EarlyCloseNotice />` and the `{/* ── EXIT 38 PHOTO STORY ── */}` comment**

Both of those surrounding lines are unmodified; the block below was inserted verbatim between them:

```jsx
      {/* ── COMMUNITY NEWS LINK (small, top of page) ── */}
      <div className="bg-vanilla-malt border-b border-midnight-cherry/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Link
            to="/community-news"
            className="flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-heading uppercase tracking-widest text-midnight-cherry hover:text-obsidian-roast transition-colors whitespace-nowrap"
          >
            <Newspaper size={14} aria-hidden="true" />
            <span>Community News</span>
            <span className="hidden sm:inline font-body normal-case tracking-normal text-muted-foreground">&mdash; what&rsquo;s happening at the Isle</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
```

Nothing else on `Home.jsx` changed. The `/community-news` route already exists in `src/App.jsx`, which was not modified.

---

## Verification

`git diff` for this change set contains **only** the four edits above (2 hunks in `refreshFanFavorites/entry.ts`, 1 in the workflow JSONC, 1 in `FanFavoritesSection.jsx`, 2 in `Home.jsx`). No other file in the repository is modified. Build passes with exit 0.