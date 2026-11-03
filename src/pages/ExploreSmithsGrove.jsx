import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';

const SHOPS = [
  {
    tag: 'Quilts & Fabric',
    name: 'Psycho Granny’s Quilt Shop',
    address: null,
    photo: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/e1819dde1_psycho-granny.jpg',
    alt: 'Psycho Granny’s Quilt Shop in Smiths Grove, Kentucky',
    copy: 'Bold fabrics, handmade quilts, and a quirky personality that’s pure Smiths Grove.',
    tile: 'photo',
  },
  {
    tag: 'Cards & Collectibles',
    name: 'Kentucky Card Vault',
    address: null,
    photo: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/d0dbcdb70_kentucky-card-vault.jpg',
    alt: 'Kentucky Card Vault in Smiths Grove, Kentucky',
    copy: 'A must-stop for trading cards, collectibles, and hobby enthusiasts.',
    tile: 'photo',
  },
  {
    tag: 'Vintage Clothing',
    name: 'Marigold Vintage',
    address: null,
    photo: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/130a7bd40_marigold-vintage.jpg',
    alt: 'Marigold Vintage in Smiths Grove, Kentucky',
    copy: 'Curated vintage clothing and accessories with timeless style.',
    tile: 'photo',
  },
  {
    tag: 'Antique & Vintage',
    name: 'Marigold Manor',
    address: '124 W. 1st St',
    photo: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/1cc60ccc6_marigold-manor.jpg',
    alt: 'Marigold Manor in Smiths Grove, Kentucky',
    copy: 'Vintage and handmade marketplace in a two-story brick house, with a cozy library inside.',
    tile: 'photo',
  },
  {
    tag: 'Antiques',
    name: 'The Foxhole',
    address: null,
    photo: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/f625ae363_foxhole.jpg',
    alt: 'The Foxhole in Smiths Grove, Kentucky',
    copy: 'A beloved antique store with curated vintage finds.',
    tile: 'photo',
  },
  {
    tag: 'Landmark Building',
    name: 'The Roost',
    address: '131 N. Main St',
    photo: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/9036d6038_roost-42171.jpg',
    alt: 'The Roost in Smiths Grove, Kentucky',
    copy: 'The Main Street building. The shop inside it is 42171 & Co.',
    tile: 'photo',
  },
  {
    tag: 'Antiques & Boutique',
    name: '42171 & Co.',
    address: '131 N. Main St',
    photo: null,
    alt: null,
    copy: 'Antiques, boutique items, and much more, in the shop inside The Roost.',
    tile: 'mono',
  },
  {
    tag: 'Antiques & Garden',
    name: 'Boone’s Antiques & The Garden Patch',
    address: '204 N. Main St',
    photo: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/9119609d4_boones-gardenpatch.jpg',
    alt: 'Boone’s Antiques & The Garden Patch in Smiths Grove, Kentucky',
    copy: 'Antiques, collectibles, plants, and garden items.',
    tile: 'photo',
  },
  {
    tag: 'Hardware',
    name: 'Superior Supply',
    address: '133 S. Main St',
    photo: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/16b7ca316_superior-supply.jpg',
    alt: 'Superior Supply in Smiths Grove, Kentucky',
    copy: 'Hardware, small engine repair, and a little nostalgia. Open Monday through Saturday, 8am to 4pm.',
    tile: 'photo',
  },
  {
    tag: 'Coffee',
    name: 'Ace Coffee Indigo Fox',
    address: '114 E. 1st St',
    photo: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/65b204ad6_ace-coffee-storefront.jpg',
    alt: 'Ace Coffee Indigo Fox in Smiths Grove, Kentucky',
    copy: 'Delicious drinks and a curated meeting spot.',
    tile: 'photo',
  },
  {
    tag: 'Farm Fresh',
    name: 'Pelly’s Farm Fresh',
    address: null,
    photo: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/c2781561c_pellys.jpg',
    alt: 'Pelly’s Farm Fresh in Smiths Grove, Kentucky',
    copy: 'Local produce, fresh goods, and farm-to-table flavors straight from Smiths Grove.',
    tile: 'photo',
  },
  {
    tag: 'Boutique',
    name: 'Smalls on Main',
    address: null,
    photo: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/4efdf27f4_smalls-on-main.jpg',
    alt: 'Smalls on Main in Smiths Grove, Kentucky',
    copy: 'Boutique shopping with unique styles and small-town charm.',
    tile: 'photo',
  },
];

