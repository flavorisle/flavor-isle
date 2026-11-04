# Explore Smiths Grove — Approved Poster Batch (issue #153)

Reference: `explore-smiths-grove-poster-links-2026-11-03` @ `e3b1676`. Applied only the approved changes; no other page, route, or component touched. Build passes (`vite build`, exit 0).

| # | File | Exact change | Where it now lives |
|---|------|--------------|--------------------|
| 001 | `src/pages/ExploreSmithsGrove.jsx` | Added the `M` media-base constant for the two new uploads (`cd9fa76fa_roost-building.jpg`, `9036d6038_roost-42171.jpg`). | Line 8 |
| 002 | `src/pages/ExploreSmithsGrove.jsx` | Replaced `SHOPS` with the 16 stores in poster order: The Roost, 42171 & Co., Marigold Manor, Psycho Granny’s Quilt Shop & More, The Foxhole, Smalls on Main, Marigold Vintage, Cinco de Mayo, Boone’s Antiques & The Garden Patch, Flavor Isle, Ace Coffee Indigo Fox, KY Card Vault, Second Chances & Main Attractions, Grammie’s Home Cookin’, Superior Supply, Pelly’s Farm Fresh — each with tag, address, handles, photo, alt, copy, tile. | `const SHOPS = [` line 13 → closes before `// The three out-of-town stops` |
| 003 | `src/pages/ExploreSmithsGrove.jsx` | The Roost now uses the new building photo and 42171 & Co. takes the old roost shop photo (intentional move). | `SHOPS[0]` line ~14, `SHOPS[1]` line ~26 |
| 004 | `src/pages/ExploreSmithsGrove.jsx` | Grammie’s Home Cookin’ carries no contact details at all — `address: null`, `handles: []`, no phone, no maps link, with a comment recording Wesley’s instruction. | Line 147–156 (comment at 147) |
| 005 | `src/pages/ExploreSmithsGrove.jsx` | Added the `monoRed` tile: radial gradient `#c93a10 → #CC3300 → #8f2400` with white heading text. | `StopCard`, line 275 |
| 006 | `src/pages/ExploreSmithsGrove.jsx` | Instagram handle row renders only when `stop.handles` has entries, each linking to `https://www.instagram.com/<handle>/` as `@<handle>`. | `StopCard`, lines 289–302 |
| 007 | `src/pages/ExploreSmithsGrove.jsx` | CTA button renders when `stop.cta` exists, as a `Link` to `stop.cta.to` (Flavor Isle → `/menu`, "Order online"). | `StopCard`, lines 314–321 |
| 008 | `src/pages/ExploreSmithsGrove.jsx` | Address link stays conditional on `stop.address` being non-null. | `StopCard`, line 304 `{stop.address && (` |
| 009 | `src/pages/ExploreSmithsGrove.jsx` | Section heading is now "🛍️ Shops & Stops We Love" with the approved subhead ("Park once and stroll…"). | Line 439–441 |
| 010 | `src/pages/ExploreSmithsGrove.jsx` | Added `SURROUNDING` (3 entries: National Corvette Museum, Buc-ee’s with `id: 'bucees'`, Mammoth Cave National Park) with the approved copy, maps, internal links, and distances. | Line 180–204 |
| 011 | `src/pages/ExploreSmithsGrove.jsx` | Added `SurroundCard`: `<article>` takes `id={stop.id}` when present and `scroll-mt-24` so the sticky navbar never covers a deep-linked card. | Line 327–331 |
| 012 | `src/pages/ExploreSmithsGrove.jsx` | New "🧭 The Surrounding Area" section with the approved subhead, rendered between the shops and Local Flavor sections. | Line 452–466 |
| 013 | `src/pages/ExploreSmithsGrove.jsx` | Mount-time deep-link effect: strips `window.location.hash`, returns early when empty, retries up to 40× at 50 ms for `getElementById(hash)` and scrolls to its top minus 88 px (works for `#bucees` and `#map`). | Line 371–392 (`useEffect` inside `ExploreSmithsGrove`) |
| 014 | `src/components/reviews/HometownMap.jsx` | Section renamed to the Traveler Log: `id="traveler-log"`, `scroll-mt-24`, eyebrow "Traveler Log", new body line "Visited Flavor Isle? Pin your hometown on the Traveler Log…". | Line 36 (section), 38 (eyebrow), 40 (body) |
| 015 | `src/components/reviews/HometownMap.jsx` | Mount-time effect scrolls `#traveler-log` into view after 150 ms when the hash matches, timer cleaned up on unmount. | Lines 26–33 |
| 016 | `src/pages/I65Exit38.jsx` | Mammoth Cave distance corrected to `'~30 min north on I-65'`. | Line 33 |
| 017 | `src/pages/I65Exit38.jsx` | Centered "Explore every stop in Smiths Grove" `btn-mint` button with `ArrowRight` under the Nearby Attractions grid (`ArrowRight` was already imported). | Line 205–209 |
| 018 | `src/pages/I65Exit38.jsx` | Bottom link row: "Explore Smiths Grove" added first, followed by a `·` separator. | Line 266–267 |
| 019 | `src/pages/MammothCaveDining.jsx` | Bottom link row: "Explore Smiths Grove" added immediately after the "I-65 Exit 38 Guide" link, with its `·` separator. | Line 126–127 |
| 020 | `src/pages/CorvetteCarClubs.jsx` | Bottom link row: "Explore Smiths Grove" added immediately after the "I-65 Exit 38 Guide" link, with its `·` separator. | Line 147–148 |
| 021 | `src/components/NearbyAreas.jsx` | Imported `Link` from `react-router-dom`. | Line 2 |
| 022 | `src/components/NearbyAreas.jsx` | `ATTRACTIONS` entries gained `to`: Mammoth Cave → `/mammoth-cave-dining`, Corvette Museum → `/corvette-car-clubs`, Buc-ee’s → `/explore-smiths-grove#bucees`. | Lines 18–22 |
| 023 | `src/components/NearbyAreas.jsx` | Each "Passing Through" tile is now a `<Link>` with the same visual box plus `hover:bg-white/10 hover:border-smashie-yellow/40 transition-colors` and the name turning `smashie-yellow` on hover. Everything else on /contact unchanged. | Lines 61–73 |

## Verification notes

- `npm run build` → exit 0, no errors.
- The two uploads are referenced only from `SHOPS`; the 42171 photo no longer appears on The Roost card.
- No hours, menu, pricing, ordering, checkout, POS, Pulse, phone/Smashie, or email template files were modified, and nothing was published.