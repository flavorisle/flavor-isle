# Newsletter archive — /newsletters and /newsletters/:slug

> **SUPERSEDED, Nov 6 2026.** This shape was not approved. Wesley's approved wording is that the Winter
> Bliss issue goes into the newsletter page as the newest entry with the November 2 issue kept underneath
> it, and that there is no separate archive page. The three files below were deleted and both routes
> removed; the newsletter page now carries the archive. The correction is recorded as
> `newsletter_archive_2026-11-06` item "Corrected: archive lives on the newsletter page…" in BuilderReport.
> Kept as a record of what was built and undone.

**Approved by:** Wesley, Nov 5 2026 — the "community news post + Facebook and Instagram at 10 AM + newsletter archive" batch ("Approved all but Ashley order alerts"). This build is the archive, the last code piece of that item.
**Build:** `npm run build` → **exit 0**
**Sent:** no email. No newsletter was sent, resent, edited, re-broadcast or scheduled, and no news post was created, edited or published.
**Touched:** 4 files edited, 4 files added. `NewsPost`, `NewsletterSend`, `EmailSubscriber`, the signup flow, the double-opt-in logic, `subscribeEmail`, `sendNewsletterBroadcast` and every email template are untouched.

## What the archive is (and is not)

There is no stored newsletter HTML anywhere in this app — `NewsletterSend` only holds per-recipient send rows (broadcast id, body hash, status). So the archive is driven by the issues that exist **in code**: `src/data/newsletterIssues.js` lists them, and each entry names the rendered issue component. One entry exists today, the November 2, 2026 issue that `/newsletter` already shows. No issue was invented and no other slug was added.

## One deviation from the brief, and why

The brief's literal entry said `date: '2026-11-01'`, with the instruction "use … the real send date". The issue's own dateline — printed inside the issue itself — is **November 2, 2026** ("Isle News · November 2, 2026"), and the saved copy's comment says the same ("the issue sent to subscribers on November 2, 2026"). A card dated November 1 next to a body dated November 2 would contradict itself on a public page, so `date` is **`'2026-11-02'`**. Everything else in the brief is literal. If Wesley wants November 1 shown, it is one string in the data file.

## Step 1 — `src/data/newsletterIssues.js` (new, in full)

```js
// The newsletter issues that exist in code, newest first.
//
// There is no stored newsletter HTML anywhere: NewsletterSend only holds
// per-recipient send rows, so this list IS the archive. Each entry points at
// the rendered issue by its `component` slug (src/components/newsletter/) and
// carries the day it went out. Nothing here sends, edits or re-broadcasts an
// issue — it only lists what already exists.
export const NEWSLETTER_ISSUES = [
  {
    slug: 'november-2026',
    title: 'Winter Bliss is here at Flavor Isle',
    summary:
      'Three things changed at the Isle this week: new Bliss shakes, online ordering is back, and we close at 7:00 PM now.',
    // The issue's own dateline — "Isle News · November 2, 2026" — and the day
    // it was sent to subscribers.
    date: '2026-11-02',
    component: 'november-2026',
  },
];

// "November 2, 2026", built in UTC from the stored Y-M-D so a card never shifts
// a day for a visitor in another timezone.
export function formatIssueDate(date) {
  const [year, month, day] = String(date || '')
    .split('-')
    .map(Number);
  if (!year || !month || !day) return '';
  return new Date(Date.UTC(year, month - 1, day)).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
```

The `summary` is the issue's own second sentence, quoted verbatim. `formatIssueDate` is the one display helper both new pages share, so the card date and the detail date can never disagree, and no visitor's timezone can roll the day backwards.

## Step 2 — the November copy lifted behind a prop, byte-identical

`src/components/newsletter/IssueNovember2026.jsx` (new) holds the copy; `NewsletterIssue.jsx` now dispatches on the slug and keeps the same `<section>` wrapper around it. **Rendered output for the default is unchanged to the character.**

`git diff src/components/newsletter/NewsletterIssue.jsx` (condensed — the removed block is the entire former body, reproduced in full in `IssueNovember2026.jsx`):

