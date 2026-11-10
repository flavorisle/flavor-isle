import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import ShopDetailDialog from '@/components/explore/ShopDetailDialog';
import StopCard from '@/components/explore/StopCard';
import SurroundCard from '@/components/explore/SurroundCard';
import { FALLBACKS, mapShop } from '@/components/explore/exploreFallbacks';

// Same 88px offset the deep-link handler uses, so a link lands where a hash would.
function scrollToStop(id) {
  if (!id) return;
  const target = document.getElementById(id);
  if (target) {
    window.scrollTo({ top: Math.max(0, target.getBoundingClientRect().top + window.scrollY - 88), behavior: 'smooth' });
  }
}

// Everything around Flavor Isle: the walkable Main Street shops, the three
// out-of-town stops, local flavor, in-town attractions and the walking map.
// Lifted out of the old Explore page so the Visit Us page can carry it as one
// more section instead of a second page.
export default function ExploreSections() {
  // Live rows from Admin → Explore Shops, grouped by section. A section with no
  // rows yet keeps its approved fallback cards, and any fetch failure leaves the
  // page exactly as it shipped.
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
          shops: grouped.shops.length ? grouped.shops : FALLBACKS.shops,
          surrounding: grouped.surrounding.length ? grouped.surrounding : FALLBACKS.surrounding,
          flavor: grouped.flavor.length ? grouped.flavor : FALLBACKS.flavor,
          attractions: grouped.attractions.length ? grouped.attractions : FALLBACKS.attractions,
        });
      })
      .catch(() => {});
    return () => { live = false; };
  }, []);

  // The router scrolls to the hash before this lazily-mounted page exists, so
  // deep links like /i65-exit-38#bucees need a second, patient pass.
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
    <>
      {/* Shops & stops */}
      <section id="shops" className="py-14 scroll-mt-24">
        <h2 className="font-heading text-[clamp(30px,4.4vw,44px)] tracking-[.02em] text-obsidian-roast m-0 text-center">
          🛍️ Shops &amp; Stops We Love
        </h2>
        <div className="w-16 h-1 bg-smashie-yellow rounded-sm mx-auto mt-3.5" />
        <p className="mt-2 mx-auto max-w-[660px] px-5 text-[15px] font-semibold text-[#5b6b7a] text-center">
          Park once and stroll. Nearly every shop and eatery on the Smiths Grove map sits along one walkable block — listed here in the same order as the map.
        </p>
        <div className="grid gap-[26px] grid-cols-[repeat(auto-fit,minmax(292px,1fr))] mt-8 max-w-[1180px] mx-auto px-5">
          {stops.shops.map((stop) => (
            <StopCard key={stop.id || stop.name} stop={stop} onOpen={setActiveStop} onJump={scrollToStop} />
          ))}
        </div>
      </section>

      {/* Surrounding area */}
      <section className="py-14 bg-[#F5E9D2] border-y border-[rgba(0,51,102,.10)]">
        <h2 className="font-heading text-[clamp(30px,4.4vw,44px)] tracking-[.02em] text-obsidian-roast m-0 text-center">
          🧭 The Surrounding Area
        </h2>
        <div className="w-16 h-1 bg-smashie-yellow rounded-sm mx-auto mt-3.5" />
        <p className="mt-2 mx-auto max-w-[660px] px-5 text-[15px] font-semibold text-[#5b6b7a] text-center">
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
        <p className="mt-2 mx-auto max-w-[660px] px-5 text-[15px] font-semibold text-[#5b6b7a] text-center">
          Kentucky-made sips just up the road. Make an afternoon of it.
        </p>
        <div className="grid gap-[26px] grid-cols-[repeat(auto-fit,minmax(292px,1fr))] mt-8 max-w-[1180px] mx-auto px-5">
          {stops.flavor.map((stop) => (
            <StopCard key={stop.id || stop.name} stop={stop} onOpen={setActiveStop} onJump={scrollToStop} />
          ))}
        </div>
      </section>

      {/* Attractions */}
      <section className="py-14">
        <h2 className="font-heading text-[clamp(30px,4.4vw,44px)] tracking-[.02em] text-obsidian-roast m-0 text-center">
          🚗 Attractions &amp; Activities
        </h2>
        <div className="w-16 h-1 bg-smashie-yellow rounded-sm mx-auto mt-3.5" />
        <p className="mt-2 mx-auto max-w-[660px] px-5 text-[15px] font-semibold text-[#5b6b7a] text-center">
          Green space, race day, and old brick. All in town, all in one exit.
        </p>
        <div className="grid gap-[26px] grid-cols-[repeat(auto-fit,minmax(292px,1fr))] mt-8 max-w-[1180px] mx-auto px-5">
          {stops.attractions.map((stop) => (
            <StopCard key={stop.id || stop.name} stop={stop} onOpen={setActiveStop} onJump={scrollToStop} />
          ))}
        </div>
      </section>

      {/* Map */}
      <section id="map" className="py-14 bg-[#F5E9D2] border-y border-[rgba(0,51,102,.10)] scroll-mt-24">
        <h2 className="font-heading text-[clamp(30px,4.4vw,44px)] tracking-[.02em] text-obsidian-roast m-0 text-center">
          Stops &amp; Shops Map
        </h2>
        <div className="w-16 h-1 bg-smashie-yellow rounded-sm mx-auto mt-3.5" />
        <p className="mt-2 mx-auto max-w-[660px] px-5 text-[15px] font-semibold text-[#5b6b7a] text-center">
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
              to="/menu"
              className="inline-block bg-white text-[#002244] font-extrabold tracking-[.06em] uppercase text-[13px] px-5 py-3 rounded-md"
            >
              Order online
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
    </>
  );
}