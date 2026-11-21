import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, Utensils, ShoppingBag, Bike, HelpCircle, Car, Newspaper } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FindSmashieClueChip from '@/components/findSmashie/FindSmashieClueChip';
import CartDrawer from '@/components/CartDrawer';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import PullRefreshIndicator from '@/components/PullRefreshIndicator';
import useLiveStatus from '@/hooks/useLiveStatus';
import CinematicHero from '@/components/cinematic/CinematicHero';
import PhotoChapter from '@/components/cinematic/PhotoChapter';
import { optimizedImageUrl } from '@/lib/utils';
import HomeOrderOptions from '@/components/cinematic/HomeOrderOptions';
import FanFavoritesSection from '@/components/FanFavoritesSection';
import { base44 } from '@/api/base44Client';
import { getFanFavorites, getMenuItems } from '@/lib/menuCache';
import Seo from '@/components/Seo';
import HomeStructuredData from '@/components/schema/HomeStructuredData';
import MenuStructuredData from '@/components/schema/MenuStructuredData';
import { getMenuSetting } from '@/lib/menuSettings';
import { itemCategoryKey, sortCategories, sortItemsInCategory } from '@/lib/menuCategory';
import { computeUnifiedStoreState } from '@/lib/storeState';


import DailySpecialsSection from '@/components/DailySpecialsSection';
import MerchPromo from '@/components/MerchPromo';
import HomePromoStrip from '@/components/HomePromoStrip';
import HomeReviews from '@/components/home/HomeReviews';
import RewardsBand from '@/components/home/RewardsBand';
import EarlyCloseNotice from '@/components/EarlyCloseNotice';
import useBusinessHours from '@/hooks/useBusinessHours';
import { hoursSummary } from '@/lib/businessHours';
import ExpressPickupStrip from '@/components/ExpressPickupStrip';
import HeritageBadges from '@/components/HeritageBadges';
import KentuckyTourismBadge from '@/components/KentuckyTourismBadge';
import StickyOrderBar from '@/components/StickyOrderBar';
import FindSmashiePromo from '@/components/findSmashie/FindSmashiePromo';
import OnDutyNow from '@/components/OnDutyNow';
import KitchenNow from '@/components/KitchenNow';
import TravelerMode from '@/components/travel/TravelerMode';

const HOME_DINING_PHOTO = {
  url: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/48f62e309_IMG_8855.jpeg',
  alt: 'Flavor Isle dining room looking toward the entrance, with tables and a view into the kitchen',
  caption: 'Pull up a seat. Stay a while.',
};

// "19:00" → "7 PM", "18:30" → "6:30 PM". The hero's status line is read as a
// sentence, so it uses plain speech rather than the schedule's clock format.
function spokenClock(time) {
  const [h, m] = String(time || '').split(':').map(Number);
  if (!Number.isFinite(h)) return '';
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = ((h + 11) % 12) + 1;
  return m ? `${hour12}:${String(m).padStart(2, '0')} ${period}` : `${hour12} ${period}`;
}

