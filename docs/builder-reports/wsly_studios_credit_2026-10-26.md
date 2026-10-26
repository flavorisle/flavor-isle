# WSLY Studios design credit — footer link (issue #125, App 1: Flavor Isle)

Built Oct 26, 2026 against flavorisle/flavor-isle#125. One line in one file changed. Menu, checkout, kitchen tickets, customer pages, and entities untouched.

## The change

**File:** `src/components/Footer.jsx`, line 180 (the bottom bar, directly after the Privacy Policy / Terms of Service links and before the Kentucky Tourism badge).

**Before:**

```jsx
<span className="text-white/60">Designed by WSLY Studios</span>
```

**After:**

```jsx
<a href="https://wslystudios.com" target="_blank" rel="noopener noreferrer" className="text-white/60 hover:text-white transition-colors">Designed by WSLY Studios</a>
```

`git diff --stat`: `src/components/Footer.jsx | 2 +-` — 1 file changed, 1 insertion, 1 deletion. No other file in the repo changed.

## Two notes on fidelity to the issue

1. **The issue's REMOVE string was already gone.** The pre-plan names `<span className="text-white/70">Designed by Wesley Booker</span>`, but the footer no longer contains that text. An earlier build had already renamed the credit to "Designed by WSLY Studios" and set it to `text-white/60`. The only remaining work was therefore turning that span into the link; the wording and the surrounding markup were already what the issue wants.
2. **The base color stays `text-white/60`, not the `/70` written in the issue.** The issue's own constraint is "same spot, size, and color… no layout/pixel changes", and the live line is at 60% opacity. Using the issue's literal `text-white/70` would have brightened the credit slightly, i.e. a color change, so the existing `/60` was preserved and only the hover state was added. Say the word if you want it nudged to `/70`.

App 2 in the issue (Flavor Isle Pulse AI, app id 6a0079b09d458a77c24ffba5) is a separate app and is **not** part of this build.

## Behavior

- Opens https://wslystudios.com in a new tab, with `rel="noopener noreferrer"`.
- Hover/focus brightens the text to full white over the same transition timing as the adjacent Privacy Policy / Terms of Service links. No underline is added, matching the credit's original plain-text look.
- Same position in the flex row, so spacing and layout are unchanged.

## Verification

| Check | Result |
|---|---|
| Test suite (`npm test` → `node --test base44/shared/*.test.ts`) | **69 tests, 69 pass, 0 fail** |
| Production build (`npm run build` → `vite build`) | Completes with no errors (only the routine stale-browserslist notice) |
| Diff scope | Exactly 1 file, 1 line (`src/components/Footer.jsx`) |
| Other files / entities / functions | Untouched |

Known fact carried from the issue, for the record: wslystudios.com currently has no DNS registration, so the link resolves only once that domain goes live. The anchor itself is correct and needs no follow-up.