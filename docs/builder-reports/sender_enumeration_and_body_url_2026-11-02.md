# BuilderReport — Sender fix only: full subscriber enumeration + body_url support (issue #151)

- **Date:** 2026-11-02
- **Issue:** flavorisle/flavor-isle #151 — "Sender fix only: full subscriber enumeration + body_url support (no sends)"
- **Code file changed:** `base44/functions/sendNewsletterBroadcast/entry.ts` (the only code file)
- **Report file:** `docs/builder-reports/sender_enumeration_and_body_url_2026-11-02.md`
- **Scope:** Change A (cursor enumeration) and Change B (`body_url` support) verbatim from the issue, plus `body_source` in the two success responses. Nothing else. No email sent, scheduled or test-sent. No `NewsletterSend` row created, edited or deleted.

## Change A — cursor subscriber enumeration

Replaced the offset loop (`const active = [] … while (page <= 40) …`) with the issue's block, verbatim, including its comment. It now sits at **lines 82–102**:

```ts
    // Cursor pagination. The offset form silently returned 746 of 1,003
    // active rows (incident 2026-11-02) and the pre-fix version re-read the
    // same rows on every page, which caused duplicate sends.
    const active = [];
    const queuedIds = new Set();
    let cursor = null;
    for (let guard = 0; guard < 100; guard++) {
      const pageRes = cursor
        ? await base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'active' }, { limit: 500, cursor })
        : await base44.asServiceRole.entities.EmailSubscriber.filter({ status: 'active' }, { limit: 500 });
      const items = Array.isArray(pageRes) ? pageRes : (pageRes?.items || []);
      for (const sub of items) {
        if (queuedIds.has(sub.id)) continue;
        queuedIds.add(sub.id);
        active.push(sub);
      }
      if (Array.isArray(pageRes)) break;
      if (!pageRes?.has_more || !pageRes?.next_cursor) break;
      cursor = pageRes.next_cursor;
    }
```

- Pagination is now driven by `next_cursor` / `has_more` from the options form, with a 100-page guard.
- `queuedIds` dedupe by subscriber id is kept, so an overlapping page cannot queue the same subscriber twice.
- The stale comment about the 4th positional argument being an offset was replaced by the issue's comment; no other comment changed.

## Change B — `body_url` support

Replaced the `subject` / `htmlBody` lines with the issue's block, verbatim. It sits at **lines 50–61** (with `const subject` at line 49 and the existing required-field guard now at line 62):

```ts
    const subject = (body?.subject || '').trim();
    let htmlBody = (body?.body || '').trim();
    let bodySource = htmlBody ? 'body' : 'none';
    if (!htmlBody && typeof body?.body_url === 'string' && /^https:\/\//.test(body.body_url.trim())) {
      try {
        const r = await fetch(body.body_url.trim(), { headers: { 'User-Agent': 'FlavorIsleAgent/1.0' } });
        if (!r.ok) return Response.json({ error: `body_url fetch failed (${r.status})` }, { status: 502 });
        htmlBody = (await r.text()).trim();
        bodySource = 'body_url';
      } catch (e) {
        return Response.json({ error: `body_url fetch failed: ${e.message}` }, { status: 502 });
      }
    }
    if (!subject || !htmlBody) return Response.json({ error: 'subject and body are required' }, { status: 400 });
```

- An inline `body` still wins; `body_url` is read only when `body` is absent, and only over `https://`.
- A failed fetch returns 502 and never falls through to a send.
- `bodySource` is then `'body'`, `'body_url'`, or `'none'` (the last case only reachable when the required-field guard returns 400 first).

## Verification

### 1. Diff scope

`git diff --stat`:

```
 base44/functions/sendNewsletterBroadcast/entry.ts | 41 +++++++++++++++--------
 1 file changed, 27 insertions(+), 14 deletions(-)
```

`git status --porcelain --untracked-files=all` after adding this report:

```
 M base44/functions/sendNewsletterBroadcast/entry.ts
 ?? docs/builder-reports/sender_enumeration_and_body_url_2026-11-02.md
```

Only the function file is modified and only this report file is added — nothing else in the repo changed. The diff contains exactly three regions: the `subject`/`htmlBody`/`body_url` block, the enumeration block, and the two success responses. `broadcastId()`, the block-list load, the prior-send load, the `count_only` block, the send loop, the `stats` action and the `test` action are untouched.

### 2. Final enumeration block
Quoted verbatim above, lines 82–102.

### 3. Final `body_url` block
Quoted verbatim above, lines 50–61.

### 4. `body_source` in both success responses; no send path executed

```
137:      return Response.json({ ok: true, count_only: true, eligible, withheld, total: active.length, broadcast_id: bid, body_source: bodySource });
159:    return Response.json({ ok: true, sent, skipped, blocked, failed, total: active.length, broadcast_id: bid, body_source: bodySource });
```

- Line 137 = the `count_only` dry-run response.
- Line 159 = the final broadcast response.

No send path was executed: the build made no function invocation at all — no `send`, no `count_only` run, no `test` preview. No email was sent, scheduled or test-sent, and no `NewsletterSend` record was created, updated or deleted.

## Deployment note

Saving the function updates the editor preview immediately; the published app keeps calling the last published version until the app is republished. Any dry run or send is a separate approved step and was not part of this build.