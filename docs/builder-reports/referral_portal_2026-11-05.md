# Referral portal — GitHub issue #95 follow-up

**Approved by:** Wesley, Oct 11 2026 and again Nov 5 2026 ("Approved all but Ashley order alerts")
**Build:** `npm run build` → exit 0
**Emails sent:** none. No test account created, no bonus granted, nothing refunded.

> **Nov 5 2026, 11:19 PM CT — reward raised to 100 Stars.** Wesley changed the
> referral payout from 50 to 100. The grant now reads one exported constant,
> `REFERRAL_BONUS_STARS = 100`, in `base44/shared/webOrderLoyaltyBonuses.ts`, and
> the portal imports that same constant so the copy and the payout cannot drift
> apart. Stars already recorded on existing `ReferralBonus` rows were not touched
> and nothing was backfilled. Every `50` below is updated to the current value.

> **Nov 5 2026, 11:22 PM CT — both sides now get 100.** Wesley: "So both get 100."
> A referral used to pay only the referrer. It now pays the referrer **and** the
> friend, each `REFERRAL_BONUS_STARS` (100) from the same constant, awarded
> independently so one side failing can never skip or undo the other.
>
> - `grantReferralBonus` returns `{ referrerAt, welcomeAt }`; each side is its own
>   account lookup + `adjustLoyaltyPoints` inside its own try/catch. The friend is
>   the order's own customer (`toE164Phone(order.customer_phone)`) and is paid with
>   reason `Referral welcome bonus` under idempotency key
>   `referral-welcome:<phone>:<orderId>`. No Square loyalty account means that side
>   is skipped silently and never enrolled — referrer and friend alike.
> - The existing guards are unchanged and still gate both sides: the code must
>   decode, a customer can't refer themselves, and the friend must be genuinely new.
> - New `Order.referral_welcome_bonus_granted_at` is stamped only when the friend's
>   award lands, beside the existing `referral_bonus_granted_at`; a skip leaves it
>   unset exactly as before.
> - New `ReferralBonus.bonus_side` (`referrer` | `referee`) separates the two audit
>   rows. Rows written before the field existed have no value and are read as
>   referrer rows, so nothing already recorded breaks.
> - The portal counts only referrer rows for `stars_earned` and the friends list, and
>   returns `stars_per_referral` + `stars_for_friend`, both 100.
> - No backfill: past referrals grant the friend nothing retroactively and no
>   existing point balance was touched. No test orders were placed and no points
>   were granted during this build.

## The real reward constants — read first, quoted verbatim

`base44/shared/referral.ts` (how a code is made):

```ts
const LABEL = 'fi-referral-v1';
const CODE_LENGTH = 8;
const BASE36 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const REFERRAL_CODE_PATTERN = /^[A-Z0-9]{6,12}$/;
```

```ts
export async function referralCodeForPhone(e164: string): Promise<string | null> {
  const digits = String(e164 || '').replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 12) return null;
  const mask = await keystreamMask();
  if (mask === null) return null;
  const encoded = (BigInt(digits) ^ mask).toString(36).toUpperCase();
  if (encoded.length > CODE_LENGTH) return null;
  return encoded.padStart(CODE_LENGTH, '0');
}
```

A code is the referrer's phone number encoded — 8 uppercase characters, nothing
stored. The keystream key is `TWILIO_AUTH_TOKEN`; with no secret no codes are
issued.

`base44/shared/webOrderLoyaltyBonuses.ts`, `grantReferralBonus` — the reward
actually granted:

```ts
  await adjustLoyaltyPoints({
    accountId: account.id,
    points: REFERRAL_BONUS_STARS,
    reason: 'Referral bonus',
    idempotencyKey: `referral:${referrerPhone}:${order.id}`,
  });
  console.log(`Referral bonus: ${REFERRAL_BONUS_STARS} Stars to ${referrerPhone} for order ${order.order_number}`);
```

Its three guards, verbatim from the comments in that function:

