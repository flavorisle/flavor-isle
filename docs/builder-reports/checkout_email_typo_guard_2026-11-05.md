# Checkout email typo guard — issue #159 (parts 1–3)

**Approved by:** Wesley, Nov 5 2026 8:49 PM CT — *"Approved with phone read back."*
**Issue:** GitHub #159
**Build:** `npm run build` → exit 0
**Scope:** the typo guard only. No customer was emailed, nothing runs on a schedule, no test orders, no change to menu, pricing, loyalty, kitchen tickets or any other page. Parts 4–5 (the rest of #159) are a later dispatch.

## Why

Order #871625 (Braxton Whitney) was placed with `whitneyb510@gmail.clm`. Five order emails bounced and the status text failed, so the customer heard nothing at all. Across the last 600 outbound emails there were 27 bounces, 10 of them pure domain typos: `gmail.clm`, `gmail.con` ×2, `yahoo.con`, `icloud.cim`, `hotmail.xom`. The only check was `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` in `src/pages/Checkout.jsx`, and the order-creating functions stored whatever they received.

## Files

| File | Part | Change |
|---|---|---|
| `base44/shared/emailValidation.ts` | 1 | New. `normalizeEmail` + `analyzeEmail`, inline Levenshtein, no dependency. |
| `src/lib/emailValidation.js` | 2 | New. Browser copy of the same rules — the frontend cannot import `base44/shared/`. |
| `src/pages/Checkout.jsx` | 2 | Replaced the bare regex with `analyzeEmail`; blocked endings block, domain typos hint + "Use …" button. |
| `base44/functions/createSquareWebCheckout/entry.ts` | 3 | Guard before anything is created; 400 on `blocked_typo_tld`; stores normalized. |
| `base44/functions/createSquareOrder/entry.ts` | 3 | Same guard before the Square order is built; normalized `rawEmail`. |
| `base44/functions/logPhoneOrder/entry.ts` | 3 | Local `emailOk` regex replaced by `analyzeEmail`; unusable address stored empty, suggestion read back. |
| `base44/functions/subscribeEmail/entry.ts` | 3 | Stores normalized; refuses `blocked_typo_tld` / `malformed` with the suggestion named. |

## Rule set, verified

```
"whitneyb510@gmail.clm" -> blocked_typo_tld, suggestion whitneyb510@gmail.com
"a@gmail.con"           -> blocked_typo_tld, suggestion a@gmail.com
"c@icloud.cim"          -> blocked_typo_tld, suggestion c@icloud.com
"d@hotmail.xom"         -> blocked_typo_tld, suggestion d@hotmail.com
"e@gmai.com"            -> suggest_domain  (ok true), suggestion e@gmail.com
"i@outlok.com"          -> suggest_domain  (ok true), suggestion i@outlook.com
"f@flavorisle.com"      -> ok
"bad@@x.com"            -> malformed
".a@b.com"              -> malformed
"x..y@b.com"            -> malformed
" h@publix.co.uk ,"     -> ok, normalized h@publix.co.uk
""                      -> malformed
```

## `base44/shared/emailValidation.ts` — final, in full

```ts
// Issue #159 — checkout email typo guard (shared backend copy).
// Mirrored for the browser at src/lib/emailValidation.js; keep the two in step.
// No customer is emailed by anything here: it only inspects an address.

const PROVIDER_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'hotmail.com', 'outlook.com',
  'live.com', 'msn.com', 'icloud.com', 'me.com', 'aol.com', 'comcast.net', 'att.net',
  'sbcglobal.net', 'bellsouth.net', 'verizon.net', 'protonmail.com', 'proton.me',
  'gmx.com', 'zoho.com', 'cox.net', 'charter.net', 'twc.com', 'mail.com',
];

// Endings that cannot receive mail. Every one of them is a typo of a real TLD,
// so nothing is ever sent to them — the address is corrected instead.
const BLOCKED_TLDS: Record<string, string> = {
  clm: 'com', con: 'com', cim: 'com', xom: 'com', vom: 'com', ocm: 'com', cpm: 'com',
  comm: 'com', coom: 'com', cm: 'com', om: 'com', on: 'com', cpn: 'com',
};

export type EmailCode = 'ok' | 'blocked_typo_tld' | 'suggest_domain' | 'malformed';

export interface EmailAnalysis {
  ok: boolean;
  normalized: string;
  code: EmailCode;
  suggestion: string | null;
  suggestion_domain: string | null;
}

// trim, lowercase, and strip any trailing '.', ',', ';' or whitespace.
export function normalizeEmail(raw: string): string {
  let value = String(raw ?? '').trim().toLowerCase();
  while (/[.,;\s]$/.test(value)) value = value.slice(0, -1);
  return value;
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  // Distance can never be 1 when the lengths differ by more than one.
  if (Math.abs(a.length - b.length) > 1) return 2;
  const m = a.length;
  const n = b.length;
  let prev: number[] = [];
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const cur: number[] = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

export function analyzeEmail(raw: string): EmailAnalysis {
  const normalized = normalizeEmail(raw);
  const match = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.exec(normalized);
  const localPart = match ? normalized.slice(0, normalized.lastIndexOf('@')) : '';
  const localOk = !!match && !localPart.startsWith('.') && !localPart.endsWith('.') && !localPart.includes('..');

  if (!match || !localOk) {
    return { ok: false, normalized, code: 'malformed', suggestion: null, suggestion_domain: null };
  }

  const domain = normalized.slice(normalized.lastIndexOf('@') + 1);
  const dot = domain.lastIndexOf('.');
  const domainBase = domain.slice(0, dot);
  const tld = domain.slice(dot + 1);

  const realTld = BLOCKED_TLDS[tld];
  if (realTld) {
    const suggestionDomain = `${domainBase}.${realTld}`;
    return {
      ok: false,
      normalized,
      code: 'blocked_typo_tld',
      suggestion: `${localPart}@${suggestionDomain}`,
      suggestion_domain: suggestionDomain,
    };
  }

  if (!PROVIDER_DOMAINS.includes(domain)) {
    const near = PROVIDER_DOMAINS.find((p) => levenshtein(domain, p) === 1);
    if (near) {
      return {
        ok: true,
        normalized,
        code: 'suggest_domain',
        suggestion: `${localPart}@${near}`,
        suggestion_domain: near,
      };
    }
  }

  return { ok: true, normalized, code: 'ok', suggestion: null, suggestion_domain: null };
}
```

## Exact diff hunks

### `src/pages/Checkout.jsx`

```diff
@@ -24,4 +24,5 @@ import { trackBeginCheckout, foodItemToGa4 } from '@/lib/ga4Ecommerce';
 import { getActiveReferralCode } from '@/lib/referral';
+import { analyzeEmail } from '@/lib/emailValidation';
 import OrderAlertsOptIn from '@/components/OrderAlertsOptIn';
@@ -76,4 +77,7 @@ export default function Checkout() {
   const [fieldErrors, setFieldErrors] = useState({});
+  // Issue #159 — email typo guard: a domain typo is offered as a one-tap fix, and
+  // an ending that cannot receive mail blocks the order.
+  const emailCheck = useMemo(() => analyzeEmail(form.email), [form.email]);
   const [savedAddress, setSavedAddress] = useState(false);
@@ -269,5 +273,6 @@ export default function Checkout() {
     if (!form.email.trim()) errors.email = 'Your email is required.';
-    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) errors.email = 'Enter a valid email address.';
+    else if (emailCheck.code === 'blocked_typo_tld') errors.email = `That email ending can't receive mail. Did you mean ${emailCheck.suggestion}?`;
+    else if (emailCheck.code === 'malformed') errors.email = 'Enter a valid email address.';
@@ email input (unchanged above, hint added below it)
                       {fieldErrors.email && <p className="text-xs text-destructive mt-1">{fieldErrors.email}</p>}
+                      {emailCheck.suggestion && (emailCheck.code === 'suggest_domain' || emailCheck.code === 'blocked_typo_tld') && (
+                        <p className={`text-xs mt-1 ${emailCheck.code === 'blocked_typo_tld' ? 'text-destructive' : 'text-muted-foreground'}`}>
+                          Did you mean {emailCheck.suggestion}?{' '}
+                          <button
+                            type="button"
+                            onClick={() => {
+                              setForm(prev => ({ ...prev, email: emailCheck.suggestion }));
+                              setFieldErrors(prev => { const n = { ...prev }; delete n.email; return n; });
+                            }}
+                            className="underline font-semibold"
+                          >
+                            Use {emailCheck.suggestion}
+                          </button>
+                        </p>
+                      )}
                     </div>
```

### `base44/functions/createSquareWebCheckout/entry.ts`

```diff
@@ -6,4 +6,5 @@ import { findBlock } from '../../shared/blockedContacts.ts';
 import { customerLinkFields } from '../../shared/customerLink.ts';
+import { analyzeEmail } from '../../shared/emailValidation.ts';
@@ -28,4 +29,13 @@ export default async function (req: Request) {
     }
 
+    // Issue #159 — checkout email typo guard. An ending that cannot receive mail
+    // (gmail.clm, yahoo.con …) is refused before anything is created, so no Square
+    // order and no Order record is ever made with it. Everything else is stored
+    // normalized.
+    const emailCheck = analyzeEmail(customer?.email);
+    if (emailCheck.code === 'blocked_typo_tld') {
+      return Response.json({ error: `That email ending can't receive mail. Please use ${emailCheck.suggestion}.` }, { status: 400 });
+    }
+
     // Blocked customers cannot complete an online checkout.
@@ -122,5 +132,5 @@ export default async function (req: Request) {
         customer_name: customer.name,
-        customer_email: customer.email,
+        customer_email: emailCheck.normalized,
         customer_phone: customer.phone || '',
```

### `base44/functions/createSquareOrder/entry.ts`

```diff
@@ -2,4 +2,5 @@ import { isInternalCaller } from '../../shared/internalRelay.ts';
+import { normalizeEmail, analyzeEmail } from '../../shared/emailValidation.ts';
@@ -21,4 +22,12 @@ export default async function(req) {
     const { items, orderType, orderNumber, orderId, customer, ... } = body;
+
+    // Issue #159 — same typo guard as the web checkout. Nothing is created or
+    // pushed to Square with an address whose ending cannot receive mail.
+    const emailCheck = analyzeEmail(customer?.email);
+    if (emailCheck.code === 'blocked_typo_tld') {
+      return Response.json({ error: `That email ending can't receive mail. Please use ${emailCheck.suggestion}.` }, { status: 400 });
+    }
+
     const storedOrder = orderId ? await base44.asServiceRole.entities.Order.get(orderId) : null;
@@ -103,5 +112,5 @@ export default async function(req) {
-    const rawEmail = (customer.email || '').toLowerCase().trim();
+    const rawEmail = normalizeEmail(customer.email || '');
```

### `base44/functions/logPhoneOrder/entry.ts`

```diff
@@ -12,4 +12,5 @@ import { withTimeout } from '../../shared/withTimeout.ts';
+import { analyzeEmail } from '../../shared/emailValidation.ts';
@@ -111,5 +112,15 @@ export default async function(req) {
-    const emailOk = !!customer_email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer_email);
+    // Issue #159 — email typo guard. An address whose ending cannot receive mail
+    // (or that is malformed) is never stored; when the guard has a fix, the
+    // suggestion travels back in the response so Smashie can read it aloud.
+    const emailCheck = analyzeEmail(customer_email);
+    const emailOk = emailCheck.ok;
+    const emailNote = !emailOk && customer_email
+      ? (emailCheck.suggestion
+        ? `The customer's email can't receive mail — they may have meant ${emailCheck.suggestion}. Read it back and confirm it before placing another order.`
+        : `The customer's email did not look right, so no email is on this order. Read it back and confirm it.`)
+      : '';
+    if (emailNote) console.warn(`logPhoneOrder: unusable customer email for ${customer_phone}: ${customer_email} (${emailCheck.code}${emailCheck.suggestion ? `, suggestion ${emailCheck.suggestion}` : ''})`);
@@ -175,5 +186,5 @@ export default async function(req) {
-    const orderEmail = emailOk ? customer_email : '';
+    const orderEmail = emailOk ? emailCheck.normalized : '';
@@ -399,5 +410,5 @@ export default async function(req) {
-    return Response.json({
+    const responseBody = ({
       success: true,
       order_number: orderNumber,
@@ -421,4 +432,8 @@ export default async function(req) {
       payment_provider: paymentProvider,
     });
+    // Issue #159 — the guard's suggestion rides on the message so Smashie reads the
+    // correction back to the caller instead of repeating an address that bounces.
+    if (emailNote) responseBody.message = `${responseBody.message} ${emailNote}`;
+    return Response.json(responseBody);
```

### `base44/functions/subscribeEmail/entry.ts`

```diff
@@ -2,4 +2,5 @@ import { brandedEmailHtml } from '../../shared/sendOrderEmails.ts';
+import { analyzeEmail } from '../../shared/emailValidation.ts';
@@ -11,6 +12,4 @@ const APP_BASE = '******';
-function normalizeEmail(e) { return (e || '').toLowerCase().trim(); }
-function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
 function newToken() { return crypto.randomUUID() + Math.random().toString(36).slice(2); }
@@ -36,7 +35,16 @@ export default async function (req: Request): Promise<Response> {
-    const email = normalizeEmail(body?.email);
+    // Issue #159 — the address is stored normalized, and one whose ending cannot
+    // receive mail (gmail.clm, yahoo.con …) is refused with the fix named.
+    const emailCheck = analyzeEmail(body?.email);
+    const email = emailCheck.normalized;
     const source = body?.source || 'footer';
-    if (!isValidEmail(email)) return Response.json({ error: 'A valid email address is required.' }, { status: 400 });
+    if (emailCheck.code === 'malformed' || emailCheck.code === 'blocked_typo_tld') {
+      return Response.json({
+        error: emailCheck.suggestion
+          ? `That email ending can't receive mail. Please use ${emailCheck.suggestion}.`
+          : 'A valid email address is required.',
+      }, { status: 400 });
+    }
```

## Notes and decisions

- **Two copies of the rules, on purpose.** `base44/shared/` is backend-only; the checkout page is browser code and cannot import it. `src/lib/emailValidation.js` carries the identical rule set and both files name each other in their header so they move together.
- **`createSquareOrder` has no `Order.create`** — the order already exists; the function claims it and builds the Square order. The guard therefore sits immediately after the payload is destructured, before the atomic claim, so a refused address leaves no claim behind and nothing is created in Square.
- **`suggest_domain` never blocks.** `e@gmai.com` is a legal address and the customer may genuinely own it; the checkout only offers the fix.
- **Phone orders keep the empty-email behaviour.** `logPhoneOrder` stores `''` for a blocked or malformed address (as it already did for an unusable one) and appends the suggestion sentence to `message`, which is what Smashie reads back.
- `emailOk` in `logPhoneOrder` is now `analyzeEmail(...).ok`, so an empty email still means "no email" and every downstream `emailOk` use is unchanged.