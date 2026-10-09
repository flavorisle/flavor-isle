# Unified store switches: one save reaches both systems

Date: 2026-10-09

## What this covers

Every owner-facing switch that changes how the store behaves (hours, closure, early
close, delivery pause / fees / range, site notice, ordering on/off, cash on phone
pickups, phone card processor) is stored once, read by both the website and the
phone line, and any change is logged and emailed to the owner as a before/after
diff.

## Shipped, in the order of the issue

1. **One record per settings entity.**
   - `SmashieSettings` panel now reads the pinned record
     `6a7fd236b64dc1a4c8de4ae0` and has **no create path**: a missing record fails
     the save instead of forking the settings into a duplicate.
   - `facebookConversions.ts` reads the same pinned record instead of `list()[0]`.
   - Verified live: exactly one record per entity, ids matching the pinned consts
     (`MENU_SETTING_ID = 6a619923321f89b8d1cf8b3f`,
     `SMASHIE_SETTINGS_ID = 6a7fd236b64dc1a4c8de4ae0`).
2. **Baselines captured** so the first change has something to diff against
   (see step 10).
3. **Phone reads the unified state.** `twilioVoiceWebhook` and `twilioSmsWebhook`
   now ask `getPhoneStoreStatus` (pinned `storeState.ts`) instead of reaching into
   `storeClosure` on their own. SMS and legacy voice therefore stop the same second
   the website does, with the owner's own `ordering_closed_message`.
4. **Delivery in the call context.** `DELIVERY:` line already carried the pause
   state, range and per-mile fees; the ordering rules now require Smashie to state
   the range and fee **before** taking an address, and to refuse delivery outright
   when the line says PAUSED.
5. **Site notice on the phone.** `NOTICE:` line plus prompt rules: say it when asked
   about ordering / delivery / hours, and mention it in the greeting when the level
   is urgent.
6. **Cash on phone pickup.** `phone_cash_enabled` reaches the phone intro
   (`CASH_OFF_PHONE_INTRO`), the `CASH:` context line, the prompt rules, and is
   enforced server-side in `logPhoneOrder` (refuses cash with the card-link/counter
   wording). `payment_method` stays `card | cash_on_pickup`.
7. **Phone card processor.** `phone_payment_provider` (stripe | square) is read in
   `logPhoneOrder`, which sets `payment_provider` on the order and creates the link
   through the matching helper. Both are settled on `/pay` and in the sync by
   `settleSquarePhonePayment`, so switching processors cannot change how money is
   reconciled. The Square checkout now carries the delivery fee as a non-taxable
   service charge (same shape the website's Square orders use) so the total check
   passes on delivery orders.
8. **Pinned reads for verification.**
   - `verifyOrderPricing.ts` → `getMenuSettingRecord` (was `MenuSetting.list()[0]`).
   - `logPhoneOrder` → `getMenuSettingRecord` for delivery pause / fees / tiers.
   - `facebookConversions.ts` → pinned `SmashieSettings.get`.
9. **Captions so the crew knows a switch is shared.**
   - Store Settings: "All ordering — website + Smashie's phone" (the lock switch),
     order settings, delivery pricing, closure panel and business hours all say
     what they drive on both systems.
   - Communications: the cash toggle and the processor choice say what the phone
     will do, and that customers never see a processor name.
10. **Early close** (`MenuSetting.early_close`) is editable in Store Settings →
    Close Early: date, last-orders time, optional message, and a live preview of the
    sentence Smashie will use ("we close at 5:00 PM today"). It self-expires at
    midnight and never edits the weekly hours. The website already honored it
    (`src/lib/storeState.js`, `orderCutoff.js`) and the phone line now says it too.
11. **Admin mirror.** `getStoreStateForAdmin` (admin-only, pinned, service-safe
    read) feeds a read-only card at the top of the Smashie panel: what the phone
    line is doing right now (status line, ordering, delivery range/fees, today's
    hours or closure, live notice) with an "Edit in Store Settings" link.
12. **Change notice.**
    - New entity `SettingsChangeLog`: entity, `field_changes` (field, before, after,
      what it drives), `affected` (both / website / phone / baseline), the full
      `snapshot`, `emailed`.
    - `notifySettingsChanged` + two entity-triggered workflows
      (`Settings Change Notice - Store`, `Settings Change Notice - Smashie`) diff the
      record against the newest snapshot, email the owner a before/after table
      (to `wesleyrbooker1@gmail.com`), and log the row. The Meta token and record
      bookkeeping are never in the diff; the first run per entity stores a baseline
      and sends nothing, so activation is silent.

## Deliberate choices

- **Processor is server-enforced.** The owner can pick Square, but the toggle is
  only honored where the order and its money path agree; an unrecognised value
  falls back to Stripe rather than failing an order.
- **A refused email is never recorded as sent.** `emailed` is true only when
  `SendEmail` accepted the message; a failure logs the reason on the row.
- **Unchanged saves stay silent.** The admin forms rewrite every field (and
  `updated_date`) on each save, so the diff ignores bookkeeping and only reports
  fields whose value really moved.

## Verification

- `npm test` → 55 passing, 0 failing. New coverage: unified store state / phone
  status / delivery line / cash + notice context (`storeState.test.ts`,
  `smashieLivePrompt.test.ts`), diff + reach + value rendering
  (`settingsChanges.test.ts`), and the whole audit flow including the baseline run,
  the silent no-op save, the token never leaving the record, and a refused send
  (`settingsChangeFlow.test.ts`). Existing `phoneOrderPricing.test.ts` already
  pins "6% tax + untaxed delivery fee", which is the total the Square link is
  checked against.
- `npm run build` → exit 0.
- Live checks: one record per settings entity; both baselines written with
  `emailed: false` (2026-10-09T04:07:07Z); both notice workflows active.
- Nothing here places a test order or triggers a customer email.

## Verification record

The `SettingsChangeLog` baseline rows for `MenuSetting` and `SmashieSettings`
(changed_at 2026-10-09T04:07:07Z, `affected: baseline`, `emailed: false`) are the
record for this work. The next real switch change appends a row with the diff and
the owner's notice status.