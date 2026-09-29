# Builder report: rewards_add_phone_flow_2026-09-20

## Rewards Add Phone → Account profile deep link

**Status:** approved  
**App entity:** BuilderReport `6ab0472ab6a36c65ce35007e`

### Before

Rewards.jsx 'Add Phone' button linked to /account (landed on the default 'orders' tab; user had to manually find Profile, open Edit, and locate the Phone field). Account.jsx always initialized tab to 'orders' via useState('orders') and editing to false, ignoring any URL param.

### After

Rewards.jsx 'Add Phone' button now links to /account?tab=profile. Account.jsx reads the ?tab= URL search param via useSearchParams, validates it against ['orders','track','rewards','payments','favorites','profile'] (unknown/missing falls back to 'orders'), and initializes tab state from it. When arriving via ?tab=profile, the profile tab opens with Edit Profile already active (editing=true) and the Phone input is auto-focused and scrolled into view so the user can start typing immediately. No other behavior, styling, copy, the logged-in rewards view, StarRewardsPanel onAddPhone handler, squareLoyalty backend function, or entity/data was changed. Rollback = revert src/pages/Rewards.jsx and src/pages/Account.jsx.
