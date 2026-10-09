# Builder report: phone_greeting_physical_hours_2026-09-21

## Smashie Phone Greeting — Physical Hours

**Status:** approved  
**App entity:** BuilderReport `6ab139bce16e3265568940a5`

### Before

twilioVoiceWebhook used getStoreStatus (8 AM online-ordering unlock) for both the greeting and mid-call status context, so at 9 AM on a 10:30-open day Smashie answered 'we're running smooth right now'. Greeting template 'we're ${storeStatus.message}' produced 'we're we open at 10:30 AM today'.

### After

Added getPhysicalStoreStatus in storeClosure.ts (admin closure + actual business_hours open/close, no 8 AM rule). twilioVoiceWebhook now imports & uses it for the greeting closedToday decision AND the mid-call statusContext. Greeting phrasing fixed: 'we open at...' → 'Just a heads up — we open at 10:30 AM today.'; other closed messages keep 'we're'. getStoreStatus untouched (website ordering status unchanged). Rollback: revert twilioVoiceWebhook import+2 call sites+greeting, remove getPhysicalStoreStatus from storeClosure.ts.
