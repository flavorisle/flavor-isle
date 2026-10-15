# Restoration — public guest checkout (#111)

**Issue:** #111 — *Pre-plan #108: restore public guest checkout (remove login wall from /checkout)*
**Type:** live revenue outage fix, approved by Wesley
**Date:** 2026-10-14
**Files changed:** `src/App.jsx` — one file, nothing else.

---

## What was wrong

`/checkout` sat inside a `ProtectedRoute` that bounced a signed-out customer to `/login?returnTo=%2Fcheckout`. Website ordering is a guest flow (name, phone and email are collected on the checkout page itself, and the payment page is public), so the gate was a hard stop at the last step of every signed-out order.

## What was done, step by step

1. **Deleted the gated block** — the `{/* Food checkout needs an account … */}` comment together with its `ProtectedRoute` wrapper and the nested `<Route path="/checkout" …>` (was lines 243–247).
2. **Added the public route** — `<Route path="/checkout" element={<Checkout />} />` immediately after `<Route path="/order" element={<Order />} />` inside the `{/* Public — browse & order without an account */}` block. It now sits at line 227.
3. **Nothing else touched** — the `ProtectedRoute` wrappers for `/account` and `/admin/*` are unchanged, login/register/forgot/reset routes are unchanged, Find Smashie code is untouched, and no import line was added or removed (`ProtectedRoute` and `Navigate` are both still in use elsewhere, so the import block is byte-identical).

## The change, exactly as it landed

```diff
@@ -225,4 +225,5 @@ const AuthenticatedApp = () => {
       <Route path="/menu" element={<Menu />} />
       <Route path="/order" element={<Order />} />
+      <Route path="/checkout" element={<Checkout />} />
       <Route path="/product/:slug" element={<ProductDetail />} />
       <Route path="/combos" element={<Combos />} />
@@ -241,10 +242,4 @@ const AuthenticatedApp = () => {
       <Route path="/rewards" element={<Rewards />} />
 
-      {/* Food checkout needs an account — a signed-out customer is sent to sign in
-          and comes right back here, with their bag still saved. */}
-      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login?returnTo=%2Fcheckout" replace />} />}>
-        <Route path="/checkout" element={<Checkout />} />
-      </Route>
-
       {/* Login required to view account or admin tools */}
       <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
```

## Verification

- `npm run build` → **exit 0**, no errors or warnings.
- `grep -n 'path="/checkout"' src/App.jsx` → one match, line 227, inside the public block.
- `grep -c ProtectedRoute src/App.jsx` → 2 (the import and the `/account` + `/admin/*` gate), i.e. the remaining gate is intact and the import is still needed.
- `git status --porcelain` → only `M src/App.jsx`; no other file in the working tree changed.
- A signed-in customer's path is unchanged: the same `Checkout` page, same pricing, same secure payment step — only the route gate is gone.
- `grep -rn '%2Fcheckout' src/` → no matches, which is the marker used to read publish status below.

## Commit

- **Change commit hash:** assigned by the platform's two-way sync when the app is published — the previous change to this app landed the same way as `b9c4801` (*Restrict clue chip visibility on account and admin routes*), which is the HEAD this change was built and diffed against.
- **Exact content fingerprint (verifiable now):** `git hash-object src/App.jsx` → `82b8a76f5d7ccaec73fe8f5139335dc69f762138`. That hash identifies the precise file content of this fix, so the change can be confirmed against any commit without waiting for the sync to name it.
- Diff reviewed at commit level: two hunks only, exactly as shown above.

## Publish status

- Live (`flavor-isle.com`) is still serving the previous bundle: `assets/index-rx3bsYVc.js`, 1,053,432 bytes.
- That bundle still contains `returnTo=%2Fcheckout` (one occurrence) — the redirect target of the gate that was just deleted — while the current source tree contains that string nowhere at all. So live is confirmed **pre-fix**.
- Publishing is a builder action from the Publish control in the app editor. Once pressed, live serves the new bundle and the login wall is gone for guests; no code change remains pending after that.