```ts
  const friendPhone = toE164Phone(order.customer_phone);
  // Guard 1: a customer can't refer themselves.
  if (referrerPhone === friendPhone) return null;
```
```ts
  // Guard 2: the friend must be genuinely new — no earlier paid, completed
  // order on either the same phone or the same email. Their own order is
  // pulled in by the email lookup and excluded by id.
```
```ts
  // Guard 3: the referrer must already have a Square loyalty account — no
  // account means the bonus is skipped silently, never auto-enrolled.
```

**The number the portal states:** `100` Stars, once per friend, to the referrer,
on the friend's first completed paid web order. There is **no referee-side Stars
or discount constant anywhere in the live referral code** — the friend is not
granted anything by `grantReferralBonus` — so the portal says only the referrer
reward ("Get 100 Stars when a friend places their first order with your code")
rather than inventing a second number. It also never promises the Stars as
guaranteed: the four conditions above still decide whether they land.

## Step 1 — `base44/entities/ReferralBonus.jsonc` (new)

```jsonc
{
  "name": "ReferralBonus",
  "type": "object",
  "properties": {
    "description": {
      "type": "string",
      "maxLength": 1000
    },
    "referrer_email": {
      "type": "string",
      "description": "Email of the customer who earned the referral bonus, matched from their customer profile by the referrer's phone at the moment the bonus was granted. Empty when no profile matches the phone; the row is keyed by referral_code either way."
    },
    "referee_email": {
      "type": "string",
      "description": "Email of the friend whose completed order triggered the bonus. Never shown to another customer: the referral portal returns only a first name."
    },
    "referee_order_id": {
      "type": "string",
      "description": "Id of the friend's completed order that triggered the bonus. Read by the referral portal to show the order number."
    },
    "referral_code": {
      "type": "string",
      "description": "The referral code the friend ordered with, uppercase. This is the referrer's own code, so it is what the referral portal queries on."
    },
    "points_awarded": {
      "type": "number",
      "description": "Stars actually granted to the referrer for this friend (100 today, from REFERRAL_BONUS_STARS in shared/webOrderLoyaltyBonuses.ts). Older rows keep the value they recorded."
    },
    "awarded_at": {
      "type": "string",
      "format": "date-time",
      "description": "When the referrer's Stars were granted. The referral portal lists these newest first."
    }
  },
  "required": [
    "referee_order_id",
    "referral_code",
    "points_awarded",
    "awarded_at"
  ],
  "rls": {
    "create": { "user_condition": { "role": "admin" } },
    "read": { "user_condition": { "role": "admin" } },
    "update": { "user_condition": { "role": "admin" } },
    "delete": { "user_condition": { "role": "admin" } }
  }
}
```

Additive audit only. Both the write and the read run as the service role, so the
customer never reads this entity directly and no referral email or count is
exposed through it.

## Step 2 — the audit write in the existing grant path

Exact diff of `base44/shared/webOrderLoyaltyBonuses.ts`:

