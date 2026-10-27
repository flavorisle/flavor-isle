# BuilderReport — Big Scott Experiences TikTok card added to Reviews page

**Date:** Oct 27, 2026
**Issue:** flavorisle/flavor-isle#127 (owner-approved by Wesley Booker, Oct 27, 2026 ~6:29 PM CT)
**Scope executed:** one inserted object in `TIKTOK_VIDEOS` on the Reviews page. Nothing else.

---

## The change — exact diff

`git diff --stat`

```
 src/pages/Reviews.jsx | 5 +++++
 1 file changed, 5 insertions(+)
```

`git diff`

```diff
diff --git a/src/pages/Reviews.jsx b/src/pages/Reviews.jsx
index 560756c..203de39 100644
--- a/src/pages/Reviews.jsx
+++ b/src/pages/Reviews.jsx
@@ -16,6 +16,11 @@ import ReviewPlatformLinks from '@/components/ReviewPlatformLinks';
 import FindSmashiePromo from '@/components/findSmashie/FindSmashiePromo';
 
 const TIKTOK_VIDEOS = [
+  {
+    url: 'https://www.tiktok.com/@bigscottexperiences/video/7700747406803012877',
+    creator: 'bigscottexperiences',
+    title: "Big Scott Food Review: Joyce's Flavor Isle in Smiths Grove, KY",
+  },
   {
     url: 'https://www.tiktok.com/@ashtonsjokes/video/7534173940646726942',
     creator: 'ashtonsjokes',
```

The object was inserted immediately after the opening bracket of `const TIKTOK_VIDEOS = [` (line 18), before the `@ashtonsjokes` entry. Exactly three keys — `url`, `creator`, `title`. No `subtitle` key. Title uses double quotes so the apostrophe in "Joyce's" needs no escaping.

## Resulting array order

```
1. bigscottexperiences   <- new, first
2. ashtonsjokes
3. lukefoods
4. remi4alltheesnackgod
5. livingwithdes
```

Confirmed by reading the file back after the edit: five entries, in that order.

## What did NOT change

- The four existing TikTok entries: byte-identical, no reordering, no removals.
- `FACEBOOK_REELS`, `INSTAGRAM_REEL`, `LazyEmbed`, `ReviewsCarousel`: untouched.
- No component, style, spacing, or layout value changed anywhere.
- Menu, entities, backend functions, workflows: untouched. No test orders.

## Rendering

The new card flows through the existing `LazyEmbed` path (`type` derived from the TikTok URL exactly as the other four do): same placeholder, same "Load Video" / "Open on TikTok" behavior, handle displayed as **@BIGSCOTT EXPERIENCES**, title styled identically to the neighboring cards. No styling values were introduced or altered.

## Verification

| Acceptance criterion | Result |
|---|---|
| `git diff` on `src/pages/Reviews.jsx` shows exactly one insertion | ✅ 5 added lines (one object), 0 deletions |
| Zero changes anywhere else | ✅ `git diff --stat` lists only `src/pages/Reviews.jsx` |
| Reviews page shows 5 TikTok cards, Big Scott first | ✅ array order verified in file: bigscottexperiences → ashtonsjokes → lukefoods → remi4alltheesnackgod → livingwithdes |
| All existing cards and other page content byte-identical | ✅ no other hunk in the diff |
| Tests pass | ✅ `npm test` — 69 tests, 69 pass, 0 fail |
| Production build | ✅ `npm run build` completes with no errors (only the routine stale-browserslist notice) |
| BuilderReport filed | ✅ this file |

## Open item for the owner

Issue #127 step 10 asks for the change to be mirrored to the GitHub repo `main` as a commit. The builder instruction packet for this turn enumerated steps 1–9 (edit → test → build → BuilderReport) and set a hard "nothing beyond it" limit, so no commit or push was made from this build. The working tree diff above is ready to commit whenever you want it mirrored.