# Builder report: public_rewards_page_2026-09-20

## Public Rewards page (logged-out view)

**Status:** approved  
**App entity:** BuilderReport `6ab04835b6a36c65ce350178`

### Before

App.jsx: /rewards route was inside the ProtectedRoute (login-required) group, so logged-out visitors who clicked /rewards were redirected to /login. Rewards.jsx: always fetched the auth-required 'status' action from squareLoyalty and rendered the full signed-in view (balance, tier badge, add-phone nudge, next-reward progress) — there was no logged-out fallback. squareLoyalty/entry.ts: only supported 'accrue' and the default 'status' action (which requires auth / customer lookup); no public program-definition endpoint existed.

### After

App.jsx: /rewards route moved from the ProtectedRoute (login-required) group into the public routes block (after /order-status); protected-group comment updated to 'Login required to view account or admin tools'. Rewards.jsx: added isAuthenticated from useAuth; useEffect now fetches the public 'program' action for logged-out visitors and 'status' for signed-in users (depends on isAuthenticated). A new logged-out early-return renders a program-intro hero ('Earn stars on every online order') with Sign Up (→/register) and Sign In (→/login) buttons, the full Star Tiers ladder (Starter 1×, Big Bite 2× @40, Big Flex 3× @70, Mega Flex 4× @120, Big Burger Energy 5× @150), and the Available Rewards catalog with star costs (or a 'Rewards list coming soon' note when empty) — no balance, tier badge, add-phone nudge, or next-reward progress. Signed-in users see the page exactly as before, including the add-phone nudge that now deep-links to /account?tab=profile. squareLoyalty/entry.ts: added a public 'program' action (no auth, no customer lookup) that returns programName, programStatus, earnText, and rewardTiers (id/name/points/description/scope) from getLoyaltyProgram + earnTextForProgram + describeRewardTier; on failure returns a partial payload (programName + empty rewardTiers) so the tier ladder still renders. No other behavior, sign-in/sign-up pages, star earn/redeem logic, Square settings, StarRewardsPanel, pricing/promo content, or entity/data changed. Rollback = revert src/App.jsx, src/pages/Rewards.jsx, and base44/functions/squareLoyalty/entry.ts.
