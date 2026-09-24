# 🎃 Find Smashie: Halloween Hide & Seek — Preview Branch

**This branch is a PREVIEW ONLY.** Nothing is live. Merge to `main` only after
Wesley's emailed approval (see the proposal in his inbox). When merged, the two
new backend functions (`claimSmashieFind`, `getSmashieHuntState`) and two new
entities (`FindSmashieWinner`, `FindSmashieSettings`) deploy automatically with
the app.

## What the game is

Every day October 1–31, Smashie hides somewhere on the site:

- **Pumpkin Smashie** (open → 5:00 PM): hides in the day's first spot.
- **Vampire Smashie** (5:00 PM → close): if nobody found him by 5 PM, he moves
  to a NEW spot in a new costume for the evening.
- Hard mode by design: no highlight box, no glow, no border. Just the real
  Smashie art tucked into the page at low-key size/opacity.
- Anyone can spot him, but **only signed-in players** can claim the daily win.
- **First signed-in click of the day wins** (timestamped server-side).
- Prize is the winner's choice: **100 Star Rewards points** on their account,
  or a **free milkshake** applied to an order they place right then.
- After a win, the banner switches to "Smashie was found by [name] — new hiding
  spot tomorrow at open!" and the sprite disappears for the day.
- Every game announcement mentions the daily winner reveal on Instagram
  **@flavor_isle** to drive follows.

## How to preview

1. Open this branch's preview deployment (Base44 branch build) or run locally.
2. The site-wide banner appears at the top of every page while the game is on.
3. Turn the game ON in **Admin → Communications → Settings → Find Smashie**
   (FindSmashieSettings.active). It defaults to the Oct 1–31 date range and
   business hours come from MenuSetting.business_hours, so outside those
   hours Smashie is asleep.
4. To spot him, check the admin panel's "Today's hiding spots" preview, then
   visit that page. He's small and unboxed — that's the point.
5. Click him: guests get a sign-in prompt; signed-in users get the win/claim
   flow with the prize choice.
6. `/find-smashie` is the public rules + winner board page.

## Files added/changed

| File | What |
|---|---|
| `src/lib/findSmashie.js` | Hunt config, deterministic daily spot selection, phase/hours logic |
| `src/components/findSmashie/SmashieHunt.jsx` | Hidden sprite + guest/win/prize modals |
| `src/components/findSmashie/FindSmashieBanner.jsx` | Site-wide announcement strip (game on / found / Instagram CTA) |
| `src/pages/FindSmashie.jsx` | Public rules + winner board (`/find-smashie`) |
| `src/components/admin/FindSmashiePanel.jsx` | Admin: toggle, dates, win limit, spot preview, winners log |
| `base44/entities/FindSmashieSettings.jsonc` | Game config entity (admin-write, public-read) |
| `base44/entities/FindSmashieWinner.jsonc` | Winner records (admin-write via service role, public-read) |
| `base44/functions/claimSmashieFind/entry.ts` | Server-side claim: auth, hours check, first-finder, win limit, prize choice |
| `base44/functions/getSmashieHuntState/entry.ts` | Public state for banner/sprite: active, hours, today's winner |
| `public/find-smashie/smashie-pumpkin.png` | Real Smashie in pumpkin costume (transparent PNG) |
| `public/find-smashie/smashie-vampire.png` | Real Smashie as vampire (transparent PNG) |
| `src/App.jsx` | Banner + sprite mounts, `/find-smashie` route |
| `src/pages/AdminCommunications.jsx` | Find Smashie admin panel under the Settings tab |

## Open decisions (Wesley)

- **Win limit**: implemented as admin-editable `win_limit_per_customer`
  (default 1/month, 0 = unlimited). Confirm before go-live.
- **Prize fulfillment**: winner's choice is recorded on the winner record and
  shown in the admin winners log with a "fulfilled" checkbox. Actual crediting
  (100 points to the phone-number account / free-milkshake line item at
  checkout) wires up on approval — the UI and data model are ready for it.
- The daily winner post to Instagram is a manual/admin action for now
  (compose from the winners log); automation can be added later if wanted.
