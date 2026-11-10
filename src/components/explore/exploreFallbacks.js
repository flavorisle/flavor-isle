// Smiths Grove stop data for the Visit Us / Exit 38 page (issue #153).
// Each section falls back to its approved hand-built cards until Admin →
// Explore Shops fills that section, so the page is never empty.

// Public media base for the Smiths Grove photos (issue #153).
const M = 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/';

// The poster order, stop 1 through 16 (issue #153). Wesley approved this exact
// sequence so the page can be read beside the printed walking map.
export const FALLBACK_SHOPS = [
  {
    tag: 'Landmark Building',
    name: 'The Roost',
    address: '131 N. Main Street',
    handles: [],
    photo: M + 'cd9fa76fa_roost-building.jpg',
    alt: 'The Roost storefront on Main Street in Smiths Grove, Kentucky',
    copy: 'The Main Street building. The shop inside it is 42171 & Co.',
    tile: 'photo',
  },
  {
    tag: 'Antiques & Boutique',
    name: '42171 & Co.',
    address: '131 N. Main Street',
    handles: [],
    photo: M + '9036d6038_roost-42171.jpg',
    alt: '42171 & Co. shop inside The Roost in Smiths Grove, Kentucky',
    copy: 'Antiques, boutique items, & much more!',
    tile: 'photo',
  },
  {
    tag: 'Antique & Vintage',
    name: 'Marigold Manor',
    address: '124 W. 1st Street',
    handles: ['marigold.manor'],
    photo: M + '1cc60ccc6_marigold-manor.jpg',
    alt: 'Marigold Manor in Smiths Grove, Kentucky',
    copy: 'Antique & vintage wares & cozy library.',
    tile: 'photo',
  },
  {
    tag: 'Quilts & Fabric',
    name: 'Psycho Granny’s Quilt Shop & More',
    address: '101 N. Main Street',
    handles: ['koblankenship'],
    photo: M + 'e1819dde1_psycho-granny.jpg',
    alt: 'Psycho Granny’s Quilt Shop in Smiths Grove, Kentucky',
    copy: 'Unique fabric & notions, original art & records too!',
    tile: 'photo',
  },
  {
    tag: 'Antiques',
    name: 'The Foxhole',
    address: '105 Main Street',
    handles: ['foxholeinthegrove'],
    photo: M + 'f625ae363_foxhole.jpg',
    alt: 'The Foxhole in Smiths Grove, Kentucky',
    copy: 'MCM/Vintage finds & sly designs.',
    tile: 'photo',
  },
  {
    tag: 'Boutique',
    name: 'Smalls on Main',
    address: '105 S. Main Street',
    handles: ['smallsonmain'],
    photo: M + '4efdf27f4_smalls-on-main.jpg',
    alt: 'Smalls on Main in Smiths Grove, Kentucky',
    copy: 'Mighty 80s, 90s & Y2K treasures.',
    tile: 'photo',
  },
  {
    tag: 'Vintage Clothing',
    name: 'Marigold Vintage',
    address: '127 S. Main Street',
    handles: ['marigoldvintage_ky'],
    photo: M + '130a7bd40_marigold-vintage.jpg',
    alt: 'Marigold Vintage in Smiths Grove, Kentucky',
    copy: 'Eclectic vintage mix from 1940s-Y2K.',
    tile: 'photo',
  },
  {
    tag: 'Mexican Food',
    name: 'Cinco de Mayo',
    address: '149 S. Main Street',
    handles: [],
    photo: null,
    alt: null,
    copy: 'Delicious Mexican food.',
    tile: 'monoRed',
  },
  {
    tag: 'Antiques & Garden',
    name: 'Boone’s Antiques & The Garden Patch',
    address: '204 N. Main Street',
    handles: [],
    photo: M + '9119609d4_boones-gardenpatch.jpg',
    alt: 'Boone’s Antiques & The Garden Patch in Smiths Grove, Kentucky',
    copy: 'Antiques, collectibles, plants, garden items.',
    tile: 'photo',
  },
  {
    tag: 'You are here',
    name: 'Flavor Isle',
    address: '103 N. Main St.',
    handles: ['flavor_isle'],
    photo: null,
    alt: null,
    copy: 'Burgers, shakes, cones... YUM.',
    tile: 'monoRed',
    cta: { to: '/menu', label: 'Order online' },
  },
  {
    tag: 'Coffee',
    name: 'Ace Coffee Indigo Fox',
    address: '114 E. 1st Street',
    handles: ['acecoffeecafe', 'indigofoxstylingstudio'],
    photo: M + '65b204ad6_ace-coffee-storefront.jpg',
    alt: 'Ace Coffee Indigo Fox in Smiths Grove, Kentucky',
    copy: 'Delicious drinks & curated meeting spot.',
    tile: 'photo',
  },
  {
    tag: 'Cards & Collectibles',
    name: 'KY Card Vault',
    address: '108 E. 1st Street',
    handles: ['kentuckycardvault'],
    photo: M + 'd0dbcdb70_kentucky-card-vault.jpg',
    alt: 'Kentucky Card Vault in Smiths Grove, Kentucky',
    copy: 'Trading & sports cards, memorabilia.',
    tile: 'photo',
  },
  {
    tag: 'Resale Clothing',
    name: 'Second Chances & Main Attractions',
    address: '115 E. 1st Street',
    handles: [],
    photo: null,
    alt: null,
    copy: 'Huge selection of clothing & more.',
    tile: 'mono',
  },
  // Wesley asked for this listing with no contact details at all — no address,
  // no phone, no Instagram, no maps link (issue #153).
  {
    tag: 'Home Cookin’',
    name: 'Grammie’s Home Cookin’',
    address: null,
    handles: [],
    photo: null,
    alt: null,
    copy: 'Where everyone has a seat at the table.',
    tile: 'monoRed',
  },
  {
    tag: 'Hardware',
    name: 'Superior Supply',
    address: '133 S. Main Street',
    handles: [],
    photo: M + '16b7ca316_superior-supply.jpg',
    alt: 'Superior Supply in Smiths Grove, Kentucky',
    copy: 'Hardware, small engine repair & nostalgia.',
    tile: 'photo',
  },
  {
    tag: 'Farm Fresh',
    name: 'Pelly’s Farm Fresh',
    address: null,
    handles: [],
    photo: M + 'c2781561c_pellys.jpg',
    alt: 'Pelly’s Farm Fresh in Smiths Grove, Kentucky',
    copy: 'Local produce, fresh goods, and farm-to-table flavors straight from Smiths Grove.',
    tile: 'photo',
  },
];

