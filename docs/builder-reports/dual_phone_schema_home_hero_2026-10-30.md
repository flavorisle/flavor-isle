# BuilderReport — Dual phone contacts in schema + homepage hero headline (Oct 30 2026)

**Issue:** flavorisle/flavor-isle#133
**Scope:** exactly 4 files, 5 edits. No menu data touched (items, categories, order, prices, photos, copy), no Smashie TTS/voice/phone routing, no other photos, page titles, meta descriptions, layout, spacing, analytics, or any other page/function/entity/workflow. No files created beyond this report, none deleted, no dependencies added. **Not published** — Wesley publishes from the editor.

**Build:** `npm run build` → **exit 0**

**Files changed (4):**

```
 src/pages/Home.jsx          | 2 +-
 index.html                  | 12 ++++++++++--
 src/lib/schemaMarkup.js     |  6 +++++-
 src/pages/Faq.jsx           |  4 ++--
 4 files changed, 18 insertions(+), 6 deletions(-)
```

`git diff --stat` lists these four and no fifth file.

---

## STEP 1 — `src/pages/Home.jsx` line 180

**Before**
```jsx
      <CinematicHero cityLine />
```

**After**
```jsx
      <CinematicHero cityLine heading="Burgers & shakes in Smiths Grove since 1964." subtitle="Two minutes off I-65. Zero regrets." />
```

`src/components/cinematic/CinematicHero.jsx` was **not** edited; its defaults are untouched. Every other caller keeps its own props, verified after the edit:

- `Faq.jsx:184` `<CinematicHero heading="Questions, answered." subtitle="Directions, hours, ordering, parking and the rest of it — all in one place." />` — unchanged
- `Gallery.jsx:55` `<CinematicHero heading="A look around Flavor Isle." subtitle="Real food. Real folks. Real Smiths Grove." />` — unchanged
- `I65Exit38.jsx:103` `<CinematicHero heading="Your stop at Exit 38 starts here." subtitle="Fresh burgers, thick shakes, and a warm welcome just off the interstate." />` — unchanged

## STEP 2 — `index.html` line 47 (first Restaurant block, `id="restaurant-schema"`)

**Before**
```json
      "telephone": "+12705637230",
```

**After**
```json
      "telephone": "+12705634618",
      "contactPoint": [
        { "@type": "ContactPoint", "telephone": "+12705634618", "contactType": "customer service" },
        { "@type": "ContactPoint", "telephone": "+12705637230", "contactType": "reservations", "name": "Smashie AI phone ordering" }
      ],
```

## STEP 3 — `index.html` line 113 (second Restaurant block, the one carrying `sameAs`)

Same exact replacement as Step 2:

**Before**
```json
      "telephone": "+12705637230",
```

**After**
```json
      "telephone": "+12705634618",
      "contactPoint": [
        { "@type": "ContactPoint", "telephone": "+12705634618", "contactType": "customer service" },
        { "@type": "ContactPoint", "telephone": "+12705637230", "contactType": "reservations", "name": "Smashie AI phone ordering" }
      ],
```

Both hunks are the only change in `index.html`; no other key, block, meta tag or script was touched.

## STEP 4 — `src/lib/schemaMarkup.js` line 45, inside `restaurantSchema()`

**Before**
```js
    telephone: '+12705637230',
```

**After**
```js
    telephone: '+12705634618',
    contactPoint: [
      { '@type': 'ContactPoint', 'telephone': '+12705634618', 'contactType': 'customer service' },
      { '@type': 'ContactPoint', 'telephone': '+12705637230', 'contactType': 'reservations', 'name': 'Smashie AI phone ordering' },
    ],
```

Nothing else in the function changed (name, description, image, logo, url, menu, priceRange, servesCuisine, address, geo, opening hours all as before).

## STEP 5 — `src/pages/Faq.jsx`, "Still curious?" block

**5a — line 214 (only the phone digits changed)**

Before
```jsx
          <p className="text-sm text-muted-foreground mt-2 mb-5">103 N Main St, Smiths Grove, KY 42171 · (270) 563-7230</p>
```

After
```jsx
          <p className="text-sm text-muted-foreground mt-2 mb-5">103 N Main St, Smiths Grove, KY 42171 · (270) 563-4618</p>
```

**5b — line 223 (label only)**

Before
```jsx
              <Phone size={16} /> (270) 563-7230
```

After
```jsx
              <Phone size={16} /> Call Smashie · (270) 563-7230
```

The surrounding `<a href="tel:+12705637230" className="btn-mint chrome-hover px-7 py-3.5 text-sm font-heading inline-flex items-center gap-2">` on line 222 is **unchanged** — the button still dials the AI line, and only its visible label now names Smashie. No other FAQ question, answer, heading, layout or spacing touched.

---

## Verification (issue #133 checklist)

1. **Build passes** — `npm run build` exit 0.
2. **Exactly four files in the diff** — `src/pages/Home.jsx`, `index.html`, `src/lib/schemaMarkup.js`, `src/pages/Faq.jsx`; no fifth file. This report is the only new file.
3. **Homepage has exactly one `<h1>`**, reading `Burgers & shakes in Smiths Grove since 1964.`, with the subtitle paragraph `Two minutes off I-65. Zero regrets.` — the only `<h1>` in `CinematicHero` (line 27) and none in any other component imported by `Home.jsx`; `Home.jsx` itself contains no `<h1>`.
4. **Parsed `index.html` JSON-LD** — all three `application/ld+json` blocks parse as valid JSON. The two Restaurant blocks (first = `id="restaurant-schema"`, second = the `sameAs` block) each report `telephone == +12705634618` and a 2-entry `contactPoint` equal to `[+12705634618 customer service, +12705637230 reservations "Smashie AI phone ordering"]`. The second block still carries `sameAs`.
5. **Runtime JSON-LD on `/`, `/menu` and `/i65-exit-38`** — the static head block `#restaurant-schema` ships on every route with the new telephone + contactPoint; `RestaurantSchema` (mounted app-wide in `App.jsx`) rewrites only `openingHoursSpecification` from live hours and preserves every other key. On `/` the page also renders `HomeStructuredData` → `restaurantSchema(hours)` → same new telephone + contactPoint. Verified in source: `restaurantSchema(` has exactly one caller (`HomeStructuredData.jsx`), and `telephone` appears nowhere else in `src/components/schema/` or `RestaurantSchema.jsx`.
6. **Faq / Gallery / I65Exit38 heroes unchanged** — copy-paste comparison above; only Faq's contact block lines changed in that file.
7. **No menu change** — no `MenuItem`, `MenuSetting`, `Menu.jsx`, category, order, price, photo or menu-copy file was read-modified or written.

**Out of scope and left alone:** Smashie TTS/voice routing (`twilioVoice*`, `smashieTts`, `smashieSipIncoming`), `RestaurantSchema.jsx` logic, page titles, meta descriptions, layout/spacing, analytics, and every other page/function/entity/workflow.