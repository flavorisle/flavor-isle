# Builder report: rewards_page_delete_2026-09-20

## Delete public /rewards page

**Status:** approved  
**App entity:** BuilderReport `6ab0565b0df85b6a7d34c14d`

### Before

App.jsx had a public /rewards route (<Route path="/rewards" element={<Rewards />} />) and a lazy import for src/pages/Rewards.jsx. The Rewards page component existed at src/pages/Rewards.jsx. Account.jsx line 378 wired the LoyaltySummaryCard 'View Rewards' button to navigate('/rewards').

### After

App.jsx: the public /rewards route was replaced with <Route path="/rewards" element={<Navigate to="/" replace />} /> so flavor-isle.com/rewards now 302-redirects to the homepage (cleaner UX than a 404 for anyone with a bookmark or a dangling link). The `const Rewards = lazy(() => import('./pages/Rewards'))` import line was removed. src/pages/Rewards.jsx was deleted entirely. No other page, component, entity, or backend function was touched. The account page Rewards tab (StarRewardsPanel), Loyalty/LoyaltyEmail entities, checkout enrollment logic, and the squareLoyalty `program`/`status` actions are all unchanged. Rollback = revert src/App.jsx (restore the route + import) and recreate src/pages/Rewards.jsx. Dangling /rewards links found (NOT modified — left for Wesley to decide): (1) src/pages/Account.jsx line 378 — LoyaltySummaryCard 'View Rewards' button: onOpenRewards={() => navigate('/rewards')}. After the redirect this now bounces to the homepage instead of the rewards page. NOTE: the homepage 'See How Rewards Work' buttons in WhyOrderDirect.jsx (line 81) and LoyaltyFirstOrderBanner.jsx (line 26) link to /account, NOT /rewards, so they are not dangling. No /rewards links were found in Footer, NavMenuPanel, BottomTabBar, Home, SignUpNudge, ConversionNudgeBar, CheckoutRewardsPanel, StickyOrderBar, or StarRewardsPanel.
