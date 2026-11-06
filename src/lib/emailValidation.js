// Issue #159 — checkout email typo guard (browser copy).
// The backend copy lives at base44/shared/emailValidation.ts; the two carry the
// same rules and must be kept in step. Nothing here sends anything.

const PROVIDER_DOMAINS = [
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'hotmail.com', 'outlook.com',
  'live.com', 'msn.com', 'icloud.com', 'me.com', 'aol.com', 'comcast.net', 'att.net',
  'sbcglobal.net', 'bellsouth.net', 'verizon.net', 'protonmail.com', 'proton.me',
  'gmx.com', 'zoho.com', 'cox.net', 'charter.net', 'twc.com', 'mail.com',
];

// Endings that cannot receive mail. Every one of them is a typo of a real TLD.
const BLOCKED_TLDS = {
  clm: 'com', con: 'com', cim: 'com', xom: 'com', vom: 'com', ocm: 'com', cpm: 'com',
  comm: 'com', coom: 'com', cm: 'com', om: 'com', on: 'com', cpn: 'com',
};

// trim, lowercase, and strip any trailing '.', ',', ';' or whitespace.
export function normalizeEmail(raw) {
  let value = String(raw ?? '').trim().toLowerCase();
  while (/[.,;\s]$/.test(value)) value = value.slice(0, -1);
  return value;
}

function levenshtein(a, b) {
  if (a === b) return 0;
  // Distance can never be 1 when the lengths differ by more than one.
  if (Math.abs(a.length - b.length) > 1) return 2;
  const m = a.length;
  const n = b.length;
  let prev = [];
  for (let j = 0; j <= n; j++) prev[j] = j;
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}

export function analyzeEmail(raw) {
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