const FLAVOR = [
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

const ATTRACTIONS = [
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
  {
    tag: 'National Park',
    name: 'Mammoth Cave National Park',
    address: null,
    photo: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/0c2f8476d_mammoth-cave.jpg',
    alt: 'Mammoth Cave National Park in Smiths Grove, Kentucky',
    copy: 'The longest cave system on earth, about 25 minutes up the road. Book a tour, then come eat.',
    tile: 'photo',
  },
];

function StopCard({ stop }) {
  return (
    <article className="bg-white border border-[rgba(0,51,102,.12)] rounded-xl overflow-hidden flex flex-col shadow-[0_2px_0_rgba(0,51,102,.05)] transition-transform duration-150 hover:-translate-y-[3px] hover:shadow-[0_12px_24px_rgba(0,51,102,.12)]">
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
      {stop.tile === 'stripe' && (
        <div className="aspect-[4/3] flex items-center justify-center bg-[repeating-linear-gradient(135deg,#003366,#003366_12px,#0a3d70_12px,#0a3d70_24px)]">
          <span className="font-heading text-[26px] tracking-[.06em] text-white/90 text-center px-[18px]">{stop.name}</span>
        </div>
      )}
      <div className="p-[18px_18px_20px] flex flex-col gap-2 flex-1">
        <span className="inline-block w-max text-[10.5px] font-black tracking-[.14em] uppercase text-obsidian-roast bg-[rgba(242,162,43,.24)] rounded-full px-[10px] py-[3px]">{stop.tag}</span>
        <h3 className="font-heading text-[26px] tracking-[.02em] leading-[1.05] text-obsidian-roast m-0">{stop.name}</h3>
        <p className="m-0 text-[14.5px] font-semibold text-[#41556a] flex-1">{stop.copy}</p>
        {stop.address && (
          <a
            className="block text-[11.5px] font-black tracking-[.08em] uppercase text-[#6a7f93] hover:text-midnight-cherry pt-0.5"
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stop.address + ' Smiths Grove KY 42171')}`}
            target="_blank"
            rel="noopener"
          >
            {stop.address}
          </a>
        )}
      </div>
    </article>
  );
}

export default function ExploreSmithsGrove() {
  return (
    <div>
      <Navbar />
      <Seo
        title="Explore Smiths Grove | Shops, Coffee & Attractions off I-65 Exit 38"
        description="A walkable block of antique shops, a coffee bar, a winery, a distillery, and Mammoth Cave 25 minutes away, all minutes from Flavor Isle at Exit 38."
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

      {/* Local shops */}
      <section id="shops" className="py-14">
        <h2 className="font-heading text-[clamp(30px,4.4vw,44px)] tracking-[.02em] text-obsidian-roast m-0 text-center">
          🛍️ Local Shops We Love
        </h2>
        <div className="w-16 h-1 bg-smashie-yellow rounded-sm mx-auto mt-3.5" />
        <p className="mt-2 mx-auto max-w-[660px] text-[15px] font-semibold text-[#5b6b7a] text-center">
          Walk out our front door and you’re in it. Twelve stops worth walking to, all within a few blocks.
        </p>
        <div className="grid gap-[26px] grid-cols-[repeat(auto-fit,minmax(292px,1fr))] mt-8 max-w-[1180px] mx-auto px-5">
          {SHOPS.map((stop) => (
            <StopCard key={stop.name} stop={stop} />
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
          {FLAVOR.map((stop) => (
            <StopCard key={stop.name} stop={stop} />
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
          Green space, race day, old brick, and the biggest cave in the world. All in one exit.
        </p>
        <div className="grid gap-[26px] grid-cols-[repeat(auto-fit,minmax(292px,1fr))] mt-8 max-w-[1180px] mx-auto px-5">
          {ATTRACTIONS.map((stop) => (
            <StopCard key={stop.name} stop={stop} />
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
              Plan your visit to Flavor Isle
            </Link>
            <a
              href="#map"
              className="inline-block bg-transparent text-white border-2 border-white/70 font-extrabold tracking-[.06em] uppercase text-[13px] px-5 py-3 rounded-md"
            >
              Traveler Log · see where everyone’s from
            </a>
          </div>
        </div>
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
}