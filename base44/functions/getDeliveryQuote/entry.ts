import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { getMenuSettingRecord } from '../../shared/storeState.ts';

// Flavor Isle — 103 N Main St, Smiths Grove, KY 42171
const STORE = { lat: 37.0532, lon: -86.2061 };
// Store coordinates verified against Google Maps (Smiths Grove, KY city center).

// Straight-line distance in miles between two lat/lon points.
function haversineMiles(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 3958.8; // Earth radius in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Primary geocoder: US Census Bureau — free, no key, house-number precision,
// and far better coverage of rural Kentucky roads than OpenStreetMap.
async function geocodeCensus(query) {
  const url = `https://geocoding.geo.census.gov/geocoder/locations/onelineaddress?address=${encodeURIComponent(query)}&benchmark=Public_AR_Current&format=json`;
  // The Census API occasionally hangs — cap it so we fall back fast.
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!res) return null;
  if (!res.ok) return null;
  const data = await res.json();
  const m = data?.result?.addressMatches?.[0];
  if (!m?.coordinates) return null;
  return { lat: m.coordinates.y, lon: m.coordinates.x };
}

// Fallback geocoder: OpenStreetMap Nominatim (handles landmarks/partial queries).
async function geocodeNominatim(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'FlavorIsle/1.0 (delivery quote; flavor-isle.com)' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data?.[0];
  if (!hit) return null;
  return { lat: parseFloat(hit.lat), lon: parseFloat(hit.lon) };
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { address } = await req.json();
    if (!address || !String(address).trim()) {
      return Response.json({ ok: false, error: 'address is required' }, { status: 400 });
    }
    const query = String(address).trim();

    // Load pricing tiers from the one pinned settings record (service role —
    // guests order too). Same record the website and Smashie's phone line read.
    const s = await getMenuSettingRecord(base44);
    const tiers = (s.delivery_tiers || [])
      .filter((t) => t && Number(t.max_miles) > 0)
      .sort((a, b) => Number(a.max_miles) - Number(b.max_miles));
    const flatFee = Number(s.delivery_fee ?? 0);

    // Geocode: Census first (exact street addresses), then Nominatim,
    // then Nominatim with a Kentucky hint.
    const withKy = /\b(ky|kentucky)\b/i.test(query) ? query : `${query}, KY`;
    let hit = await geocodeCensus(withKy);
    if (!hit) hit = await geocodeNominatim(query);
    if (!hit && withKy !== query) hit = await geocodeNominatim(withKy);
    if (!hit) {
      return Response.json({ ok: false, not_found: true });
    }

    const distanceMiles = +haversineMiles(
      STORE.lat, STORE.lon,
      hit.lat, hit.lon
    ).toFixed(1);

    // No tiers configured → fall back to the flat fee, no range limit.
    if (tiers.length === 0) {
      return Response.json({ ok: true, distance_miles: distanceMiles, fee: flatFee, out_of_range: false });
    }

    const tier = tiers.find((t) => distanceMiles <= Number(t.max_miles));
    if (!tier) {
      return Response.json({
        ok: true,
        distance_miles: distanceMiles,
        fee: null,
        out_of_range: true,
        max_miles: Number(tiers[tiers.length - 1].max_miles),
      });
    }

    return Response.json({
      ok: true,
      distance_miles: distanceMiles,
      fee: Number(tier.fee) || 0,
      out_of_range: false,
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}