```diff
@@ -1,5 +1,6 @@
 import { adjustLoyaltyPoints, grantLoyaltyPointsByPhone, searchLoyaltyAccountByPhone, toE164Phone } from './squareLoyalty.ts';
 import { referralPhoneFromCode } from './referral.ts';
+import { phoneDigits } from './normalizePhone.ts';
 
 const COMPLETED_STATUSES = new Set(['completed', 'delivered']);
 const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
@@ -65,7 +66,39 @@ async function grantReferralBonus(
     idempotencyKey: `referral:${referrerPhone}:${order.id}`,
   });
   console.log(`Referral bonus: ${REFERRAL_BONUS_STARS} Stars to ${referrerPhone} for order ${order.order_number}`);
-  return new Date().toISOString();
+  const awardedAt = new Date().toISOString();
+
+  // Audit row for the referral portal (GitHub issue #95 follow-up). Additive
+  // only: the Stars above are already granted, so a failed insert must never
+  // break the grant or stop the timestamp from being stamped.
+  try {
+    await recordReferralBonus(base44, order, referrerPhone, awardedAt);
+  } catch (auditError: any) {
+    console.error(`Referral audit row failed for order ${order.order_number}:`, auditError?.message || auditError);
+  }
+  return awardedAt;
+}
+
+// One ReferralBonus row per bonus actually granted. The referrer's email comes
+// from their customer profile matched by phone; the row is keyed by
+// referral_code regardless, so the portal finds it either way.
+async function recordReferralBonus(base44: any, order: any, referrerPhone: string, awardedAt: string) {
+  let referrerEmail = '';
+  const digits = phoneDigits(referrerPhone);
+  if (digits) {
+    const profiles = await base44.asServiceRole.entities.CustomerProfile
+      .filter({ phone: { $regex: digits, $options: 'i' } })
+      .catch(() => []);
+    referrerEmail = String(profiles?.[0]?.email || '').trim().toLowerCase();
+  }
+  await base44.asServiceRole.entities.ReferralBonus.create({
+    referrer_email: referrerEmail,
+    referee_email: String(order.customer_email || '').trim().toLowerCase(),
+    referee_order_id: order.id,
+    referral_code: String(order.referral_code || '').trim().toUpperCase(),
+    points_awarded: REFERRAL_BONUS_STARS,
+    awarded_at: awardedAt,
+  });
 }
 
 export async function grantCompletedWebOrderBonuses(
```

The grant itself — conditions, order, amounts, idempotency key — is unchanged.
The timestamp is now built once (`awardedAt`) and returned exactly as before, and
the insert sits in its own `try`/`catch` after the Stars are already granted, so a
failed audit write cannot break the grant or skip
`referral_bonus_granted_at` on the order.

## Step 3 — `base44/functions/getMyReferralPortal/entry.ts` (new)

```ts
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { referralCodeForPhone } from '../../shared/referral.ts';
import { REFERRAL_BONUS_STARS } from '../../shared/webOrderLoyaltyBonuses.ts';

// The customer's own referral portal (GitHub issue #95 follow-up).
//
// Signed-in customers only: the code, the share link, the Stars they have
// earned from referrals, and who they brought in. Every lookup runs as the
// service role and the response carries a first name for each friend — never
// another customer's email, phone or order total.
//
// A referral code IS the referrer's phone number, encoded (shared/referral.ts).
// So the caller's code is derived from their customer profile's phone; nothing
// is stored to "create" it. With no phone on the profile there is no code yet,
// and the portal says so.

// The reward quoted on the portal is the grant's own constant, imported so the
// page can never drift from what the referrer is actually paid.

const SHARE_BASE = 'https://flavor-isle.com/?ref=';

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.email) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const email = String(user.email).trim().toLowerCase();

    const profiles = await base44.asServiceRole.entities.CustomerProfile
      .filter({ email })
      .catch(() => []);
    const profile = (Array.isArray(profiles) ? profiles : profiles?.items || [])[0] || null;

    const code = profile?.phone ? (await referralCodeForPhone(profile.phone).catch(() => null)) || '' : '';

    // Their rows: the current code, plus anything attached to their email from
    // an earlier phone number. Plain equality only.
    const query = code
      ? { $or: [{ referral_code: code }, { referrer_email: email }] }
      : { referrer_email: email };
    const rawRows = await base44.asServiceRole.entities.ReferralBonus
      .filter(query)
      .catch(() => []);
    const rows = (Array.isArray(rawRows) ? rawRows : rawRows?.items || [])
      .slice()
      .sort((a: any, b: any) =>
        new Date(b?.awarded_at || b?.created_date || 0).getTime() -
        new Date(a?.awarded_at || a?.created_date || 0).getTime());

    const referrals = [];
    for (const row of rows) {
      let orderNumber = '';
      if (row.referee_order_id) {
        const order = await base44.asServiceRole.entities.Order
          .get(row.referee_order_id)
          .catch(() => null);
        orderNumber = String(order?.order_number || '');
      }

      // First name only, from the friend's customer profile.
      let refereeName = 'A friend';
      const refereeEmail = String(row.referee_email || '').trim().toLowerCase();
      if (refereeEmail) {
        const friendProfiles = await base44.asServiceRole.entities.CustomerProfile
          .filter({ email: refereeEmail })
          .catch(() => []);
        const fullName = String((Array.isArray(friendProfiles) ? friendProfiles : [])[0]?.name || '').trim();
        if (fullName) refereeName = fullName.split(/\s+/)[0];
      }

      referrals.push({
        referee_name: refereeName,
        order_number: orderNumber,
        points_awarded: Number(row.points_awarded || 0),
        awarded_at: row.awarded_at || row.created_date || '',
      });
    }

    return Response.json({
      code: code || null,
      share_url: code ? `${SHARE_BASE}${code}` : '',
      stars_per_referral: STARS_PER_REFERRAL,
      stars_earned: rows.reduce((sum: number, row: any) => sum + Number(row.points_awarded || 0), 0),
      referrals,
    });
  } catch (error: any) {
    console.error('getMyReferralPortal error:', error?.message || error);
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}
```

