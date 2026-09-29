# Builder report: express_pickup_busyness_gate_2026-09-20

## Express Pickup strip busyness gate

**Status:** approved  
**App entity:** BuilderReport `6ab05204a4be276beb6357e7`

### Before

ExpressPickupStrip.jsx: only checked orderingEnabled from the cart context and rendered the strip whenever ordering was enabled, regardless of how busy the kitchen was — so the 'Ready in 10–15 mins' Express Pickup promise could show even when the kitchen was A Little Busy, Busy, or Slammed.

### After

ExpressPickupStrip.jsx: imports useLiveStatus (the existing 60s-polled busyness hook that powers the BusynessStatus bar). After the existing orderingEnabled check, a new gate returns null when the live busyness level is 'A Little Busy', 'Busy', or 'Slammed'. The strip still renders for 'Running Smooth' and — fail-open — when the level is null/loading/unknown/unavailable (e.g. fetch failed), so it never breaks or flickers and reappears within ~60s of the level dropping back to smooth. Existing content, copy ('Ready in 10–15 mins...'), and styling are unchanged. No other page, component, busyness backend, or entity/data touched. Rollback = revert src/components/ExpressPickupStrip.jsx.
