# Watchdog moved off the agent workflow into a scheduled backend function

**Approved:** Wesley, by text, Nov 8 2026, 11:03 AM CT — option C.
**Report key:** `watchdog_backend_rebuild_2026-11-08`
**Status:** built, verified by dry run against live data. No workflow edited, no cron added, nothing published.

## Why

The watchdog lived as an agent step inside a workflow. The platform forces an agent step to return a non-empty closing message and delivers that message to Wesley's chat, so a ten-minute schedule texted him 96 times a day. A backend function invoked by the workflow has no agent step, so nothing reaches his phone except the email the function itself decides to send.

## What was added (additions only)

| Piece | What it is |
| --- | --- |
| `WatchdogIncident` entity | One row per condition: `key`, `tier` (TIER_1/TIER_2), `status` (open/cleared), `summary`, `first_seen_at`, `last_seen_at`, `last_alert_at`, `cleared_at`, `detail`. |
| `WatchdogRun` entity | One row per sweep: `ran_at`, `checks_run`, `opened`, `cleared`, `email_sent`, `email_kind` (none/alert/recovery/daily), `note`. |
| `watchdogRun` function | POST. Runs the ten checks, opens/refreshes/clears incidents, sends at most one email per run. |

No existing function, workflow, agent or entity was modified.

## Checks, in order

1. **Sync heartbeat** — newest `HourlyCount` vs newest `Order`. Fires only when ordering is enabled, local CT is between opening and 30 minutes past closing, at least one order exists in the last 90 minutes, and the newest hourly count is over 90 minutes old. Needs two consecutive failing runs. `MenuSetting` is read newest-first by `-updated_date` and matched to the live record `6a619923321f89b8d1cf8b3f`; never a bare limit-1 read.
2. **Unalerted paid orders** (TIER 1) — paid, source not `in_store`, older than 15 minutes, missing `square_order_id` or `staff_alert_sent_at`. Lookback 6 hours.
3. **Card failures** (TIER 1) — `CardPaymentLog` with outcome declined / unsettled / error in the last 60 minutes.
4. **Sync errors** — `SquareSyncLog` failed rows in the last 60 minutes, grouped one incident per error signature; rows with status `skipped` ignored.
5. **Customer texts** — failed/undelivered in the last 60 minutes, plus texts still queued more than an hour (bounded to the last 24 hours so the 203 rows left queued by the October outage are history, not a live incident). A failure whose reason says "is not active" or error `20003` folds into the Twilio incident instead of a per-record one.
6. **Missing receipts** (TIER 1) — paid or cash-on-pickup, 20–90 minutes old, source not `in_store`, type not `in_store`/`dine_in`, real customer email, no `confirmation_email_sent_at`.
7. **Customer unnotified** (TIER 1) — same window where every channel failed: no confirmation email, and the status text missing, failed, or skipped.
8. **Bulk sends** — `NewsletterSend` failed, or carrying an error, in the last 60 minutes.
9. **Push** — `PushLog` failures in the last 60 minutes, but only an incident when at least one non-owner subscription exists; otherwise informational only.
10. **Twilio probe** — GET of the account resource with the existing SID/token secrets; anything but `active`, or an auth error, means down.

**Tiers:** TIER_1 only for checks 2, 3, 6 and 7 (a named paying customer is worse off within the hour). Everything else TIER_2.

## Email

Resend, `Wesley Booker <wesley@order.flavor-isle.com>` → `wesleyrbooker1@gmail.com`, header `User-Agent: FlavorIsleAgent/1.0`.

- TIER_1 new incident and TIER_1 recovery: immediate, one combined email per run maximum, an open incident is never emailed twice (`last_alert_at` stamped).
- TIER_2: never emails on its own.
- One daily summary between 9:00 and 10:00 AM CT, guarded by a `WatchdogRun` row with `email_kind = daily` for that store day, listing every open incident with tier and age plus what recovered in the last 24 hours.

## Clearing

- **Signature umbrellas** (card, sync errors, bulk sends, push, receipts, unalerted orders): 24 quiet hours.
- **Text failures**: delivery-based — the recorded row ids stop being failed/undelivered/queued.
- **Sync heartbeat and Twilio**: recovery — the condition simply stops.
- One short RECOVERED email on TIER_1 clears only.

## Reads only

The function never writes an order, a text log, a newsletter, a push record or a customer. Its only writes are `WatchdogIncident` and `WatchdogRun`.

## Caller gate

A scheduled workflow calls with no user session. A signed-in caller must be an admin (403 otherwise); anyone else is treated as a scheduled run and held to one real sweep per nine-minute window by the app's shared maintenance gate. A `dry_run` call skips the window claim so it can be repeated for verification.

## Verification — dry run, Nov 8 2026, 11:06 AM CT

```json
{
  "ok": true,
  "dry_run": true,
  "store_local": "2026-11-08 11:06 AM CT",
  "store_hours": "11:00 AM–7:00 PM",
  "findings": [{ "key": "twilio", "tier": "TIER_2", "summary": "Twilio account is not usable (auth failed (401) — authentication failed, account with status 4 is not active)" }],
  "counts": { "findings": 1, "opened": 1, "cleared": 0, "tier1_new": 0, "tier1_recovered": 0, "email_sent": false, "email_kind": "none" }
}
```

WatchdogRun note written by that run:

> DRY RUN (no incidents written, no email). 1 live finding: twilio (TIER_2). Opened: twilio. Cleared: none. Email: dry run — nothing to email.

Matches today's expected shape: Twilio down (TIER 2), no TIER 1 in a quiet period, push quiet with zero customer subscriptions, texts quiet since Oct 24, no email sent. The three old unsanctioned newsletter broadcasts are outside the check's 60-minute window, so they do not open an incident.

A throwaway incident row was created, cleared and deleted separately to prove the entity accepts writes; nothing remains.

## Still to do (Wesley's)

Replace the agent step with one `invoke_backend_function` step calling `watchdogRun`, on the same ten-minute schedule. Until then this function is not scheduled.