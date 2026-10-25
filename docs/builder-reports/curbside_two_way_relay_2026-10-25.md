# Curbside "I'm Here" — two-way relay (employee name + ready time back on the order page)

**Issue:** [#117](https://github.com/flavorisle/flavor-isle/issues/117) — owner-only comment `#issuecomment-6392672885` (pre-plan)
**Approved:** Wesley Booker, Oct 24, 2026, 9:45 PM CT (email reply "Approve" to Resend id `01a170ef-2485-7aa1-b673-45f680a1dea4`)
**Date:** 2026-10-25
**Scope:** exactly steps 1–6 of the approved pre-plan. Nothing else touched.

---

## Step log

- **1 — `base44/entities/Order.jsonc`** ✅ Done. Inside `arrival_details.properties`, six fields added: `relay_status` (string, enum `pending | relayed | no_answer | fallback_announced`, with the pre-plan's description), `relay_employee` (string), `relay_ready` (boolean), `relay_eta_minutes` (number), `relay_message` (string, `maxLength` 300), `relay_at` (date-time). Every existing `arrival_details` field and every other Order field is untouched — the file diff is 32 added lines and nothing else.

- **2 — `base44/functions/logCurbsideArrival/entry.ts`** ✅ Done. `cleanField`, `ANNOUNCE_COOLDOWN_MS` (5 min), order lookup + 404, possession proof (phone/email match, 403), curbside check (400), active-status check (400), cooldown check, `arrivedAt`, the cleaned note/zone/color/make/model values, the `vehicle` string and the `{ success: true, arrived_at }` response all behave exactly as before. The arrival write now also carries `relay_status: 'pending'` and `relay_at: arrivedAt` in the same single update. The TTS/Twilio announcement moved verbatim into the in-file helper `announceArrivalToKitchen(order, cleanZone, vehicle, cleanNotes)` (same `smashieTts` URL with `withRelayKey`, same two plays with the 1 second pause, same hangup, same `COUNTER_PHONE_NUMBER` with `+12705634618` fallback). The old call site is replaced by the POST to the Insights agent's `startCurbsideRelay` (`{ order_number, customer_name, zone, vehicle, notes }`, JSON, 10 second timeout, errors caught and logged "Relay webhook failed; fell back to one-way announcement"). On a throw or non-2xx it calls the helper and then merges `relay_status: 'fallback_announced'` into `arrival_details`.

- **3 — `base44/functions/lookupOrder/entry.ts`** ✅ Done. The `arrival_details` response object now also returns `relay_status`, `relay_employee`, `relay_ready` (boolean or null), `relay_eta_minutes` and `relay_message`, each null-safe. Existing fields, the live Square status check and every response shape are unchanged.

- **4 — `src/components/OrderLookup.jsx`** ✅ Done. The static green block is now driven by `curbsideRelayMessage(order.arrival_details)` — same green styling, same visibility condition (arrival recorded, order not cancelled/completed/delivered):
  - `pending` → "Smashie's calling the crew to let them know you're here — this page will show who's bringing your order out."
  - `relayed` + `relay_ready === true` → "{employee} is bringing your order out now."
  - `relayed` + `relay_ready === false` → "{employee} will bring your order out in about {eta} minutes", falling back to `relay_message` when the ETA is missing.
  - `no_answer` → "The crew couldn't be reached by phone — your arrival was still announced at the counter. Need us? Call (270) 563-4618."
  - `fallback_announced` or no relay status → the previous copy, "Kitchen's been told you're here — your order's on its way out!"
  No new polling: `useTrackedOrderRefresh` already re-runs `lookupOrder` every 15 seconds while the order is active.

- **5 — `src/components/CurbsideArrivalModal.jsx`** ✅ Done. The done screen now reads "Smashie's letting the crew know you're here — watch the order page for who's bringing your food out." The notes confirmation, the "We See You, Fam!" heading and the "Got It" button are unchanged.

- **6 — `base44/functions/curbsideFallbackAnnounce/entry.ts`** *(new)* ✅ Done. Server-to-server one-way announcement for the no-answer path: requires `order_number` (400), loads the order (404), guards on curbside (400) and active status (400), and holds the same 5-minute cooldown against `arrival_details.arrived_at` (returns `{ success: true, already: true }`). It rebuilds the identical announcement from the stored arrival — zone, vehicle and notes through `cleanField`, order number read digit by digit — and places the same counter call (`smashieTts` URL with `withRelayKey`, played twice with a 1 second pause, then hangup, to `COUNTER_PHONE_NUMBER` with the `+12705634618` fallback). It writes nothing to `arrival_details` and returns `{ success: true }`.

---

## Files changed

- `base44/entities/Order.jsonc` — step 1, six relay fields on `arrival_details`.
- `base44/functions/logCurbsideArrival/entry.ts` — step 2, relay handoff + announcement helper + fallback.
- `base44/functions/lookupOrder/entry.ts` — step 3, relay fields in the public response.
- `src/components/OrderLookup.jsx` — step 4, relay-status copy.
- `src/components/CurbsideArrivalModal.jsx` — step 5, done-screen copy.
- `base44/functions/curbsideFallbackAnnounce/entry.ts` *(new)* — step 6.
- `docs/builder-reports/curbside_two_way_relay_2026-10-25.md` *(this report)*.

## Verification

- `npm run build` (Vite) exits 0 after every step.
- `curbsideFallbackAnnounce` deployed and answers 400 on a missing `order_number`, 404 on an unknown one.
- `logCurbsideArrival` still answers 404 for an unknown order number before any call is placed, so no test order or test call was made.
- `lookupOrder` returns the stored arrival with the relay fields null when the agent has not written them yet.

## Limits respected

Menu untouched. No ordering switches, delivery, checkout/payment/loyalty/SMS/email or kitchen-ticket changes. No test orders, no test calls. The curbside on/off switch is a separate pending proposal and was not built.