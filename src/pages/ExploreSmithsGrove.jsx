import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import RestroomIcon from '@/components/explore/RestroomIcon';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import { base44 } from '@/api/base44Client';
import ShopDetailDialog from '@/components/explore/ShopDetailDialog';

// Public media base for the Smiths Grove photos (issue #153).
const M = 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/';

// The poster order, stop 1 through 16 (issue #153). Wesley approved this exact
// sequence so the page can be read beside the printed walking map.
const FALLBACK_SHOPS = [
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
const FALLBACK_SURROUNDING = [
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

const FALLBACK_FLAVOR = [
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

const FALLBACK_ATTRACTIONS = [
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

// Each section falls back to its approved hand-built cards until Admin →
// Explore Shops fills that section, so the page is never empty.
const FALLBACKS = {
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

// Same 88px offset the deep-link handler uses, so a link lands where a hash would.
function scrollToStop(id) {
  if (!id) return;
  const target = document.getElementById(id);
  if (target) {
    window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - 88), behavior: 'smooth' });
  }
}

function mapShop(row) {
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

function StopCard({ stop, onOpen }) {
  return (
    <article
      id={stop.id}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(stop)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(stop);
        }
      }}
      className="cursor-pointer scroll-mt-24 bg-white border border-[rgba(0,51,102,.12)] rounded-xl overflow-hidden flex flex-col shadow-[0_2px_0_rgba(0,51,102,.05)] transition-transform duration-150 hover:-translate-y-[3px] hover:shadow-[0_12px_24px_rgba(0,51,102,.12)]">
      {stop.tile === 'photo' && (
        <div className="aspect-[4/3] bg-[#F5E9D2] overflow-hidden">
          <img src={stop.photo} alt={stop.alt} loading="lazy" className="w-full h-full object-cover" />
        </div>
      )}
      {stop.tile === 'mono' && (
        <div className="aspect-[4/3] flex items-center justify-center bg-[radial-gradient(120%_120%_at_30%_20%,#0a3d70_0%,#003366_55%,#002244_100%)]">
          <span className="font-heading text-[30px] leading-[.95] tracking-[.06em] text-[#F2A22B] text-center px-4">{stop.name}</span>
        </div>
      )}
      {stop.tile === 'monoRed' && (
        <div className="aspect-[4/3] flex items-center justify-center bg-[radial-gradient(120%_120%_at_30%_20%,#c93a10_0%,#CC3300_55%,#8f2400_100%)]">
          <span className="font-heading text-[30px] leading-[.95] tracking-[.06em] text-white text-center px-4">{stop.name}</span>
        </div>
      )}
      {stop.tile === 'stripe' && (
        <div className="aspect-[4/3] flex items-center justify-center bg-[repeating-linear-gradient(135deg,#003366,#003366_12px,#0a3d70_12px,#0a3d70_24px)]">
          <span className="font-heading text-[26px] tracking-[.06em] text-white/90 text-center px-[18px]">{stop.name}</span>
        </div>
      )}
      <div className="p-[18px_18px_20px] flex flex-col gap-2 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-block w-max text-[10.5px] font-black tracking-[.14em] uppercase text-obsidian-roast bg-[rgba(242,162,43,.24)] rounded-full px-[10px] py-[3px]">{stop.tag}</span>
          {(stop.amenities || []).map((a) => (
            <span key={a} className="inline-flex items-center gap-1 w-max text-[10.5px] font-black tracking-[.14em] uppercase text-obsidian-roast bg-white border border-[rgba(0,51,102,.22)] rounded-full px-[9px] py-[3px]">
              {a === 'Restroom' && <RestroomIcon size={12} strokeWidth={2.6} aria-hidden="true" />}
              {a}
            </span>
          ))}
        </div>
        <h3 className="font-heading text-[26px] tracking-[.02em] leading-[1.05] text-obsidian-roast m-0">{stop.name}</h3>
        <p className="m-0 text-[14.5px] font-semibold text-[#41556a] flex-1">{stop.copy}</p>
        {stop.tenants && stop.tenants.length > 0 && (
          <p className="m-0 text-[11.5px] font-black tracking-[.08em] uppercase text-[#6a7f93]">
            Shops inside:{' '}
            {stop.tenants.map((tenant, index) => (
              <span key={tenant.id || tenant.name}>
                {index > 0 && ' \u00b7 '}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToStop(tenant.id);
                  }}
                  onKeyDown={(e) => e.stopPropagation()}
                  className="font-black tracking-[.08em] uppercase text-midnight-cherry hover:text-obsidian-roast underline decoration-1 underline-offset-2"
                >
                  {tenant.name}
                </button>
              </span>
            ))}
          </p>
        )}
        {stop.building_name && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              scrollToStop(stop.building_id);
            }}
            onKeyDown={(e) => e.stopPropagation()}
            className="w-max text-[11.5px] font-black tracking-[.08em] uppercase text-midnight-cherry hover:text-obsidian-roast pt-0.5"
          >
            Inside {stop.building_name}
          </button>
        )}
        {stop.handles && stop.handles.length > 0 && (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {stop.handles.map((handle) => (
              <a
                key={handle}
                href={`https://www.instagram.com/${handle}/`}
                target="_blank"
                rel="noopener"
                onClick={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                className="text-[11.5px] font-black tracking-[.06em] text-[#6a7f93] hover:text-midnight-cherry"
              >
                @{handle}
              </a>
            ))}
          </div>
        )}
        {stop.address && (
          <a
            className="block text-[11.5px] font-black tracking-[.08em] uppercase text-[#6a7f93] hover:text-midnight-cherry pt-0.5"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address + ' Smiths Grove KY 42171')}`}
            target="_blank"
            rel="noopener"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
          >
            {stop.address}
          </a>
        )}
        {stop.cta && (
          <Link
            to={stop.cta.to}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            className="inline-block w-max mt-1 bg-midnight-cherry text-white font-extrabold tracking-[.06em] uppercase text-[12px] px-4 py-2 rounded-md hover:bg-[#a82a00]"
          >
            {stop.cta.label}
          </Link>
        )}
      </div>
    </article>
  );
}

function SurroundCard({ stop, onOpen }) {
  return (
    <article
      id={stop.id}
      role="button"
      tabIndex={0}
      onClick={() => onOpen(stop)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(stop);
        }
      }}
      className="cursor-pointer scroll-mt-24 bg-white border border-[rgba(0,51,102,.12)] rounded-xl overflow-hidden flex flex-col shadow-[0_2px_0_rgba(0,51,102,.05)] transition-transform duration-150 hover:-translate-y-[3px] hover:shadow-[0_12px_24px_rgba(0,51,102,.12)]"
    >
      {stop.photo ? (
        <div className="aspect-[4/3] bg-[#F5E9D2] overflow-hidden">
          <img src={stop.photo} alt={stop.name} loading="lazy" className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="aspect-[4/3] flex items-center justify-center bg-[radial-gradient(120%_120%_at_30%_20%,#0a3d70_0%,#003366_55%,#002244_100%)]">
          <span className="font-heading text-[30px] leading-[.95] tracking-[.06em] text-[#F2A22B] text-center px-4">{stop.name}</span>
        </div>
      )}
      <div className="p-[18px_18px_20px] flex flex-col gap-2 flex-1">
        <span className="inline-block w-max text-[10.5px] font-black tracking-[.14em] uppercase text-obsidian-roast bg-[rgba(242,162,43,.24)] rounded-full px-[10px] py-[3px]">{stop.tag}</span>
        <h3 className="font-heading text-[26px] tracking-[.02em] leading-[1.05] text-obsidian-roast m-0">{stop.name}</h3>
        <p className="m-0 text-[14.5px] font-semibold text-[#41556a] flex-1">{stop.copy}</p>
        {stop.distance && (
          <p className="m-0 text-[11.5px] font-black tracking-[.08em] uppercase text-[#6a7f93]">{stop.distance}</p>
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 pt-1">
          {stop.link && (
            <Link
              to={stop.link.to}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="text-[11.5px] font-black tracking-[.08em] uppercase text-midnight-cherry hover:text-obsidian-roast"
            >
              {stop.link.label}
            </Link>
          )}
          {stop.map && (
            <a
              href={stop.map}
              target="_blank"
              rel="noopener"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              className="text-[11.5px] font-black tracking-[.08em] uppercase text-[#6a7f93] hover:text-midnight-cherry"
            >
              Map
            </a>
          )}
        </div>
      </div>
    </article>
  );
}

export default function ExploreSmithsGrove() {
  // Live rows from Admin → Explore Shops, grouped by section. A section with no
  // rows yet keeps its approved fallback cards, and any fetch failure leaves the
  // whole page exactly as it shipped.
  const [stops, setStops] = useState(FALLBACKS);
  const [activeStop, setActiveStop] = useState(null);

  useEffect(() => {
    let live = true;
    base44.entities.ExploreShop.list('sort_order')
      .then((rows) => {
        if (!live) return;
        const grouped = { shops: [], surrounding: [], flavor: [], attractions: [] };
        (rows || []).forEach((row) => {
          if (!row || row.is_active === false || !grouped[row.section]) return;
          grouped[row.section].push(mapShop(row));
        });
        // A shop that names its building gets the building's anchor and address,
        // and the building card collects its shops. Matched by name inside the
        // shops section, so a wrong name simply links nothing.
        const byName = {};
        grouped.shops.forEach((shop) => {
          if (shop.name) byName[shop.name.trim().toLowerCase()] = shop;
        });
        grouped.shops.forEach((shop) => {
          const home = shop.building ? byName[shop.building.trim().toLowerCase()] : null;
          if (!home || home === shop) return;
          shop.building_id = home.id;
          shop.building_name = home.name;
          shop.building_address = home.address || '';
          home.tenants = (home.tenants || []).concat([{ id: shop.id, name: shop.name }]);
        });
        setStops({
          shops: grouped.shops.length ? grouped.shops : FALLBACK_SHOPS,
          surrounding: grouped.surrounding.length ? grouped.surrounding : FALLBACK_SURROUNDING,
          flavor: grouped.flavor.length ? grouped.flavor : FALLBACK_FLAVOR,
          attractions: grouped.attractions.length ? grouped.attractions : FALLBACK_ATTRACTIONS,
        });
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  // The router scrolls to the hash before this lazily-mounted page exists, so
  // deep links like /explore-smiths-grove#bucees need a second, patient pass.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    if (!hash) return;
    let tries = 0;
    let timer;
    const attempt = () => {
      const target = document.getElementById(hash);
      if (target) {
        window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - 88), behavior: 'smooth' });
        return;
      }
      if (tries < 40) {
        tries += 1;
        timer = setTimeout(attempt, 50);
      }
    };
    attempt();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div>
      <Navbar />
      <Seo
        title="Explore Smiths Grove | Shops, Coffee & Attractions off I-65 Exit 38"
        description="A walkable block of antique shops, a coffee bar, a winery and a distillery in Smiths Grove, plus the National Corvette Museum and Mammoth Cave a short drive away. Minutes from Flavor Isle at Exit 38."
        path="/explore-smiths-grove"
      />

      {/* Hero */}
      <div className="bg-[linear-gradient(180deg,#fffdf7_0%,#F5E9D2_100%)] border-b border-[rgba(0,51,102,.10)]">
        <div className="max-w-[1180px] mx-auto px-5 pt-14 pb-11 text-center">
          <p className="text-xs font-extrabold tracking-[.22em] uppercase text-midnight-cherry mb-3">
            Smiths Grove, Kentucky · Exit 38 off I-65
          </p>
          <h1 className="font-heading text-[clamp(40px,7vw,78px)] leading-[.94] tracking-[.01em] text-obsidian-roast mb-2">
            Explore Smiths Grove <span className="text-midnight-cherry">Beyond the Burger</span>
          </h1>
          <p className="font-heading text-[clamp(20px,3vw,30px)] tracking-[.04em] text-midnight-cherry mb-[22px]">
            Hot food. Cold flex. Small dining room with big burger energy.
          </p>
          <p className="max-w-[820px] mx-auto text-base font-semibold text-[#26405a]">
            Flavor Isle is more than a meal. It’s a starting point. After you eat, take a stroll through Smiths Grove and discover the small businesses, local gems, and attractions that make our town one of a kind.{' '}
            <strong className="font-black text-obsidian-roast">They’re not like us, but together we make Smiths Grove unforgettable.</strong>
          </p>
          <div className="mt-7 flex gap-3 justify-center flex-wrap">
            <Link
              to="/menu"
              className="inline-block bg-midnight-cherry text-white font-extrabold tracking-[.06em] uppercase text-[13px] px-5 py-3 rounded-md hover:bg-[#a82a00]"
            >
              Order Online
            </Link>
            <a
              href="#shops"
              className="inline-block bg-transparent text-obsidian-roast border-2 border-obsidian-roast font-extrabold tracking-[.06em] uppercase text-[13px] px-5 py-3 rounded-md hover:bg-obsidian-roast hover:text-white"
            >
              See the Stops
            </a>
          </div>
        </div>
      </div>

      {/* Shops & stops */}
      <section id="shops" className="py-14">
        <h2 className="font-heading text-[clamp(30px,4.4vw,44px)] tracking-[.02em] text-obsidian-roast m-0 text-center">
          🛍️ Shops &amp; Stops We Love
        </h2>
        <div className="w-16 h-1 bg-smashie-yellow rounded-sm mx-auto mt-3.5" />
        <p className="mt-2 mx-auto max-w-[660px] text-[15px] font-semibold text-[#5b6b7a] text-center">
          Park once and stroll. Nearly every shop and eatery on the Smiths Grove map sits along one walkable block — listed here in the same order as the map.
        </p>
        <div className="grid gap-[26px] grid-cols-[repeat(auto-fit,minmax(292px,1fr))] mt-8 max-w-[1180px] mx-auto px-5">
          {stops.shops.map((stop) => (
            <StopCard key={stop.id || stop.name} stop={stop} onOpen={setActiveStop} />
          ))}
        </div>
      </section>

      {/* Surrounding area */}
      <section className="py-14 bg-[#F5E9D2] border-y border-[rgba(0,51,102,.10)]">
        <h2 className="font-heading text-[clamp(30px,4.4vw,44px)] tracking-[.02em] text-obsidian-roast m-0 text-center">
          🧭 The Surrounding Area
        </h2>
        <div className="w-16 h-1 bg-smashie-yellow rounded-sm mx-auto mt-3.5" />
        <p className="mt-2 mx-auto max-w-[660px] text-[15px] font-semibold text-[#5b6b7a] text-center">
          Buc-ee’s sits right here at Exit 38. The Corvette Museum and Mammoth Cave are a straight shot down or up I-65 — each one has its own page here.
        </p>
        <div className="grid gap-[26px] grid-cols-[repeat(auto-fit,minmax(292px,1fr))] mt-8 max-w-[1180px] mx-auto px-5">
          {stops.surrounding.map((stop) => (
            <SurroundCard key={stop.id || stop.name} stop={stop} onOpen={setActiveStop} />
          ))}
        </div>
      </section>

      {/* Local flavor */}
      <section className="py-14">
        <h2 className="font-heading text-[clamp(30px,4.4vw,44px)] tracking-[.02em] text-obsidian-roast m-0 text-center">
          🍇 Local Flavor
        </h2>
        <div className="w-16 h-1 bg-smashie-yellow rounded-sm mx-auto mt-3.5" />
        <p className="mt-2 mx-auto max-w-[660px] text-[15px] font-semibold text-[#5b6b7a] text-center">
          Kentucky-made sips just up the road. Make an afternoon of it.
        </p>
        <div className="grid gap-[26px] grid-cols-[repeat(auto-fit,minmax(292px,1fr))] mt-8 max-w-[1180px] mx-auto px-5">
          {stops.flavor.map((stop) => (
            <StopCard key={stop.id || stop.name} stop={stop} onOpen={setActiveStop} />
          ))}
        </div>
      </section>

      {/* Attractions */}
      <section className="py-14">
        <h2 className="font-heading text-[clamp(30px,4.4vw,44px)] tracking-[.02em] text-obsidian-roast m-0 text-center">
          🚗 Attractions &amp; Activities
        </h2>
        <div className="w-16 h-1 bg-smashie-yellow rounded-sm mx-auto mt-3.5" />
        <p className="mt-2 mx-auto max-w-[660px] text-[15px] font-semibold text-[#5b6b7a] text-center">
          Green space, race day, and old brick. All in town, all in one exit.
        </p>
        <div className="grid gap-[26px] grid-cols-[repeat(auto-fit,minmax(292px,1fr))] mt-8 max-w-[1180px] mx-auto px-5">
          {stops.attractions.map((stop) => (
            <StopCard key={stop.id || stop.name} stop={stop} onOpen={setActiveStop} />
          ))}
        </div>
      </section>

      {/* Map */}
      <section id="map" className="py-14 bg-[#F5E9D2] border-y border-[rgba(0,51,102,.10)]">
        <h2 className="font-heading text-[clamp(30px,4.4vw,44px)] tracking-[.02em] text-obsidian-roast m-0 text-center">
          Stops &amp; Shops Map
        </h2>
        <div className="w-16 h-1 bg-smashie-yellow rounded-sm mx-auto mt-3.5" />
        <p className="mt-2 mx-auto max-w-[660px] text-[15px] font-semibold text-[#5b6b7a] text-center">
          Tap a pin and go. Everything here is minutes from our front door at Exit 38.
        </p>
        <div className="max-w-[1180px] mx-auto px-5">
          <div className="bg-white border border-[rgba(0,51,102,.14)] rounded-[14px] overflow-hidden shadow-[0_10px_30px_rgba(0,51,102,.10)] mt-8">
            <iframe
              src="https://www.google.com/maps/d/embed?mid=1BKzIsbLnlYoZzM34qoYzXkQerXwp4mg&hl=en&ehbc=2E312F"
              title="Map of stops and shops around Smiths Grove, Kentucky"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className="block w-full h-[380px] sm:h-[520px] border-0"
            />
          </div>
        </div>
      </section>

      {/* Community band */}
      <section className="bg-[#002244] text-white py-11">
        <div className="max-w-[1180px] mx-auto px-5 text-center">
          <h2 className="font-heading text-[clamp(28px,4vw,40px)] tracking-[.02em]">🤝 Community Connection</h2>
          <p className="mt-3 mx-auto max-w-[720px] text-white/80 font-semibold">
            We believe in cross-traffic. When you visit Flavor Isle, you’re fueling the whole neighborhood. Stop by these spots, share the love, and let’s keep Smiths Grove buzzing together.
          </p>
          <div className="mt-6 flex gap-3 justify-center flex-wrap">
            <Link
              to="/i65-exit-38"
              className="inline-block bg-white text-[#002244] font-extrabold tracking-[.06em] uppercase text-[13px] px-5 py-3 rounded-md"
            >
              Plan your stop at Exit 38
            </Link>
            <Link
              to="/mammoth-cave-dining"
              className="inline-block bg-transparent text-white border-2 border-white/70 font-extrabold tracking-[.06em] uppercase text-[13px] px-5 py-3 rounded-md hover:bg-white hover:text-[#002244]"
            >
              Mammoth Cave dining
            </Link>
            <Link
              to="/reviews#traveler-log"
              className="inline-block bg-transparent text-white border-2 border-white/70 font-extrabold tracking-[.06em] uppercase text-[13px] px-5 py-3 rounded-md hover:bg-white hover:text-[#002244]"
            >
              Traveler Log · see where everyone’s from
            </Link>
          </div>
        </div>
      </section>

      <ShopDetailDialog
        shop={activeStop}
        onClose={() => setActiveStop(null)}
        onJump={(id) => {
          setActiveStop(null);
          setTimeout(() => scrollToStop(id), 140);
        }}
      />

      <Footer />
      <CartDrawer />
    </div>
  );
}