// The three out-of-town stops that anchor the Exit 38 trip (issue #153).
export const FALLBACK_SURROUNDING = [
  {
    tag: 'Corvette · Bowling Green',
    name: 'National Corvette Museum',
    photo: null,
    copy: 'Every Corvette in one building, including the sinkhole exhibit. Car clubs run down I-65 to us for lunch.',
    map: 'https://www.google.com/maps/search/?api=1&query=National+Corvette+Museum+Bowling+Green+KY',
    link: { to: '/corvette-car-clubs', label: 'Corvette club stop' },
    distance: '15 min south on I-65',
  },
  {
    id: 'bucees',
    tag: 'In Town · Exit 38',
    name: 'Buc-ee’s',
    photo: null,
    copy: 'Right here in Smiths Grove. 120 pumps, brisket, fudge, and the cleanest restrooms on I-65. We’re 0.7 miles on into town when you want a hot burger and a real milkshake.',
    map: 'https://www.google.com/maps/search/?api=1&query=Buc-ee%27s+Smiths+Grove+KY',
    link: { to: '/i65-exit-38', label: 'Exit 38 guide' },
    distance: 'Smiths Grove · 0.7 mi from our door',
  },
  {
    tag: 'National Park · Cave Country',
    name: 'Mammoth Cave National Park',
    photo: M + '0c2f8476d_mammoth-cave.jpg',
    copy: 'The longest cave system on earth, about 25 minutes up I-65. Book a cave tour, then come eat.',
    map: 'https://www.google.com/maps/search/?api=1&query=Mammoth+Cave+National+Park',
    link: { to: '/mammoth-cave-dining', label: 'Mammoth Cave dining' },
    distance: '25 min north on I-65',
  },
];

