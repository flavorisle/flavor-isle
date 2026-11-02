# BuilderReport — Newsletter broadcast: exclude prior broadcasts + dry-run count (issue #150)

- **Date:** 2026-11-02
- **Issue:** flavorisle/flavor-isle #150 — "Newsletter broadcast: exclude prior broadcasts + dry-run count (send full version to exactly the 245 who got nothing)"
- **File changed:** `base44/functions/sendNewsletterBroadcast/entry.ts` (the only code file)
- **Report file:** `docs/builder-reports/newsletter_broadcast_exclude_dryrun_2026-11-02.md`
- **Scope:** the two changes in the issue, verbatim. Nothing else touched. No email sent. No `NewsletterSend` row created, edited or deleted during this build.

## Change 1 — exclude prior broadcasts

```ts
    const excludeBids = Array.isArray(body?.exclude_broadcast_ids)
      ? body.exclude_broadcast_ids.filter((b) => typeof b === 'string' && b.trim())
      : [];
    const alreadySent = new Set();
    for (const loadBid of [bid, ...excludeBids]) {
      for (let p = 1; p <= 60; p++) {
        const priorPage = await base44.asServiceRole.entities.NewsletterSend.filter({ broadcast_id: loadBid }, '-created_date', 500, (p - 1) * 500);
        if (!priorPage || priorPage.length === 0) break;
        for (const s of priorPage) alreadySent.add(s.subscriber_id);
        if (priorPage.length < 500) break;
      }
    }
```

Final 10 lines of the block (as requested):

```ts
    for (const loadBid of [bid, ...excludeBids]) {
      for (let p = 1; p <= 60; p++) {
        const priorPage = await base44.asServiceRole.entities.NewsletterSend.filter({ broadcast_id: loadBid }, '-created_date', 500, (p - 1) * 500);
        if (!priorPage || priorPage.length === 0) break;
        for (const s of priorPage) alreadySent.add(s.subscriber_id);
        if (priorPage.length < 500) break;
      }
    }
```

- `bid` still loads first; the excluded ids follow in the same list.
- Every id uses the identical 60-page × 500 pagination with `(p - 1) * 500` as the record offset.
- `subscriber_id` remains the join key.

## Change 2 — dry-run count

Inserted immediately after Change 1 and **before** `const resend = new Resend(...)` and the send loop:

```ts
    if (body?.count_only === true) {
      let eligible = 0, withheld = 0;
      for (const sub of active) {
        if (alreadySent.has(sub.id)) { withheld++; continue; }
        if (blockFilter.hasEmail(sub.email)) { withheld++; continue; }
        eligible++;
      }
      return Response.json({ ok: true, count_only: true, eligible, withheld, total: active.length, broadcast_id: bid });
    }
```

Final 9 lines of the block (as requested):

```ts
    if (body?.count_only === true) {
      let eligible = 0, withheld = 0;
      for (const sub of active) {
        if (alreadySent.has(sub.id)) { withheld++; continue; }
        if (blockFilter.hasEmail(sub.email)) { withheld++; continue; }
        eligible++;
      }
      return Response.json({ ok: true, count_only: true, eligible, withheld, total: active.length, broadcast_id: bid });
    }
```

- Returns `{ ok, count_only, eligible, withheld, total, broadcast_id }`.
- Returns before the Resend client is constructed, so no email can be attempted.
- Writes no `NewsletterSend` row.
- `withheld` counts both already-sent and blocked.

## Verification

### 1. Exact blocks
Both replacement blocks are quoted verbatim above, including the tails requested.

### 2. Diff scope

`git diff --stat`:

```
 base44/functions/sendNewsletterBroadcast/entry.ts | 25 ++++++++++++++++++-----
 1 file changed, 20 insertions(+), 5 deletions(-)
```

`git status --porcelain` shows the changed function file and the new report file, nothing else. The single diff hunk sits inside the broadcast branch: `excludeBids` declaration, the multi-broadcast prior-send loop, and the `count_only` early return — no other line in the file changed.

### 3. Omitting both parameters is identical to #149
The function's behaviour is unchanged when the new inputs are absent:

- `exclude_broadcast_ids` missing → `Array.isArray(undefined)` is false → `excludeBids === []` → `[bid, ...[]]` is `[bid]`, i.e. exactly the single-id load and 60-page × 500 pagination from #149, with the same `-created_date` sort, the same `subscriber_id` key, and the same break conditions.
- `count_only` missing or not `true` → the block never returns early, so execution falls through to the unchanged Resend client, the unchanged send loop, and the unchanged summary response.

### 4. No email sent, no `NewsletterSend` row written
The build stopped at the code change. No function invocation, no dry run and no broadcast were executed, so no email was attempted and no `NewsletterSend` record was created, updated or deleted. The 1,025 duplicate rows for `nl_1n6hrpt` are untouched.

## Untouched, as required

`stats` action, `test` action, `broadcastId()`, `unsubscribeFooter()`, `brandedEmailHtml`, `loadBlockFilter()` / `requireAdmin()`, the #149 subscriber pagination, the block-list load, the per-recipient send loop, `FROM`, subject handling, every entity schema, every page, every other function.

## Deployment note

Saving the function updates the editor preview at once; the published site keeps calling the last published version until the app is republished. The post-build dry run and send described in the issue are separate approved steps and were not run here.