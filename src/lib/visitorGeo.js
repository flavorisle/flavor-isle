const KEY = 'fi_visitor_geo_v1';

function consentGranted() {
  try { return localStorage.getItem('flavor_isle_consent_v1') === 'granted'; } catch { return false; }
}

export async function visitorGeo() {
  try {
    const cached = sessionStorage.getItem(KEY);
    if (cached) return JSON.parse(cached);
  } catch {}

  let geo = {};

  try {
    const res = await fetch('/cdn-cgi/trace', { cache: 'no-store' });
    const text = await res.text();
    const ip = (text.match(/^ip=(.+)$/m) || [])[1];
    if (ip) geo.ip = ip.trim().slice(0, 45);
  } catch {}

  if (geo.ip && consentGranted()) {
    try {
      const res = await fetch(`https://ipwho.is/${encodeURIComponent(geo.ip)}`, { cache: 'no-store' });
      const data = await res.json();
      if (data && data.success !== false) {
        geo.city = String(data.city || '').slice(0, 80);
        geo.region = String(data.region || '').slice(0, 80);
        geo.country = String(data.country || '').slice(0, 80);
      }
    } catch {}
  }

  try { sessionStorage.setItem(KEY, JSON.stringify(geo)); } catch {}
  return geo;
}