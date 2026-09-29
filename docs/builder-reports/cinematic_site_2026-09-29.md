# Builder report: cinematic_site_2026-09-29

Wesley approval: existing public pages only; no menu, kitchen ticket, checkout or core settings changes.

## Homepage

**Status:** applied

**Before:** Existing hero and two-photo GalleryPhotoStrip; existing pickup/delivery/dine-in, phone, popularity and statistics.

**After:** Replaced hero with full-bleed hanging-sign photo, Exit 38 headline and /order button; placed contiguous dining room, award wall and full-screen double-burger scroll chapters. Removed GalleryPhotoStrip only. Retained ordering shortcuts, phone, live popularity and statistics below the story. Existing other sections remain.

## I-65 Exit 38

**Status:** applied

**Before:** Text-led hero, directions, history, attractions, hours and order CTA.

**After:** Replaced hero with real hanging-sign photo; added dining/community board, award, pencil-sketch/newspaper-clipping and Colonel photo chapters; kept original SEO metadata, directions, attractions, hours and ordering; preserved a phone CTA at the end.

## Gallery

**Status:** applied

**Before:** Existing real-photo grid, filters and lightbox; four newest photos absent.

**After:** Added both chicken sandwich photos, cheeseburger with tots and hanging sign to existing gallery with descriptions and captions; hanging-sign parallax hero, IntersectionObserver grid reveals, eased photo zoom and fading lightbox caption. No new route.

## Mammoth Cave Dining

**Status:** applied

**Before:** Text-led traveler page and directions.

**After:** Added real double-burger and chicken-sandwich photo chapters with /order and external directions CTAs. Existing SEO, directions, hours and content remain.

## Corvette Car Clubs

**Status:** applied

**Before:** Text-led car-club page and directions.

**After:** Added real cheeseburger/tots and chicken-sandwich chapters with /order and directions CTAs. Existing SEO, directions, hours and content remain.

## About

**Status:** applied

**Before:** History text, archival photos and existing sections.

**After:** Added dining room, award wall, framed sketch with clippings, and Colonel scroll chapters after original history wall; retained archival history, existing photo row and all existing sections.

## Order

**Status:** applied

**Before:** Order-type choices and live status only.

**After:** Added a three-shot real-food rail (burger, chicken sandwich, fried pickles) before the order choices. Order mechanics and menu remain untouched.

## Account

**Status:** applied

**Before:** Profile had preferred contact method, but no live marketing subscription control.

**After:** Added real email and SMS subscription status for the signed-in account. Email off changes the EmailSubscriber status to unsubscribed (same gate as unsubscribeEmail); email on uses subscribeEmail double opt-in. SMS off revokes marketing/proven marketing through shared upsertSmsConsent without clearing transactional consent; SMS on captures explicit disclosure with account source, preserves existing transactional consent and re-enables marketing. UI confirms saved state, shows pending email confirmation and errors.

## Pulse customer management and communication history

**Status:** approved, deferred

**Before:** No unified phone-number customer list or complete cross-channel communication ledger.

**After:** Deferred: requires a new protected admin screen, CommunicationLog schema, all outbound/inbound email/SMS/phone writers and bounded historical backfill to guarantee complete history; do not claim it exists. No checkout, ticket, menu, or core-setting code altered.

## Performance and verification

All ten supplied real-photo URLs returned HTTP 200. Hero uses eager loading and below-fold images use lazy loading and explicit dimensions; scroll reveals use IntersectionObserver, with reduced-motion styles. The supplied hanging-sign source is 6.7 MB and the award/sketch/chicken originals are 2–3 MB; no optimized derivatives were created in this slice. The existing public image URLs remain cacheable, but additional image optimization is needed to meet a strict slow-mobile bandwidth budget. Account status endpoint returned 200 for authenticated read and 400 for unknown action. Mutating a real user’s marketing consent was intentionally not performed during diagnostics.
