import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Flavor Isle — 103 N Main St, Smiths Grove, KY 42171
const STORE = { lat: 37.0532, lon: -86.2061 };

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

// Geocode a free-text address via OpenStreetMap Nominatim (no API key).
async function geocode(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=us&q=${encodeURIComponent(query)}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'FlavorIsle/1.0 (delivery quote; crave.flavor-isle.com)' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.[0] || null;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { address } = await req.json();
    if (!address || !String(address).trim()) {
      return Response.json({ ok: false, error: 'address is required' }, { status: 400 });
    }
    const query = String(address).trim();

    // Load pricing tiers from the menu settings (service role — guests order too).
    const settings = await base44.asServiceRole.entities.MenuSetting.list();
    const s = settings?.[0] || {};
    const tiers = (s.delivery_tiers || [])
      .filter((t) => t && Number(t.max_miles) > 0)
      .sort((a, b) => Number(a.max_miles) - Number(b.max_miles));
    const flatFee = Number(s.delivery_fee ?? 0);

    // Geocode — retry with a Kentucky hint when the bare address isn't found.
    let hit = await geocode(query);
    if (!hit && !/\b(ky|kentucky)\b/i.test(query)) {
      hit = await geocode(`${query}, Kentucky`);
    }
    if (!hit) {
      return Response.json({ ok: false, not_found: true });
    }

    const distanceMiles = +haversineMiles(
      STORE.lat, STORE.lon,
      parseFloat(hit.lat), parseFloat(hit.lon)
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