# Builder report: a2p_full_remediation_2026-09-22

## A2P/TCPA SMS Consent Remediation (full)

**Status:** applied  
**App entity:** BuilderReport `6ab2fcf51b77f288968ba9c3`

### Before

Bundled SMS consent: single opt-in granted both transactional and marketing; legacy subscribers eligible for marketing broadcasts; order-status and ready-alert SMS sent from phone number alone; JOIN keyword auto-enrolled both categories; policy pages described consent as granted by providing a phone number.

### After

Split, independent, optional, unchecked transactional vs marketing consent across all capture surfaces. Marketing requires proven explicit consent; global STOP suppresses all sends; legacy 6 subscribers excluded from marketing until re-opt-in. Policies updated with split-consent language and absolute public URLs. Static verification only — no customer SMS sent, no test orders, no Twilio campaign changes, no publish.
