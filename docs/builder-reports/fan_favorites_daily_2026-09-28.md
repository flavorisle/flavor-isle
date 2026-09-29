# Builder report: fan_favorites_daily_2026-09-28

## Refresh Fan Favorites schedule: weekly → daily (3 AM CT)

**Status:** applied  
**App entity:** BuilderReport `6abb369dec0ca02c1a1de716`

### Before

Workflow "Refresh Fan Favorites": description "Weekly refresh of the top 10 best-selling menu items (online + in-store) for the Fan Favorites rail on the Menu page."; trigger cron_expression "0 3 * * 1" (weekly, Monday 3 AM America/Chicago).

### After

Workflow "Refresh Fan Favorites": description "Daily refresh of the top 10 best-selling menu items (online + in-store) for the Fan Favorites rail on the Menu page."; trigger cron_expression "0 3 * * *" (daily 3 AM America/Chicago). Timezone (America/Chicago), schedule_mode (recurring), ends_type (never), trigger condition (null) and the refresh step / x-base44 labels left exactly as-is — the labels never mentioned weekly. Nothing else changed: refreshFanFavorites function code, FanFavoritesSection component, MenuItem entity, menu, and every other workflow untouched.
