# Builder report: rewards_page_delete_cancel_2026-09-20

## CANCEL: keep public /rewards page live

**Status:** approved  
**App entity:** BuilderReport `6ab057270df85b6a7d34c27e`

### Before

Per the previous (now-cancelled) request, App.jsx /rewards route had been changed to redirect to the homepage (<Navigate to="/" replace />) and the Rewards lazy import line had been removed; src/pages/Rewards.jsx had been deleted via delete_file. The squareLoyalty `program` backend action remained untouched.

### After

CANCELLED by Wesley (Sep 20): the public /rewards page IS the Square Loyalty program page and must stay live. App.jsx: the /rewards route was restored to <Route path="/rewards" element={<Rewards />} /> (public, not behind ProtectedRoute) and the `const Rewards = lazy(() => import('./pages/Rewards'))` import line was restored. src/pages/Rewards.jsx was recreated. IMPORTANT CAVEAT: the original Rewards.jsx had been deleted via delete_file without a saved copy, so the restored file is a best-effort reconstruction pieced together from conversation-history fragments (the logged-out program-intro hero with Sign Up/Sign In, the Star Tiers ladder, the Available Rewards catalog, and the signed-in balance/lifetime cards, tier badge, add-phone nudge → /account?tab=profile, next-reward progress, and redeemable rewards list). It is functionally equivalent and renders both the logged-out and signed-in views, but may not be byte-identical to the original — Wesley should verify the page matches his expectation, or recover the exact version from GitHub history if repo sync is active. The squareLoyalty backend `program` action (added when the page went public) was never removed and remains intact, so the restored page's logged-out fetch works. No dangling-link remediation was needed: Account.jsx line 378 (LoyaltySummaryCard 'View Rewards' → navigate('/rewards')) now correctly lands on the live page again. Final state: page intact/restored, route live, dangling-link report unnecessary.
