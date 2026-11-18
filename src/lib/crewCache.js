import { base44 } from '@/api/base44Client';

// Shared cache for getCrewOnDuty so the home band and the order page header
// make one call between them, not two. The backend itself caches for 5 minutes;
// this keeps the browsers off it for 60 seconds at a time.
let _cached = null;
let _fetchPromise = null;
let _cachedAt = 0;
const TTL = 60 * 1000;
const MAX_AGE_MS = 10 * 60 * 1000;

function parse(data) {
  const crew = Array.isArray(data?.crew)
    ? data.crew.filter((p) => p && typeof p.first_name === 'string' && p.first_name.trim())
    : [];
  const asOf = data?.as_of ? new Date(data.as_of).getTime() : 0;
  const fresh = !!asOf && Date.now() - asOf <= MAX_AGE_MS;
  return { crew: fresh ? crew : [], asOf, fresh };
}

export async function fetchCrew({ force = false } = {}) {
  const now = Date.now();
  if (!force && _cached && now - _cachedAt < TTL) return _cached;
  if (_fetchPromise) return _fetchPromise;
  _fetchPromise = (async () => {
    try {
      const res = await base44.functions.invoke('getCrewOnDuty', {});
      const parsed = parse(res?.data || res);
      _cached = parsed;
      _cachedAt = Date.now();
      return parsed;
    } catch {
      const empty = { crew: [], asOf: 0, fresh: false };
      _cached = empty;
      _cachedAt = Date.now();
      return empty;
    } finally {
      _fetchPromise = null;
    }
  })();
  return _fetchPromise;
}

// "Caitlin", "Caitlin and Emily", "Caitlin, Emily and Jessica"
export function joinNames(crew) {
  const names = (crew || []).map((p) => p.first_name).filter(Boolean);
  if (names.length === 0) return '';
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}