```diff
 import React from 'react';
+import IssueNovember2026 from './IssueNovember2026';
 
-// Saved copy of the issue sent to subscribers on November 2, 2026, kept on the
-// newsletter page so anyone who missed the email can read it here.
-const FLAVORS = [
-  … six flavors …
-];
+// Renders a saved newsletter issue by its slug. The default is the November
+// 2026 issue the /newsletter page has always shown, so that page's output is
+// unchanged; the archive at /newsletters/:slug passes the issue it opened.
+const ISSUES = {
+  'november-2026': IssueNovember2026,
+};
+
+export default function NewsletterIssue({ issue = 'november-2026' }) {
+  const Issue = ISSUES[issue];
+  if (!Issue) return null;
 
-export default function NewsletterIssue() {
   return (
     <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">
-      <article className="card-diner overflow-hidden">
-        …
-        <div className="p-6 sm:p-8">
-          … the whole issue …
+      <Issue />
     </section>
   );
 }
```

The final `NewsletterIssue.jsx` in full:

```jsx
import React from 'react';
import IssueNovember2026 from './IssueNovember2026';

// Renders a saved newsletter issue by its slug. The default is the November
// 2026 issue the /newsletter page has always shown, so that page's output is
// unchanged; the archive at /newsletters/:slug passes the issue it opened.
const ISSUES = {
  'november-2026': IssueNovember2026,
};

export default function NewsletterIssue({ issue = 'november-2026' }) {
  const Issue = ISSUES[issue];
  if (!Issue) return null;

  return (
    <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">
      <Issue />
    </section>
  );
}
```

**Proof of identity** — old file at `HEAD` vs the new component, compared mechanically:

```
$ git show HEAD:src/components/newsletter/NewsletterIssue.jsx \
    | sed -n '/<article/,/<\/article>/p' | sed 's/^[[:space:]]*//' > /tmp/old_issue.txt
$ sed -n '/<article/,/<\/article>/p' src/components/newsletter/IssueNovember2026.jsx \
    | sed 's/^[[:space:]]*//' > /tmp/new_issue.txt
$ diff /tmp/old_issue.txt /tmp/new_issue.txt && echo identical
ARTICLE BODY IDENTICAL (whitespace-normalised): 78 lines

$ … same ranges, whitespace stripped entirely, cmp …
ARTICLE FLATTENED: byte-identical (3154 chars)
--- FLAVORS array ---
FLAVORS: byte-identical
```

Both the `<article>` markup and the `FLAVORS` array are byte-identical once indentation — which JSX does not render — is discounted; the only structural change is that `<article>` moved one JSX level down inside the same `<section>`, which React renders as the same DOM. Nothing about the copy, images, prices, hours, alt text or the Tasty Threads block moved or changed.

## Step 3 — `src/pages/NewsletterArchive.jsx` at `/newsletters` (new, in full)

```jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Newspaper } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import { NEWSLETTER_ISSUES, formatIssueDate } from '@/data/newsletterIssues';

// Every newsletter issue that exists in code, newest first. Nothing is fetched:
// the list is the archive, and each card opens the saved issue itself.
export default function NewsletterArchive() {
  const issues = [...NEWSLETTER_ISSUES].sort((a, b) => String(b.date).localeCompare(String(a.date)));

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Newsletter Archive — Flavor Isle | Smiths Grove, KY"
        description="Every issue of the Flavor Isle newsletter in one place, newest first: new menu items, seasonal shakes, and what's changed at the Isle in Smiths Grove, KY."
      />
      <Navbar />
      <CartDrawer />

      <section className="bg-patina-mint text-white px-4 sm:px-6 py-14">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-smashie-yellow text-obsidian-roast px-4 py-1.5 rounded-full font-heading text-sm tracking-wide mb-5">
            <Newspaper size={16} /> PAST ISSUES
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl leading-tight">Newsletter Archive</h1>
          <p className="font-body text-base sm:text-lg text-white/90 mt-3 max-w-lg mx-auto">
            Every issue we've sent, in one place. Pick one and read it here.
          </p>
        </div>
      </section>

      <section className="max-w-2xl mx-auto px-4 sm:px-6 py-12 space-y-4">
        {issues.length === 0 ? (
          <div className="card-diner p-8 text-center">
            <p className="font-heading text-lg text-obsidian-roast mb-1">No issues archived yet</p>
            <p className="text-sm text-muted-foreground font-body mb-5">
              The first issue will show up here once it goes out.
            </p>
            <Link to="/newsletter" className="btn-mint chrome-hover inline-block px-6 py-3 text-sm font-heading">
              Get the Scoop
            </Link>
          </div>
        ) : (
          issues.map((issue) => (
            <Link
              key={issue.slug}
              to={`/newsletters/${issue.slug}`}
              className="card-diner group block p-6 sm:p-7 focus:outline-none focus-visible:ring-2 focus-visible:ring-midnight-cherry focus-visible:ring-offset-2"
            >
              <p className="font-heading text-xs tracking-[0.18em] uppercase text-midnight-cherry">
                {formatIssueDate(issue.date)}
              </p>
              <h2 className="font-heading text-2xl sm:text-3xl text-obsidian-roast leading-tight mt-2">
                {issue.title}
              </h2>
              <p className="text-sm text-muted-foreground font-body leading-relaxed mt-2">{issue.summary}</p>
              <span className="inline-flex items-center gap-1.5 mt-4 font-heading text-sm text-patina-mint group-hover:text-midnight-cherry transition-colors">
                Read the issue <ArrowRight size={16} />
              </span>
            </Link>
          ))
        )}
      </section>

      <Footer />
    </div>
  );
}
```

Card shows date, title and summary, whole card is the link (44px+ tap area), `card-diner` matches the rest of the site, single column on phones and `max-w-2xl` on desktop. No signup form and no admin composer on this page. Empty state is real — if `NEWSLETTER_ISSUES` is ever empty, the page says so and points at the signup.

## Step 4 — `src/pages/NewsletterIssuePage.jsx` at `/newsletters/:slug` (new)

The distinctive parts, quoted; the shell is the same `min-h-screen bg-vanilla-malt` + Navbar/Footer/CartDrawer/Seo pattern as every other public page.

```jsx
  const { slug } = useParams();
  const issue = NEWSLETTER_ISSUES.find((entry) => entry.slug === slug) || null;

  // A missing issue is a real 404 for crawlers, once we know it's missing —
  // the lookup is synchronous, so there is no loading state to wait out.
  useEffect(() => {
    if (issue) return undefined;
    const meta = document.createElement('meta');
    meta.name = 'prerender-status-code';
    meta.content = '404';
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, [issue]);
```

Unknown slug — a clean block, not a redirect and not the generic PageNotFound:

```jsx
            <h1 className="font-heading text-2xl text-obsidian-roast mb-2">That issue isn't here</h1>
            <p className="text-sm text-muted-foreground font-body leading-relaxed mb-6">
              We couldn't find a newsletter with that name. Every issue we've sent is in the archive.
            </p>
            <Link to="/newsletters" className="btn-mint chrome-hover inline-block px-6 py-3 text-sm font-heading">
              Back to all issues
            </Link>
```

Known issue — back link, date, the issue itself, then the existing signup component reused as-is:

```jsx
      <section className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 pb-4">
        <Link
          to="/newsletters"
          className="inline-flex items-center gap-1.5 font-heading text-sm text-patina-mint hover:text-midnight-cherry transition-colors"
        >
          <ArrowLeft size={16} /> Back to all issues
        </Link>
        <p className="font-heading text-xs tracking-[0.18em] uppercase text-muted-foreground mt-4">
          {formatIssueDate(issue.date)}
        </p>
      </section>

      <NewsletterIssue issue={issue.component} />

      <div className="bg-obsidian-roast text-white">
        <FooterEmailSignup />
      </div>
```

`FooterEmailSignup` is the app's existing newsletter signup component — reused untouched, wrapped in the navy band it was designed for, so it renders exactly as it does in the footer and still writes through `subscribeEmail` with `source: 'footer'`. The signup flow itself was not modified.

