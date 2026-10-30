# Issue #136 — Sign-in account check

Date: 2026-10-30
Scope: auth pages only (Login, Register, Account sign-in) + one new public backend function.

## What changed

- **New `checkAccountExists`** (`base44/functions/checkAccountExists/entry.ts`) — public, no auth.
  Accepts `{ email }`, validates it (missing → `400 {error:'email required'}`, bad shape →
  `400 {error:'invalid email'}`), lowercases/trims it, and returns **only**
  `{ exists: true|false }`. Per-IP limit of 20 requests / 60 s from the first
  `x-forwarded-for` hop (else `unknown`), over cap → `429 {error:'rate limited'}`; expired
  windows are pruned on every call. Catch-all → `500 {error:'lookup failed'}`. The email is
  never logged.
- **Login** — deterministic check runs before `loginViaEmailPassword`. `exists === false`
  shows the panel (heading / deleted-accounts body / primary "Create a new account" link to
  `/register?email=…` / "Use a different email"); `exists === true` + failed login now says
  "Incorrect password for that account."; `isAccountNotFoundError` kept as last-resort
  fallback. A check that itself fails falls through to the normal login attempt. Google
  button, divider, layout and `safeReturnTo()` redirect untouched.
- **Register** — prefills email from `?email=` (only that field) and blocks signup when the
  address already exists, with a "Log in" link. A failed check continues registration.
  OTP step, phone, birthday, `linkSquareCustomer` and the profile save untouched.
- **Account (GuestAuth, login mode)** — same pre-check and panel link; `exists === true` +
  failure → "Incorrect password for that account." Register mode untouched.
- **Deleted-accounts notice** — inline `bg-muted` / `text-muted-foreground` block above the
  form on Login and Register. `SiteNoticeBanner` and `MenuSetting.site_notice` not touched.

## Verification

1. **Build** — `npm run build` exit code **0**.
2. **Sign in with `not-a-real-test@example.com`** — `checkAccountExists` returned
   `{"exists": false}`, so the page stops before login and renders "No account found for
   that email." with both links. User count before: **102**, after: **102**; the test address
   is not present in the account list — no User record created.
3. **Existing account + wrong password** — existing account confirmed
   (`wesley@flavor-isle.com` → `{"exists": true}`); the failed-login branch with
   `exists === true` sets "Incorrect password for that account." (previously this email only
   ever produced the platform's generic "Invalid email or password").
4. **Existing account + right password** — the check returns `true` and the flow falls
   straight through to the unchanged `loginViaEmailPassword` + `window.location.href =
   safeReturnTo()`, so the returnTo redirect is untouched. (Needs a real password to click
   through; the code path is unchanged apart from the pre-check.)
5. **Register with an existing email** — check returns `{"exists": true}` for that address,
   so registration is blocked with "An account already exists for that email. Log in
   instead." and `auth.register` is never called. User count unchanged at **102**.
6. **Register with a brand-new email** — check returns `{"exists": false}` (verified with
   `not-a-real-test@example.com`), which is not `true`, so registration proceeds exactly as
   before: `register` → OTP screen → verify → profile save.
7. **Raw responses from `checkAccountExists`**
   - existing: `{"exists": true}`
   - unknown: `{"exists": false}`
   - invalid shape: `{"error": "invalid email"}` (400)
   - missing: `{"error": "email required"}` (400)
   No other field is ever returned.
8. **Files in the diff**
   - `base44/functions/checkAccountExists/entry.ts` (new)
   - `src/pages/Login.jsx`
   - `src/pages/Register.jsx`
   - `src/pages/Account.jsx`
   - `docs/builder-reports/signin_account_check_2026-10-30.md` (this report)

   `git status` shows exactly those. No menu, checkout, order, payment, Smashie, marketing or
   settings file was touched.

## Note on the old error text

A live failed login for the unknown test address returned `400 "Invalid email or password"` —
the platform does not distinguish a missing account from a bad password, which is why the
explicit existence check was needed.