export default function Home() {
  const { setOrderType } = useCart();
  const { deliveryEnabled } = useLiveStatus();
  const navigate = useNavigate();
  const businessHours = useBusinessHours();
  const { pull, refreshing } = usePullToRefresh(() => window.location.reload());
  const [menuItems, setMenuItems] = useState([]);
  const [menuSchemaRows, setMenuSchemaRows] = useState([]);
  const [menuRenames, setMenuRenames] = useState({});
  const [shakeRank, setShakeRank] = useState(null);
  const [storeSetting, setStoreSetting] = useState(null);

  // Load visible menu items so the Fan Favorites rail can show the real
  // top-10 best-sellers stamped by the refreshFanFavorites backend function.
  useEffect(() => {
    let active = true;
    const load = async () => {
      for (let attempt = 0; attempt < 3 && active; attempt++) {
        try {
          const [data, snapshots] = await Promise.all([
            getFanFavorites(),
            base44.entities.FanFavoriteSnapshot.list('-computed_at', 1),
          ]);
          const visible = (data || []).filter((i) => !i.is_hidden);
          if (!visible.length && attempt < 2) throw new Error('Fan Favorites read returned empty');
          if (active) {
            setMenuItems(visible);
            setShakeRank(snapshots?.[0]?.shake_rank || null);
          }
          return;
        } catch (error) {
          console.error(`Fan Favorites load failed (attempt ${attempt + 1}/3):`, error);
          if (attempt < 2) await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
        }
      }
    };
    load();
    return () => { active = false; };
  }, []);

  // Menu rows for the page's Menu JSON-LD (the Restaurant block lives in
  // index.html and is kept fresh by the global RestaurantSchema component).
  useEffect(() => {
    let active = true;
    Promise.all([
      getMenuItems(),
      getMenuSetting().catch(() => ({})),
    ]).then(([allItems, setting]) => {
      if (!active) return;
      const hidden = new Set(setting?.hidden_categories || []);
      const grouped = new Map();
      for (const item of (allItems || []).filter((entry) => !entry.is_hidden)) {
        const key = itemCategoryKey(item);
        if (hidden.has(key)) continue;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push(item);
      }
      setMenuSchemaRows(sortCategories([...grouped.keys()], setting?.category_sort_order || [])
        .map((key) => ({
          key,
          items: sortItemsInCategory(grouped.get(key), setting?.category_item_order?.[key] || []),
        })));
      setMenuRenames(setting?.category_renames || {});
      setStoreSetting(setting || null);
    }).catch(() => {});
    return () => { active = false; };
  }, []);

  const handleOrder = (type) => {
    setOrderType(type);
    navigate('/menu');
  };

  // The hero's address line answers "are you open right now?" — today's live
  // close time while the store is open, the weekly hours summary otherwise.
  const storeState = storeSetting ? computeUnifiedStoreState(storeSetting) : null;
  const heroMetaLine = storeState?.open
    ? `103 N Main St, Smiths Grove, KY 42171 · 0.7 mi off I-65 Exit 38 · Open today until ${spokenClock(storeState.effectiveCloseToday)}`
    : `103 N Main St, Smiths Grove, KY 42171 · ${hoursSummary(businessHours)}`;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Seo
        path="/"
        title="Flavor Isle | Diner Near I-65 Exit 38 — Burgers & Shakes, Smiths Grove KY"
        description="Looking for food near me off I-65? Flavor Isle has hand-patted burgers and thick shakes in Smiths Grove, KY since 1964. Order online for pickup or dine-in."
        ogTitle="Flavor Isle | Diner Near I-65 Exit 38 — Burgers & Shakes, Smiths Grove KY"
        ogDescription="Looking for food near me off I-65? Flavor Isle has hand-patted burgers and thick shakes in Smiths Grove, KY since 1964. Order online for pickup or dine-in."
        ogImage="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/1503a227d_IMG_0428.jpg"
        ogImageAlt="Flavor Isle burgers & shakes storefront in Smiths Grove, KY"
      />
      <HomeStructuredData hours={businessHours} />
      <MenuStructuredData rows={menuSchemaRows} renames={menuRenames} />
      <PullRefreshIndicator pull={pull} refreshing={refreshing} />
      <Navbar />
      <CartDrawer />

      {/* ── COMMUNITY NEWS LINK (small, top of page) ── */}
      <div className="bg-vanilla-malt border-b border-midnight-cherry/15">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <Link
            to="/community-news"
            className="flex items-center justify-center gap-2 py-2 text-xs sm:text-sm font-heading uppercase tracking-widest text-midnight-cherry hover:text-obsidian-roast transition-colors whitespace-nowrap"
          >
            <Newspaper size={14} aria-hidden="true" />
            <span>Community News</span>
            <span className="hidden sm:inline font-body normal-case tracking-normal text-muted-foreground">&mdash; what&rsquo;s happening at the Isle</span>
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>

      <EarlyCloseNotice />

      {/* ── EXIT 38 PHOTO STORY ── */}
      <CinematicHero
        cityLine
        heading="Burgers & shakes in Smiths Grove since 1964."
        subtitle="Two minutes off I-65. Zero regrets."
        actions={[
          { label: 'Order for Pickup', to: '/menu', variant: 'primary' },
          { label: 'See Menu', to: '/menu' },
          { label: 'Get Directions', href: 'https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171' },
        ]}
        metaLine={heroMetaLine}
      />

      <OnDutyNow open={!!storeState?.open} />

      {/* Issue #340 — compact "on the grill now" strip */}
      <KitchenNow compact />

      {/* ── FIND SMASHIE (Halloween hide & seek promo) ── */}
      <FindSmashiePromo />

      {/* One photo chapter, not three: the story below reads as one beat before
          the ordering options instead of three full-screen pauses. */}
      <PhotoChapter photo={HOME_DINING_PHOTO} heading="Come on in." text="Pull up a seat in Smiths Grove.">
        <HomeOrderOptions embedded />
      </PhotoChapter>

      {/* Issue #341 — traveler strip, shown only to a visitor plausibly out of town */}
      <TravelerMode compact requireOutOfTown />

      <ExpressPickupStrip />

      {(menuItems.length > 0 || shakeRank) && (
        <section className="py-10 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <FanFavoritesSection items={menuItems} shakeRank={shakeRank} />
          </div>
        </section>
      )}

      {/* ── STAR REWARDS (compact band, sitting between the top 10 and Find Us) ── */}
      <RewardsBand />

      {/* ── FIND US — one box: photo, the I-65 approach, address, hours and the FAQ ask ── */}
      <section className="py-20 bg-patina-mint/10 px-4 sm:px-6 fall26-section">
        <div className="max-w-6xl mx-auto">
          <div className="card-diner overflow-hidden grid grid-cols-1 md:grid-cols-2 items-stretch">
            {/* Storefront photo */}
            <div className="relative min-h-[300px] md:min-h-full">
              <img
                src={optimizedImageUrl('https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/efc9b941c_flavorislebuilding.png', 800, 600)}
                alt="Flavor Isle storefront in Smiths Grove, KY"
                width="800"
                height="600"
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="font-heading text-xl text-white drop-shadow-lg">FLAVOR ISLE</p>
                <p className="text-sm text-white/90 drop-shadow">Smiths Grove, KY · Est. 1964</p>
                <div className="mt-4">
                  <KentuckyTourismBadge />
                </div>
              </div>
            </div>

            {/* How to get here, when we're open, and the FAQ ask — one column */}
            <div className="p-6 sm:p-8 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 text-midnight-cherry font-heading text-xs tracking-widest uppercase mb-2">
                <Car size={14} /> I-65 Exit 38 · Smiths Grove, KY
              </div>
              <h2 className="font-heading text-3xl text-obsidian-roast leading-tight">You're Closer Than You Think</h2>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                Whether you're a local craving a hand-patted burger or an I-65 traveler heading to Mammoth Cave or the Corvette Museum, we're right off the interstate — 0.7 mi, about 2 minutes from Exit 38.{' '}
                <Link to="/smiths-grove" className="text-midnight-cherry font-semibold hover:underline underline-offset-4">
                  More about Flavor Isle in Smiths Grove
                </Link>
              </p>

              <div className="space-y-4 mt-5 text-muted-foreground">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-midnight-cherry" />
                  </div>
                  <div>
                    <p className="font-semibold text-obsidian-roast">103 N Main St, Smiths Grove</p>
                    <p className="text-sm">Smiths Grove, KY 42171 · 0.7 mi / ~2 min from I-65</p>
                    <a
                      href="https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-heading text-midnight-cherry mt-1 hover:underline"
                    >
                      Get Directions <ArrowRight size={12} />
                    </a>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock size={18} className="text-midnight-cherry" />
                  </div>
                  <div>
                    <p className="font-semibold text-obsidian-roast">Hours</p>
                    <p className="text-sm">{hoursSummary(businessHours)}</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mt-6">
                <Link to="/i65-exit-38" className="btn-mint chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm font-heading">
                  Plan Your Stop <ArrowRight size={16} />
                </Link>
                <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm font-heading">
                  Order for Pickup <ArrowRight size={16} />
                </Link>
              </div>

              <div className="mt-6 pt-5 border-t border-border flex items-center gap-3">
                <div className="w-10 h-10 bg-midnight-cherry/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <HelpCircle size={20} className="text-midnight-cherry" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-obsidian-roast">Frequently asked questions</p>
                  <p className="text-xs text-muted-foreground">Hours, allergens, ordering, pickup {deliveryEnabled ? '& delivery' : '& dine-in'}.</p>
                </div>
                <Link to="/faq" className="inline-flex items-center gap-1 text-sm font-heading text-midnight-cherry hover:underline flex-shrink-0">
                  View FAQs <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <HomePromoStrip />

      {/* ── REVIEWS (one block: three outside reviews + link to the wall) ── */}
      <HomeReviews />

      <HeritageBadges />

      {/* ── TASTY THREADS MERCH ── */}
      <MerchPromo />

      {/* ── DAILY SPECIALS ── */}
      <DailySpecialsSection />

      <StickyOrderBar />

      <FindSmashieClueChip />
      <Footer />
    </div>);

}