export const FALLBACK_FLAVOR = [
  {
    tag: 'Winery',
    name: 'Bluegrass Vineyard',
    address: null,
    photo: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/e3fe415dd_bluegrass-vineyard.jpg',
    alt: 'Bluegrass Vineyard in Smiths Grove, Kentucky',
    copy: 'Family-owned vineyard offering tastings, tours, and Kentucky-grown wines.',
    tile: 'photo',
  },
  {
    tag: 'Distillery',
    name: 'Balance Distilling Company',
    address: null,
    photo: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/ba5db0eda_balance-distilling.jpg',
    alt: 'Balance Distilling Company in Smiths Grove, Kentucky',
    copy: 'Family-owned distillery offering handcrafted spirits and tastings.',
    tile: 'photo',
  },
];

export const FALLBACK_ATTRACTIONS = [
  {
    tag: 'Park',
    name: 'Ed Spear Park',
    address: null,
    photo: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/501d3cc8a_ed-spear-park.jpg',
    alt: 'Ed Spear Park in Smiths Grove, Kentucky',
    copy: 'A community park with green space, playgrounds, and local events. Perfect for families and visitors.',
    tile: 'photo',
  },
  {
    tag: 'Motorsports',
    name: 'Ballance Racing',
    address: null,
    photo: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/30cd37e70_ballance-racing.jpg',
    alt: 'Ballance Racing in Smiths Grove, Kentucky',
    copy: 'Local motorsports hub, bringing speed, adrenaline, and racing culture to Smiths Grove.',
    tile: 'photo',
  },
  {
    tag: 'Heritage',
    name: 'Smiths Grove Historic District',
    address: null,
    photo: null,
    alt: null,
    copy: 'Explore preserved architecture and small-town heritage.',
    tile: 'stripe',
  },
];

export const FALLBACKS = {
  shops: FALLBACK_SHOPS,
  surrounding: FALLBACK_SURROUNDING,
  flavor: FALLBACK_FLAVOR,
  attractions: FALLBACK_ATTRACTIONS,
};

// One ExploreShop row, shaped exactly like the props a card already takes, with
// the panel's contact and walking fields carried alongside.
// A card's anchor when the record has no anchor_id typed in: the name, folded
// to something a URL and getElementById can both carry.
function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function mapShop(row) {
  const photo = row.photo_url || null;
  return {
    id: row.anchor_id || slugify(row.name) || undefined,
    tag: row.tag,
    amenities: Array.isArray(row.amenities) ? row.amenities : [],
    name: row.name,
    address: row.address || null,
    handles: Array.isArray(row.instagram) ? row.instagram : [],
    photo,
    alt: row.photo_alt || row.name,
    copy: row.copy || '',
    building: row.building || '',
    detail: row.detail || '',
    // A photo tile with no photo would render a broken image.
    tile: row.tile === 'photo' && !photo ? 'mono' : row.tile || 'photo',
    cta: row.cta_to ? { to: row.cta_to, label: row.cta_label } : undefined,
    link: row.link_to ? { to: row.link_to, label: row.link_label } : undefined,
    distance: row.distance || null,
    map: row.maps_query || null,
    hours: row.hours || '',
    phone: row.phone || '',
    website: row.website || '',
    interior_photo_url: row.interior_photo_url || '',
    interior_photo_alt: row.interior_photo_alt || '',
    interior_caption: row.interior_caption || '',
    lat: row.lat,
    lng: row.lng,
    walk_miles: row.walk_miles,
    walk_minutes: row.walk_minutes,
    walk_steps: Array.isArray(row.walk_steps) ? row.walk_steps : [],
    walk_polyline: row.walk_polyline || '',
  };
}