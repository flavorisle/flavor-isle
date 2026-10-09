import { DAY_KEYS, DAY_LABELS } from '@/lib/businessHours';

// Structured-data builders shared by the homepage, the menu page and the
// global RestaurantSchema updater (issue #37, step 4). Hours always come from
// the live store settings entity — never hardcoded here.

// schema.org OpeningHoursSpecification entries from a business_hours map,
// grouping consecutive days that share the same hours and skipping days marked
// closed. Hours stay in 24h HH:MM, which is the schema format.
export function buildOpeningHoursSpecs(hours) {
  const specs = [];
  let group = null;
  DAY_KEYS.forEach((k) => {
    const d = hours?.[k];
    const closed = !d || d.closed || !d.open || !d.close;
    if (closed) {
      if (group) { specs.push(group); group = null; }
      return;
    }
    const key = `${d.open}-${d.close}`;
    if (group && group._key === key) {
      group.dayOfWeek.push(DAY_LABELS[k]);
    } else {
      if (group) specs.push(group);
      group = { _key: key, dayOfWeek: [DAY_LABELS[k]], opens: d.open, closes: d.close };
    }
  });
  if (group) specs.push(group);
  return specs.map(({ _key, ...rest }) => ({ '@type': 'OpeningHoursSpecification', ...rest }));
}

// The Restaurant node for the homepage. Identity values match the contact page
// and the static fallback block in index.html; openingHours is built from the
// live store hours passed in.
export function restaurantSchema(hours) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Restaurant',
    name: 'Flavor Isle',
    description: 'Family-owned burgers and shakes restaurant since 1964, just off I-65 Exit 38 in Smiths Grove, Kentucky.',
    image: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/1503a227d_IMG_0428.jpg',
    logo: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png',
    url: 'https://flavor-isle.com',
    menu: 'https://flavor-isle.com/menu',
    telephone: '+12705637230',
    priceRange: '$$',
    servesCuisine: ['Hamburgers', 'American', 'Burgers and Shakes Restaurant'],
    address: {
      '@type': 'PostalAddress',
      streetAddress: '103 N Main St',
      addressLocality: 'Smiths Grove',
      addressRegion: 'KY',
      postalCode: '42171',
      addressCountry: 'US',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 36.9195,
      longitude: -86.2081,
    },
    hasMap: 'https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171',
    openingHoursSpecification: buildOpeningHoursSpecs(hours),
  };
}

// The Menu node for the menu page: the sections and item names the page is
// showing right now, straight from the live menu data. Prices are omitted and
// photographs are included where the catalog has one. Nothing is hand-picked —
// whatever the live menu holds is what gets published.
export function menuSchema(rows, renames = {}) {
  const hasMenuSection = (rows || [])
    .filter((row) => (row.items || []).length > 0)
    .map((row) => ({
      '@type': 'MenuSection',
      name: renames[row.key] || row.key,
      hasMenuItem: row.items.map((item) => ({
        '@type': 'MenuItem',
        name: item.name,
        ...(item.image_url_opt || item.image_url ? { image: item.image_url_opt || item.image_url } : {}),
      })),
    }));

  return {
    '@context': 'https://schema.org',
    '@type': 'Menu',
    name: 'Flavor Isle Menu',
    url: 'https://flavor-isle.com/menu',
    hasMenuSection,
  };
}