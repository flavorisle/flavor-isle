// Server-side bridge to the Pulse staff app's publicCrewOnDuty function, so the
// browser never calls across apps. Never throws: any failure returns an empty crew
// and the website simply renders nothing.
//
// Pulse app: 6a0079b09d458a77c24ffba5 (pulse.flavor-isle.com)

const CANDIDATES = [
  'https://pulse.flavor-isle.com/functions/publicCrewOnDuty',
  'https://base44.app/api/apps/6a0079b09d458a77c24ffba5/functions/publicCrewOnDuty',
];

const OK_CACHE_MS = 5 * 60 * 1000;
const FAIL_CACHE_MS = 60 * 1000;

let cache: { at: number; ttl: number; payload: any } = { at: 0, ttl: 0, payload: null };

export default async function (req: Request): Promise<Response> {
  const now = Date.now();
  if (cache.payload && now - cache.at < cache.ttl) {
    return Response.json(cache.payload);
  }

  for (const url of CANDIDATES) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
      clearTimeout(timer);
      if (!res.ok) continue;
      const data = await res.json();
      if (!data || !Array.isArray(data.crew)) continue;
      const payload = {
        crew: data.crew.filter((p: any) => p && typeof p.first_name === 'string' && p.first_name.trim()),
        as_of: data.as_of || null,
      };
      cache = { at: now, ttl: OK_CACHE_MS, payload };
      return Response.json(payload);
    } catch {
      // try the next candidate
    }
  }

  const payload = { crew: [], as_of: null };
  cache = { at: now, ttl: FAIL_CACHE_MS, payload };
  return Response.json(payload);
}