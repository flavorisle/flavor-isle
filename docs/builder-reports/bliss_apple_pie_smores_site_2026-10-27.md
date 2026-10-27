# Bliss Build — Apple Pie Bliss + Smores added to the site Signature Bliss section

Built Oct 27, 2026 against flavorisle/flavor-isle#126 (approved by Wesley Booker Oct 27, 2026, ~12:12 PM CT). Executed exactly as pre-planned: **5 files, 13 insertions, 5 deletions**, nothing else touched.

Verified against live data before and after the change — both new items load from their Square-synced records:

| MenuItem id | Name | Category | Price | Hidden | Available | Modifier groups |
|---|---|---|---|---|---|---|
| `6adcb31da2a930a844ed2026` | Apple Pie Bliss Milkshake | Blend & Bliss | $5.99 | false | true | Size, SELECT THE BASE, Ingredients, Specialty Shake Toppings |
| `6adcb69c70a34c9e1e47ee31` | Smores Milkshake | Blend & Bliss | $5.99 | false | true | Size, SELECT THE BASE, Ingredients, Specialty Shake Toppings |

Both carry a Size modifier, so the cards open the size picker exactly like the existing Bliss shakes. No price, size, modifier, or photo value was written by this build — all of it still reads live from the Square records.

---

## FILE 1 — `src/components/PremiumShakesSection.jsx`

### (d) Stale comment above the array

**Before**

```jsx
// The five specialty "Bliss" shakes — standalone Square items with their own
// pricing and a Size modifier. Displayed below the build-your-own flavor grid.
```

**After**

```jsx
// The specialty "Bliss" shakes — standalone Square items with their own
// pricing and a Size modifier. Displayed below the build-your-own flavor grid.
// Hidden (is_hidden) entries stay listed here so re-activating a flavor in
// Square needs no code change.
```

### (a) `PREMIUM_SHAKE_IDS` — two IDs appended at the END

**Before**

```jsx
const PREMIUM_SHAKE_IDS = [
  '6a3e37fe23e413b185c3732a', // Banana Pudding Bliss
  '6a3e3807f128347090f2090d', // Circus Cookie Bliss
  '6a3e3805ff57925d93d080ba', // Southern Peach Crumble Bliss
  '6a3e37fee8d7ba1372e2072f', // Banana Split Bliss
  '6a7b92470796edccdb26af34', // Caramel Apple Bliss
  '6ab2d3f6dfddfc7740e92cde', // Strawberry Crunch Bliss
];
```

**After**

```jsx
const PREMIUM_SHAKE_IDS = [
  '6a3e37fe23e413b185c3732a', // Banana Pudding Bliss
  '6a3e3807f128347090f2090d', // Circus Cookie Bliss
  '6a3e3805ff57925d93d080ba', // Southern Peach Crumble Bliss
  '6a3e37fee8d7ba1372e2072f', // Banana Split Bliss
  '6a7b92470796edccdb26af34', // Caramel Apple Bliss
  '6ab2d3f6dfddfc7740e92cde', // Strawberry Crunch Bliss
  '6adcb31da2a930a844ed2026', // Apple Pie Bliss
  '6adcb69c70a34c9e1e47ee31', // Smores
];
```

No existing ID removed, none reordered. Peach's id `6a3e3805ff57925d93d080ba` stays in place (still hidden in Square).

### (b) `SHORT_NAMES` — two entries added

**Before**

```jsx
  '6ab2d3f6dfddfc7740e92cde': 'Strawberry Crunch Bliss',
};
```

**After**

```jsx
  '6ab2d3f6dfddfc7740e92cde': 'Strawberry Crunch Bliss',
  '6adcb31da2a930a844ed2026': 'Apple Pie Bliss',
  '6adcb69c70a34c9e1e47ee31': 'Smores',
};
```

### (c) `AVAILABILITY_BADGES` — two 'New' badges added

**Before**

```jsx
  '6ab2d3f6dfddfc7740e92cde': { label: 'New', className: 'bg-patina-mint text-white' },
};
```

**After**

```jsx
  '6ab2d3f6dfddfc7740e92cde': { label: 'New', className: 'bg-patina-mint text-white' },
  '6adcb31da2a930a844ed2026': { label: 'New', className: 'bg-patina-mint text-white' },
  '6adcb69c70a34c9e1e47ee31': { label: 'New', className: 'bg-patina-mint text-white' },
};
```

---

## FILE 2 — `src/pages/Milkshakes.jsx` (line 68)

**Before**

```jsx
  const PREMIUM_COUNT = 6;
```

**After**

```jsx
  const PREMIUM_COUNT = 7;
```

Hero now auto-computes to 22 total flavors with the breakdown `14 originals · 7 premium bliss · malt`.

---

## FILE 3 — `src/components/ShakeIsleStory.jsx` (line 18)

**Before**

```
Choose from sixteen original flavors. Five premium legends. Or build your own masterpiece from scratch — it's your craving.
```

**After**

```
Choose from fourteen original flavors. Seven premium legends. Or build your own masterpiece from scratch — it's your craving.
```

---

## FILE 4 — `src/components/about/AboutValues.jsx` (line 8, Hand-Spun Shakes value)

**Before**

```
Real ice cream, spun one at a time. Sixteen original flavors, five premium legends, or build your own from scratch.
```

**After**

```
Real ice cream, spun one at a time. Fourteen original flavors, seven premium legends, or build your own from scratch.
```

---

## FILE 5 — `src/components/MilkshakePromoBanner.jsx` (line 26)

**Before**

```jsx
  const PREMIUM_COUNT = 5;
```

**After**

```jsx
  const PREMIUM_COUNT = 7;
```

---

## Expected visible result — Signature Bliss section

Cards render in `PREMIUM_SHAKE_IDS` order, with `is_hidden` items filtered out, so the row reads:

1. Banana Pudding Bliss — $5.99
2. Banana Split Bliss — $5.99
3. Caramel Apple Bliss — $5.99 (Limited Time)
4. Strawberry Crunch Bliss — $5.99 (New)
5. **Apple Pie Bliss — $5.99 (New)**
6. **Smores — $5.99 (New)**

Hidden and therefore not rendered: Circus Cookie Bliss, Peach Crumble Bliss. The two new cards show the existing no-photo fallback until Square photos are added; the daily sync picks those up with no code change.

## What did NOT change

- No menu category changes, no reordering of any menu section.
- Kitchen tickets, order flows, cart, checkout, phone ordering (Smashie): untouched.
- Prices, sizes, modifiers: untouched and still live from Square records.
- Photos: untouched.
- No test orders placed.
- `git diff --stat` confirms exactly the 5 files above.

## Verification

| Check | Result |
|---|---|
| `git diff --stat` | 5 files changed, 13 insertions(+), 5 deletions(-) — the 5 files in scope only |
| Production build (`npm run build`) | Completes with no errors (only the routine stale-browserslist notice) |
| Test suite (`npm test`) | 69 tests, 69 pass, 0 fail |
| Both new MenuItem ids resolve | Yes — visible, available, $5.99, with Size + base + toppings groups |

## One observation, left unchanged on purpose

`src/pages/Milkshakes.jsx` line 67, the comment directly above the constant just changed, still reads "Total shake count includes the 5 premium Bliss shakes". Issue #126 lists only line 68 for this file and sets a hard limit on files and lines, so the comment was left as-is. It is wrong by one build only in prose (the rendered counts are correct); flag it if you want a one-word follow-up to say 7.