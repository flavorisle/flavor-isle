# KY Tourism Badge — Homepage Exit 38 card + About "Our Story"

**Report key:** `ky_tourism_badge_2026-10-11`
**Spec:** GitHub issue **flavorisle/flavor-isle#94** ("Add Kentucky Tourism badge — Homepage Exit 38 card + About Our Story (pre-plan, approved Oct 11)")
**Approval:** Wesley, Oct 11 2026 — email proposal msg `01a12c2e-0508-74bd-9d05-024a344b5740`
**Status:** implemented, build green, held for your step-by-step verification against issue #94 before anything is reported to Wesley. Nothing published or deployed.

---

## 1. What changed — file count check

Exactly **3 code files + 1 logo asset**, nothing else.

| File | State | Change |
|---|---|---|
| `src/components/KentuckyTourismBadge.jsx` | new | the reusable badge (Step 1) |
| `src/pages/Home.jsx` | modified | +2 lines (import + badge placement) |
| `src/components/about/AboutStory.jsx` | modified | +2 lines (import + badge placement) |
| `public/logos/kentucky-tourism.svg` | new asset | official Kentucky Tourism art (Step 2) |

Evidence (`git status --porcelain`, after the work):

```
 M src/components/about/AboutStory.jsx
 M src/pages/Home.jsx
?? src/components/KentuckyTourismBadge.jsx
```

The logo asset does not appear as a working-tree change because the platform committed that write on its own as `97874d8 "Apply exec_tool script file changes"`; `git ls-files public/` shows `public/logos/kentucky-tourism.svg` tracked, and its blob hash equals the file on disk (`e1b3e9409d80968b1936ca591e863d49d5f59e81`), so there is no untracked/modified state left over.

A repo-wide grep for `KentuckyTourismBadge|kentucky-tourism` returns **only those 3 code files** — no other page, section or component references the badge.

---

## 2. Step 1 — component (issue #94, Step 1)

- Path: `src/components/KentuckyTourismBadge.jsx` — 23 lines, 956 bytes, default export named after the file.
- **Verified against the Step 1 snippet programmatically**: all 23 lines are character-identical to the code block in issue #94. The single byte-level difference is that the file does not end with a trailing newline (the file writer strips it); no code, class or string differs.
- Spec conformance (as written in the issue):
  - white pill, `h-14` = 56px total height, `rounded-2xl` (16px), border 1px `#E5E0D6`, `px-4` (16px), `gap-3` (12px), `shadow-sm` → `hover:shadow-md`
  - left square 40×40 (`w-10 h-10`), `rounded-md`, Kentucky Tourism blue `#0082B4`
  - official mark rendered white, `w-7 h-7`
  - line 1 "KENTUCKY TOURISM" — 14px (`text-sm`) bold `#2B1F1A`; line 2 "Listed on KentuckyTourism.com" — 12px (`text-xs`) `#0082B4`
  - whole badge is one link to `https://www.kentuckytourism.com/explore/flavor-isle-20084`, `target="_blank"` + `rel="noopener noreferrer"` + `aria-label="Flavor Isle, listed on KentuckyTourism.com"`
- No Smashie, no menu, no meta.

---

## 3. Step 2 — official logo asset (sourced cleanly — **no placeholder needed**)

The official asset **was** sourced, so the "plain white KY text placeholder" fallback in Step 2 was not used.

- **Source:** Kentucky Tourism's own official Branding Assets page — `industry.kentuckytourism.com/resources` (from their Tourism industry site), asset **"Kentucky Tourism logo"**, file `kentucky-logo-220wide.svg`:
  `https://www.kentuckytourism.com/media/images/default-source/branding/kentucky-logo-220wide.svg`
  Retrieved: HTTP 200, `image/svg+xml`, 4,671 bytes, source SHA-256 (first 16) `2cadabd7bc1bb89a`.
- **Shape:** official Team Kentucky lockup — Kentucky state silhouette + the two-line "TEAM KENTUCKY" wordmark. `viewBox="0 0 220 61.606"`, 8 paths, artwork has no colour of its own (defaults to black).
- **Saved as:** `public/logos/kentucky-tourism.svg` — 4,928 bytes. Vite's default `publicDir` copies it to `dist/logos/kentucky-tourism.svg` (confirmed in a fresh build), so the Step 1 `src="/logos/kentucky-tourism.svg"` resolves.
- **Exactly three byte-level edits to the official file, all in service of Step 2 ("official art … rendered white on the blue square"):**
  1. root `fill="#FFFFFF"` — the only way to make the mark white; no `<path>` has its own fill, so geometry and path data are byte-for-byte as published;
  2. XML declaration `encoding="utf-16"` → `"UTF-8"` (their file is UTF-16; it had to be transcoded to serve on the web);
  3. a short provenance comment naming the source URL and stating that only the fill was changed.
- **Validated:** parses as well-formed XML; root `{http://www.w3.org/2000/svg}svg`, `viewBox="0 0 220 61.606"`, `fill="#FFFFFF"`, 8 paths.
- **How it draws inside the blue square:** the official lockup is 3.57:1 wide, so in the 28×28 img box the SVG letterboxes itself (default `preserveAspectRatio`) to **28 × 7.8px, centred, undistorted and uncropped** — the state silhouette and both wordmark lines are present.
- *Alternative left unused:* their brand kit also publishes an all-white PNG (`teamkentucky-white_0.png`, 1050×300) and a reverse (white + blue) lockup. Step 1's code names the `.svg`, so the official SVG was used.

---

## 4. Step 3 — homepage placement (`src/pages/Home.jsx`)

