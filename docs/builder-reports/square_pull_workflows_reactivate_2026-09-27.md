# Builder report: square_pull_workflows_reactivate_2026-09-27

2 items in this batch.

## Square Busyness Live (scheduled workflow, */5 cron -> syncSquareBusyness mode=live)

**Status:** applied  
**App entity:** BuilderReport `6ab9645a8ce9e21341d64c43`

### Before

Workflow status: ACTIVE (never paused). Every scheduled run since Sat 2026-09-26 evening is [cancelled] with 0 steps executed (60-300ms), e.g. runs at 18:00, 18:05 ... 18:45 UTC on 2026-09-27. Because no step ever executes, the function never runs, so no live busyness counts are written on schedule. HourlyCount rows dated 2026-09-27 were created 18:01 UTC (13:01 CT) by a manual run only. Manual invocation of syncSquareBusyness works normally.

### After

Reactivation attempted via workflow panel for both workflows: result 'Workflow already active' for each -- they were NOT paused, so there was nothing to resume. Definitions verified unchanged and valid (trigger cron */5, timezone America/Chicago, single step invoking syncSquareBusyness with mode=live; no code changes made, none needed). Runs continue to cancel with 0 steps after the activation attempt (next runs 18:45 UTC still cancelled). Root cause is platform-side, not workflow config: the workspace is out of integration credits, which blocks scheduled automations. Same-day confirmation: every other scheduled workflow in the app (Square Menu Sync, Sync Square Order Status, Auto-Sync Orders to Square, Recommendation Email Trigger, Review Request Email Trigger, Cart Abandonment Reminders, Square Busyness Profile, Birthday Email Trigger) is also cancelled with 0 steps; last successful scheduled run anywhere was End of Night Order Cleanup at 2026-09-27 02:02 UTC. Resolution is a workspace billing action (upgrade tier) or waiting for credits to reset 2026-10-26; manual runs remain the interim workaround.

---

## Sync Square POS Orders (scheduled workflow, */5 cron -> syncSquarePOS)

**Status:** applied  
**App entity:** BuilderReport `6ab9645a8ce9e21341d64c44`

### Before

Workflow status: ACTIVE (never paused). Every scheduled run since Sat 2026-09-26 evening is [cancelled] with 0 steps executed, e.g. runs at 18:00, 18:05 ... 18:45 UTC on 2026-09-27 (one at 18:15 UTC took 8068ms but still recorded 0 steps). Newest in-store Order record: 2026-09-27 01:15 UTC (Sat ~20:15 CT), so none of today's POS sales have synced. Manual invocation at 18:01 UTC (13:01 CT) pulled 19 Square orders successfully, confirming syncSquarePOS itself is healthy and only the scheduled trigger path is dead.

### After

Reactivation attempted via workflow panel: result 'Workflow already active' -- nothing was paused, so there was nothing to resume. Definition verified unchanged and valid (trigger cron */5, timezone America/Chicago, single step invoking syncSquarePOS with no args; no code changes made, none needed). Runs continue to cancel with 0 steps after the activation attempt. Root cause is platform-side: workspace integration credits are exhausted, which blocks scheduled automations for the whole app (confirmed against Square Menu Sync, Sync Square Order Status, Auto-Sync Orders to Square, and the non-Square email triggers -- all cancelled, 0 steps, since Sep 27). No workflow configuration change can restore these runs; resolution is upgrading the workspace tier or waiting for the credit reset on 2026-10-26, with manual invocation as the interim workaround.
