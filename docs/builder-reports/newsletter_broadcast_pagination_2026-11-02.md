# BuilderReport — Newsletter broadcast pagination fix (issue #149)

- **Date:** 2026-11-02
- **Issue:** flavorisle/flavor-isle #149 — "Fix newsletter broadcast subscriber pagination + prior-send pagination + in-run dedupe (incident 2026-11-02)"
- **File changed (only file):** `base44/functions/sendNewsletterBroadcast/entry.ts`
- **Scope:** the three changes in the issue, verbatim. No other code, entity, page, workflow or function touched. No `NewsletterSend` record deleted or migrated. The post-deploy catch-up rerun described in the issue was **not** executed.

## 1. Subscriber pagination (was lines 70–78)

Offset is the record offset, not the page number; cap raised to 40 pages; ids deduped while the list is built.

```ts
    const active = [];
    const queuedIds = new Set();
    let page = 1;
    while (page <= 40) {
      const batch = await base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'active' }, '-subscribed_at', 500, (page - 1) * 500);
      if (!batch || batch.length === 0) break;
      for (const sub of batch) {
        if (queuedIds.has(sub.id)) continue;
        queuedIds.add(sub.id);
        active.push(sub);
      }
      if (batch.length < 500) break;
      page++;
    }
```

- Offset passed: `(page - 1) * 500` ✅ (page 1 → 0, page 2 → 500, page 3 → 1000 …)
- Page cap: `page <= 40` ✅ (was `<= 20`)
- `const queuedIds = new Set();` declared, and each id checked/added before pushing ✅
- `active.push(...batch)` removed ✅

## 2. Prior-send lookup (was lines 91–94)

The single capped read is replaced by a paginated loop that unions every page of delivery records for this `broadcast_id`.

```ts
    const alreadySent = new Set();
    for (let p = 1; p <= 60; p++) {
      const priorPage = await base44.asServiceRole.entities.NewsletterSend.filter({ broadcast_id: bid }, '-created_date', 500, (p - 1) * 500);
      if (!priorPage || priorPage.length === 0) break;
      for (const s of priorPage) alreadySent.add(s.subscriber_id);
      if (priorPage.length < 500) break;
    }
```

- `for (let p = 1; p <= 60; p++)` loop ✅
- Reads `filter({ broadcast_id: bid }, '-created_date', 500, (p - 1) * 500)` ✅
- Every `s.subscriber_id` added to `alreadySent` ✅
- Breaks on an empty page or a page smaller than 500 ✅

## 3. In-run dedupe (was line 99 block)

One line added as the last statement of the `for (const sub of active)` loop body, after the existing `if (error) { … } else { … }` logging block:

```ts
      } else {
        sent++;
        try { await base44.asServiceRole.entities.NewsletterSend.create({ broadcast_id: bid, subscriber_id: sub.id, email: sub.email, status: 'sent', sent_at: now }); } catch {}
      }
      alreadySent.add(sub.id);   // ← added
    }
```

- `alreadySent.add(sub.id);` is inside the send loop ✅ and after the failed/sent logging branch ✅
- The `if (alreadySent.has(sub.id)) { skipped++; continue; }` guard, the block-filter branch and both `NewsletterSend.create` writes are unchanged ✅

## Verification

`git diff --stat` for the whole repo:

```
 base44/functions/sendNewsletterBroadcast/entry.ts | 31 ++++++++++++++++++-----
 1 file changed, 24 insertions(+), 7 deletions(-)
```

- Exactly one file changed ✅
- The diff contains exactly three hunks, matching the three regions above (subscriber paging, prior-send read, `alreadySent.add(sub.id)`) ✅
- Untouched, as required: the `stats` action, the `test` action, `broadcastId()`, `unsubscribeFooter()`, `brandedEmailHtml`, `loadBlockFilter()` / `requireAdmin()`, `FROM`, subject handling, every entity, every page, every other function ✅
- Root cause addressed: the 4th `filter()` argument is the record offset, so the old `page` value returned the same first ~500 rows on every page — which produced the 1,025 attempts / 518 unique / 352 duplicates / 485 missed of the 07:46 CT send.

## Deployment note

Saving the function updates the editor preview immediately; the published site keeps calling the previously published version until the app is republished.