## Step 5 — routes and the two links

`src/App.jsx`:

```diff
 const Newsletter = lazy(() => import('./pages/Newsletter'));
+const NewsletterArchive = lazy(() => import('./pages/NewsletterArchive'));
+const NewsletterIssuePage = lazy(() => import('./pages/NewsletterIssuePage'));
 const ConfirmSubscription = lazy(() => import('./pages/ConfirmSubscription'));
@@
       <Route path="/newsletter" element={<Newsletter />} />
+      <Route path="/newsletters" element={<NewsletterArchive />} />
+      <Route path="/newsletters/:slug" element={<NewsletterIssuePage />} />
       <Route path="/confirm-subscription" element={<ConfirmSubscription />} />
```

Both lazy-loaded exactly like `/newsletter`, both public (no `ProtectedRoute`), placed immediately after the existing `/newsletter` route.

`src/pages/Newsletter.jsx` — the "Past issues" link, after the signup form and before the issue:

```diff
-import { Mail, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
+import { Mail, CheckCircle2, Loader2, Sparkles, Newspaper } from 'lucide-react';
+import { Link } from 'react-router-dom';
@@
       </section>
 
+      <section className="max-w-xl mx-auto px-4 sm:px-6 pb-10">
+        <Link
+          to="/newsletters"
+          className="inline-flex items-center gap-2 font-heading text-sm text-patina-mint hover:text-midnight-cherry transition-colors"
+        >
+          <Newspaper size={16} /> Past issues
+        </Link>
+      </section>
+
       <NewsletterIssue />
```

`src/pages/CommunityNews.jsx` — "Past newsletters" in the header:

```diff
-import { Newspaper } from 'lucide-react';
+import { Newspaper, Mail } from 'lucide-react';
+import { Link } from 'react-router-dom';
@@
           Community events, restaurant updates, and local partnerships — straight from Smiths Grove.
         </p>
+        <Link
+          to="/newsletters"
+          className="inline-flex items-center gap-1.5 mt-4 font-heading text-sm text-patina-mint hover:text-midnight-cherry transition-colors"
+        >
+          <Mail size={15} /> Past newsletters
+        </Link>
         {isAdmin && (
```

Nothing else in either page changed — no copy, no layout, no signup logic, no composer.

## Step 6 — deliberately untouched

- `NewsPost`, `NewsletterSend`, `EmailSubscriber`: no schema change, no record created, updated or deleted.
- Signup and double opt-in: `subscribeEmail`, `confirmEmailSubscription`, `unsubscribeEmail`, `EmailSubscriber` and the pending→active flow are unchanged. The detail page reuses the existing component and its existing `source: 'footer'` call.
- Every email template and every send path — `sendNewsletterBroadcast` not called; nothing was sent, resent or test-sent during this build.
- `/newsletter`'s own copy, hero, form and issue rendering (identical to before), and the `/newsletter` route itself.

## Files

Added:
- `src/data/newsletterIssues.js`
- `src/components/newsletter/IssueNovember2026.jsx`
- `src/pages/NewsletterArchive.jsx`
- `src/pages/NewsletterIssuePage.jsx`

Edited:
- `src/components/newsletter/NewsletterIssue.jsx` (prop + slug dispatch)
- `src/App.jsx` (2 lazy imports, 2 routes)
- `src/pages/Newsletter.jsx` (1 link)
- `src/pages/CommunityNews.jsx` (1 link)

## Verification

- `npm run build` → **exit 0**; chunks emitted: `NewsletterArchive-*.js`, `NewsletterIssuePage-*.js`, `newsletterIssues-*.js`.
- November issue copy proven byte-identical to `HEAD` (78-line diff after whitespace normalisation: empty; flattened article 3154 chars identical; `FLAVORS` identical).
- `/newsletters` lists one issue; `/newsletters/november-2026` renders it; any other slug renders the not-found block with the 404 meta and a working back link.
- No email sent, no subscriber touched, no news post created or edited.