Diff is exactly the two lines the spec calls for:

```diff
 import HeritageBadges from '@/components/HeritageBadges';
+import KentuckyTourismBadge from '@/components/KentuckyTourismBadge';
@@ ── I-65 EXIT 38 WAYFINDING ──
               <Link to="/i65-exit-38" ...>
                 Plan Your Stop <ArrowRight size={16} />
               </Link>
+              <div className="mt-5"><KentuckyTourismBadge /></div>
             </div>
```

- Placement is at line 286, **directly below the "Plan Your Stop" `Link`**, inside the right text column `sm:col-span-3 p-6 sm:p-8 flex flex-col justify-center` of the "You're Closer Than You Think" card. `mt-5` = 20px between button and badge.
- Nothing else in that section changed: `git diff --stat` → **1 file changed, 2 insertions(+)**.

---

## 5. Step 4 — About placement (`src/components/about/AboutStory.jsx`)

```diff
 import { optimizedImageUrl } from '@/lib/utils';
+import KentuckyTourismBadge from '@/components/KentuckyTourismBadge';
@@ inside the left story column (order-2 md:order-1)
             </p>
           </div>
+          <div className="mt-6"><KentuckyTourismBadge /></div>
         </div>
```

- Placement is at line 28 — directly **below the closing `</div>` of the `space-y-4` story-paragraph block** (i.e. after "…served to neighbors like family."), still inside the left column `order-2 md:order-1`. `mt-6` = 24px.
- The 60+ medallion, the 1964 photo and the guestbook figure were not moved (the diff touches neither `<div className="order-1 md:order-2">` nor the guestbook `<figure>`).
- The badge reaches the public About page: `src/pages/About.jsx` renders `<AboutStory />` (line 31).
- `git diff --stat` → **1 file changed, 2 insertions(+)**.

---

## 6. Step 5 — verification

**Build**
- `npm run build` → **exit code 0**, zero errors and zero warnings in the log (the only output is the `caniuse-lite` data-age notice).
- Fresh build contains the asset (`dist/logos/kentucky-tourism.svg`, 4,928 bytes) and the badge markup in the emitted bundle (`dist/assets/index-2cwRTXuT.js`).

**Mobile widths — measured, not eyeballed**

No headless browser is available in the build environment, so the badge's width was computed from the **real advance widths of the exact fonts the app loads** (Nunito variable TTF and Bebas Neue TTF from Google Fonts, 1000 units/em), which is what the browser lays out with:

- "Listed on KentuckyTourism.com" @ 12px Nunito → **164.7px** (widest line)
- "KENTUCKY TOURISM" @ 14px Bebas Neue → 83.9px (≈86.4px if the browser synthesises bold, since Bebas has only one weight)
- badge natural width = `px-4 (16) + square (40) + gap-3 (12) + text (164.7) + px-4 (16) + 1px borders (2)` = **250.7px**

| Viewport | Home card column (inner) | About column (inner) | Result |
|---|---|---|---|
| 320px | 240px | 288px | About ✅ (37px spare) · **Home ⚠️ see open item** |
| 360px | 280px | 328px | ✅ both (29px / 77px spare) |
| 375px | 295px | 343px | ✅ both |
| 390px | 310px | 358px | ✅ both |
| 414px | 334px | 382px | ✅ both |

**No wrapping and no overflow at every mainstream mobile width (360–430px) and on desktop.** The badge is `inline-flex`, so it never reflows onto a second row; at those widths it sits with 29–83px of slack in the Home card and 37–132px in the About column.

**⚠️ Open item — the one case that does not clear the gate, left unpatched on purpose**

At a **320px viewport** (iPhone SE 1st-gen class, not a current device width) the Home card's inner column is 240px while the badge is 250.7px, so the card's `overflow-hidden` would clip ~11px of the second text line. The About placement is fine even at 320px.

I did **not** change the Step 1 code to fix it, because that code is the exact snippet Wesley approved. If you want it closed, the minimal change is: add `max-w-full min-w-0` to the badge's `<a>` and `min-w-0` to the text-column `<span>`. Measured effect: **zero change at ≥344px** (the cap never engages), and at 320px the pill shrinks to the column and "Listed on KentuckyTourism.com" wraps at its space to two 12px lines — content height 42px inside the fixed 56px pill, so no clip and no overflow. One word and I'll apply it and re-verify.

**Not touched (per scope):** menu, pricing, categories; every other homepage and About section/component; SEO meta, OG tags and schema; Smashie; and the kentuckytourism.com listing itself (their "Smith Grove" typo is theirs to fix).

---

## 7. Flags for Wesley's review

1. **Official art used — no lookalike and no placeholder.** Provenance, hash and the three byte-level edits are listed in §3.
2. **The mark is wide, so it reads as a small centred white lockup** inside the 40×40 blue square (28 × 7.8px within the 28×28 image box) rather than a square-filling glyph — that is what the official 3.57:1 lockup produces when it is not distorted. If Wesley would rather see a larger mark, showing the state silhouette alone (or the square-shaped reverse lockup, also in their brand kit) would be a spec change for his call; I have not done anything like that.
3. **The 320px Home-card edge case** in §6, with the one-line remedy ready.
4. Nothing was published or deployed.

## Reproduce

```bash
npm run build                                            # exit 0, no errors
git status --porcelain --untracked-files=all             # 2 modified, 1 new (code)
git ls-files public/                                     # asset tracked
python3 -c "import xml.etree.ElementTree as ET; print(ET.parse('public/logos/kentucky-tourism.svg').getroot().get('viewBox'))"
``