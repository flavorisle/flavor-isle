// Resolve a hometown to its city center only; never save a street-level location.
export async function geocodeHometown(city, region) {
  const query = `${city.trim()}, ${region.trim()}`;
  const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=5&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error('Location lookup is unavailable right now. Please try again later.');
  const matches = await response.json();
  const match = matches.find(item => {
    const a = item.address || {};
    return Boolean(a.city || a.town || a.village || a.hamlet || a.municipality) &&
      ['city', 'town', 'village', 'hamlet', 'municipality', 'administrative'].includes(item.type);
  });
  if (!match) throw new Error('Could not find that hometown. Try a city and its state, province, or country.');
  const a = match.address;
  return {
    city: (a.city || a.town || a.village || a.hamlet || a.municipality).slice(0, 100),
    region: (a.state || a.province || a.county || a.country).slice(0, 100),
    country: (a.country || '').slice(0, 100),
    latitude: Number(match.lat),
    longitude: Number(match.lon),
  };
}