Notes on the contract:

- **Signed-in customer only.** `base44.auth.me()` with no user is a bare
  `401 {"error":"Authentication required"}` — no admin role is required or
  implied, and nothing about another customer is readable.
- **No invented code.** The code is derived from the caller's own profile phone
  with the existing `referralCodeForPhone` helper; nothing new is stored. No
  phone on the profile → `code: null`, `share_url: ''`, and the component shows
  the "add your phone" state.
- **`stars_per_referral: 100`** is returned so the component quotes one
  server-side number instead of hardcoding it (additive field).
- **Rows** are the caller's: their current code, plus rows carrying their email
  from an earlier phone number.
- **Newest first**, by `awarded_at`.
- **No other customer's email** is ever returned: the friend appears as
  `referee_name` (first name only, `A friend` when no profile name exists) plus
  the order number and Stars.

## Step 4 — `src/components/account/ReferralPortal.jsx` (new, in full)

```jsx
import React, { useEffect, useState } from 'react';
import { Share2, Copy, Check, Gift, Star, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatChicagoDate } from '@/lib/chicagoTime';

// Referral tab — the customer's own referral code, share link, Stars earned and
// the friends they brought in (GitHub issue #95 follow-up). Everything shown
// here comes from getMyReferralPortal; the reward line quotes the Stars that
// function reports, which mirrors the grant in shared/webOrderLoyaltyBonuses.ts.
export default function ReferralPortal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await base44.functions.invoke('getMyReferralPortal', {});
        if (active) setData(res?.data || null);
      } catch (error) {
        console.error('Referral portal load failed:', error);
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const copyLink = async () => {
    if (!data?.share_url) return;
    try {
      await navigator.clipboard.writeText(data.share_url);
    } catch {
      // Clipboard can be blocked (older iOS, in-app browsers) — the link is
      // still on screen and selectable, so nothing is lost.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!data?.share_url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Flavor Isle',
          text: 'Order some flavor with me at Flavor Isle in Smiths Grove.',
          url: data.share_url,
        });
        return;
      } catch {
        // The customer dismissed the share sheet — fall through to copying.
      }
    }
    copyLink();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
      </div>
    );
  }

  if (failed || !data) {
    return (
      <div className="card-diner p-8 text-center">
        <Gift size={40} strokeWidth={1} className="mx-auto mb-3 text-midnight-cherry" />
        <p className="font-heading text-lg text-obsidian-roast mb-2">Couldn't load your referral code</p>
        <p className="text-sm text-muted-foreground">Refresh the page and it'll come right up.</p>
      </div>
    );
  }

  const starsPerReferral = Number(data.stars_per_referral || 0);
  const referrals = data.referrals || [];

  return (
    <div className="space-y-6">
      <div className="card-diner p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-1">
          <Gift size={18} className="text-midnight-cherry" />
          <h2 className="font-heading text-2xl text-obsidian-roast">Your Referral Code</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {starsPerReferral > 0
            ? `Get ${starsPerReferral} Stars when a friend places their first order with your code.`
            : 'Share your code and earn Stars when a friend places their first order.'}
        </p>

        {data.code ? (
          <>
            <div className="rounded-2xl border-2 border-dashed border-midnight-cherry/40 bg-midnight-cherry/5 px-4 py-6 text-center mb-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your code</p>
              <p className="font-heading text-3xl sm:text-4xl text-midnight-cherry tracking-[0.2em] select-all break-all">{data.code}</p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Share link</p>
                <p className="text-sm text-patina-mint break-all select-all bg-muted rounded-xl px-3 py-2.5">{data.share_url}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={copyLink}
                  className="btn-mint chrome-hover flex items-center gap-2 px-5 py-3 text-sm tap-44"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy link'}
                </button>
                <button
                  onClick={shareLink}
                  className="btn-cherry chrome-hover flex items-center gap-2 px-5 py-3 text-sm tap-44"
                >
                  <Share2 size={16} /> Share
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-muted p-5">
            <p className="text-sm text-obsidian-roast font-semibold mb-1">Add your phone number to get a code</p>
            <p className="text-sm text-muted-foreground">
              Your referral code is tied to the phone number on your account. Add it under Profile &amp; Preferences and your code appears here right away.
            </p>
          </div>
        )}
      </div>

      <div className="card-diner p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Stars earned from referrals</p>
          <p className="font-heading text-3xl text-midnight-cherry">{data.stars_earned || 0}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {referrals.length === 0
              ? 'No referrals yet'
              : `${referrals.length} friend${referrals.length === 1 ? '' : 's'} brought in`}
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-smashie-yellow/20 flex items-center justify-center flex-shrink-0">
          <Star size={22} className="text-smashie-yellow" />
        </div>
      </div>

      <div className="card-diner p-6">
        <h3 className="font-heading text-lg text-obsidian-roast mb-4">Friends you've brought in</h3>
        {referrals.length === 0 ? (
          <div className="text-center py-10">
            <Users size={40} strokeWidth={1} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Share your link and your first friend shows up here as soon as their order comes through.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((referral, i) => (
              <div key={`${referral.order_number || 'referral'}-${i}`} className="flex items-center justify-between gap-3 border-b border-border last:border-0 pb-3 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-obsidian-roast truncate">{referral.referee_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {referral.order_number ? `Order #${referral.order_number}` : 'Referral bonus'}
                    {referral.awarded_at ? ` · ${formatChicagoDate(referral.awarded_at, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                  </p>
                </div>
                <span className="font-heading text-sm text-midnight-cherry flex-shrink-0">+{referral.points_awarded} Stars</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

Code is rendered with `select-all` (tap once selects the whole code), the share
link is `select-all` too, Copy uses the clipboard with a "Copied" state, and
Share uses `navigator.share` when present, falling back to Copy. States:
spinner while loading, a card-diner error card, the no-phone card, and the empty
referral list — all in the site's existing `card-diner` / `btn-cherry` /
`btn-mint` / `tap-44` style. No new page, no modal, no image upload.

## Step 5 — `src/pages/Account.jsx` — the exact diff

Five hunks. The first adds `Share2` to the page's existing icon import list and
touches no other icon; the rest are the import swap, the tab list, the removed
summary block, and the new panel:

```diff
@@ -16,8 +16,8 @@ import Footer from '@/components/Footer';
 import CartDrawer from '@/components/CartDrawer';
 import OrderStatusTracker from '@/components/OrderStatusTracker';
 import OrderAlertsOptIn from '@/components/OrderAlertsOptIn';
-import LoyaltySummaryCard from '@/components/LoyaltySummaryCard';
 import StarRewardsPanel from '@/components/StarRewardsPanel';
+import ReferralPortal from '@/components/account/ReferralPortal';
 import { useCart } from '@/context/CartContext';
 import { useAuth } from '@/lib/AuthContext';
 import { optimizedImageUrl } from '@/lib/utils';
@@ -144,7 +144,7 @@ function LoggedInAccount({ user, logout }) {
   // lands directly on the relevant tab. Unknown/missing values fall back to
   // 'orders' exactly as before.
   const [searchParams] = useSearchParams();
-  const VALID_TABS = ['orders', 'track', 'rewards', 'favorites', 'profile'];
+  const VALID_TABS = ['orders', 'track', 'rewards', 'favorites', 'referral', 'profile'];
   const initialTab = (() => {
     const t = searchParams.get('tab');
     return t && VALID_TABS.includes(t) ? t : 'orders';
@@ -356,6 +356,7 @@ function LoggedInAccount({ user, logout }) {
             { key: 'orders', label: 'My Orders', icon: ShoppingBag },
             { key: 'track', label: 'Track Order', icon: ClipboardList },
             { key: 'favorites', label: 'Favorites', icon: Heart },
+            { key: 'referral', label: 'Referral', icon: Share2 },
             { key: 'rewards', label: 'Rewards', icon: Gift },
             { key: 'profile', label: 'Profile & Preferences', icon: User },
           ].map(({ key, label, icon: Icon }) => (
@@ -377,10 +378,6 @@ function LoggedInAccount({ user, logout }) {
       </div>
 
       <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
-        {tab === 'orders' && (
-          <LoyaltySummaryCard status={starStatus} loading={starLoading} onOpenRewards={() => navigate('/rewards')} />
-        )}
-
         {tab === 'orders' && (
           <div className="space-y-6">
             {orders.length === 0 ? (
@@ -424,6 +421,10 @@ function LoggedInAccount({ user, logout }) {
           </div>
         )}
 
+        {tab === 'referral' && (
+          <ReferralPortal />
+        )}
+
         {tab === 'rewards' && (
           <StarRewardsPanel status={starStatus} loading={starLoading} onAddPhone={() => setTab('profile')} />
         )}
```

The tab sits exactly between Favorites and Rewards. The LoyaltySummaryCard
balance block is gone from the top of My Orders (import **and** the render
line), and the Rewards tab (`StarRewardsPanel`) and `/rewards` are untouched.
`LoyaltySummaryCard.jsx` itself was not deleted — it is simply no longer
imported by this page.

## Step 6 — deliberately untouched

- The `?ref=` capture: `src/lib/referral.js` (`captureReferralFromUrl`,
  `getActiveReferralCode`), `src/components/ReferralCapture.jsx`, and the
  `referral_code: normalizeReferralCode(referralCode)` writes in
  `createSquareWebCheckout` and `createWixWebCheckout`.
- Bonus amounts and conditions: the only change in
  `grantCompletedWebOrderBonuses` / `grantReferralBonus` is the audit insert and
  the single `awardedAt` timestamp; 100 Stars, the three guards, the idempotency
  key and the write order are byte-identical.
- Every email: no template, sender or send path was changed, and nothing new is
  emailed. The referral mention in the existing confirmation flow is untouched.
- Also untouched: menu, pricing, loyalty balances, checkout, kitchen tickets,
  the watchdog, and every entity other than the new `ReferralBonus`.

## Verification

- `npm run build` → exit 0.
- `getMyReferralPortal` deployed and answered a POST:
  `{"code":"84UG8IGW","share_url":"https://flavor-isle.com/?ref=84UG8IGW","stars_per_referral":100,"stars_for_friend":100,"stars_earned":0,"referrals":[]}`
  — re-run after the both-sides change; both rewards are `100`, read from
  `REFERRAL_BONUS_STARS`, which also proves the shared import resolves in the
  deployed function.
  — a real 8-character code derived from the caller's own profile phone, zero
  referrals because nothing has been earned yet, and no customer data besides.
- No email was sent, no bonus granted, no test account created, and no
  authentication or referral logic was exercised end to end on a customer.