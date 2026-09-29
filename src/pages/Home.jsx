import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, Utensils, ShoppingBag, Bike, HelpCircle, Car } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import PullRefreshIndicator from '@/components/PullRefreshIndicator';
import ReviewSection from '@/components/ReviewSection';
import HeroSection from '@/components/HeroSection';
import FanFavoritesSection from '@/components/FanFavoritesSection';
import { base44 } from '@/api/base44Client';
import Seo from '@/components/Seo';


import SocialProofStrip from '@/components/SocialProofStrip';
import DownloadAppBanner from '@/components/DownloadAppBanner';
import WhyFlavorIsle from '@/components/WhyFlavorIsle';
import DailySpecialsSection from '@/components/DailySpecialsSection';
import AdBannerStrip from '@/components/AdBannerStrip';
import MerchPromo from '@/components/MerchPromo';
import MilkshakePromoBanner from '@/components/MilkshakePromoBanner';
import EarlyCloseNotice from '@/components/EarlyCloseNotice';
import HappyHourBanner from '@/components/HappyHourBanner';
import useBusinessHours from '@/hooks/useBusinessHours';
import { hoursSummary } from '@/lib/businessHours';
import ExpressPickupStrip from '@/components/ExpressPickupStrip';
import HeritageBadges from '@/components/HeritageBadges';
import StickyOrderBar from '@/components/StickyOrderBar';
import { FallDivider } from '@/components/RetroFallTheme';
import HeroStats from '@/components/HeroStats';


const SPECIALS_TICKER = [
"🍔 Fresh Hand-Patted Double Cheeseburger — $9.50",
"🥤 Thick Vanilla Malt — $5.49",
"🍟 Loaded Cheese Fries — $4.99",
"⭐ Today's Special: BLT Deluxe — $8.99",
"🥧 Homemade Pie Slice — $3.99",
"🍔 Fresh Hand-Patted Double Cheeseburger — $9.50",
"🥤 Thick Vanilla Malt — $5.49",
"🍟 Loaded Cheese Fries — $4.99",
"⭐ Today's Special: BLT Deluxe — $8.99",
"🥧 Homemade Pie Slice — $3.99"];


const FEATURES = [
{ icon: '🍔', label: 'Hand-Patted Burgers', desc: 'Fresh beef, never frozen' },
{ icon: '🥤', label: 'Thick Milkshakes', desc: 'Blended with real ice cream' },
{ icon: '🍗', label: 'Crispy Chicken', desc: 'Fried fresh to order' },
{ icon: '🥧', label: 'Homemade Pies', desc: 'Baked fresh every morning' }];



export default function Home() {
  const { setOrderType } = useCart();
  const navigate = useNavigate();
  const businessHours = useBusinessHours();
  const { pull, refreshing } = usePullToRefresh(() => window.location.reload());
  const [menuItems, setMenuItems] = useState([]);
  const [shakeRank, setShakeRank] = useState(null);

  // Load visible menu items so the Fan Favorites rail can show the real
  // top-10 best-sellers stamped by the refreshFanFavorites backend function.
  useEffect(() => {
    let active = true;
    const load = async () => {
      for (let attempt = 0; attempt < 3 && active; attempt++) {
        try {
          const [data, snapshots] = await Promise.all([
            base44.entities.MenuItem.filter({ is_fan_favorite: true }, 'fan_favorite_rank', 10),
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

  const handleOrder = (type) => {
    setOrderType(type);
    navigate('/menu');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Seo
        path="/"
        title="Flavor Isle | Burgers & Shakes off I-65 Exit 38, Smiths Grove KY"
        description="Family-owned burgers & shakes spot since 1964, 0.7 miles off I-65 Exit 38 in Smiths Grove, KY. Hand-patted burgers, thick shakes, and online ordering."
        ogTitle="Flavor Isle | Burgers & Shakes off I-65 Exit 38, Smiths Grove KY"
        ogDescription="Family-owned burgers & shakes spot since 1964, 0.7 miles off I-65 Exit 38 in Smiths Grove, KY. Hand-patted burgers, thick shakes, and online ordering."
        ogImage="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/1503a227d_IMG_0428.jpg"
        ogImageAlt="Flavor Isle burgers & shakes storefront in Smiths Grove, KY"
      />
      <PullRefreshIndicator pull={pull} refreshing={refreshing} />
      <Navbar />
      <CartDrawer />

      <EarlyCloseNotice />

      {/* ── HERO → SHAKES → FAVORITES → REVIEWS → STATS ── */}
      <HeroSection />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <MilkshakePromoBanner variant="strip" />
      </div>
      {(menuItems.length > 0 || shakeRank) && (
        <section className="py-10 px-4 sm:px-6">
          <div className="max-w-7xl mx-auto">
            <FanFavoritesSection items={menuItems} shakeRank={shakeRank} />
          </div>
        </section>
      )}
      <ReviewSection />
      <HeroStats />

      <ExpressPickupStrip />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <HappyHourBanner />
      </div>
      <AdBannerStrip placement="home" />
      <WhyFlavorIsle />

      <HeritageBadges />

      {/* ── TASTY THREADS MERCH ── */}
      <MerchPromo />

      {/* ── DAILY SPECIALS ── */}
      <DailySpecialsSection />

      <FallDivider />

      {/* ── LOCATION ── */}
      <section className="py-20 bg-patina-mint/10 px-4 sm:px-6 fall26-section">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">Find Us</p>
              <h2 className="font-heading text-4xl text-obsidian-roast mb-6">Right in the Heart<br />of Smiths Grove</h2>
              <div className="space-y-4 text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-midnight-cherry" />
                  </div>
                  <div>
                    <p className="font-semibold text-obsidian-roast">103 N Main St, Smiths Grove</p>
                    <p className="text-sm">Kentucky, KY 42171</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock size={18} className="text-midnight-cherry" />
                  </div>
                  <div>
                    <p className="font-semibold text-obsidian-roast">Hours</p>
                    <p className="text-sm">{hoursSummary(businessHours)}</p>
                  </div>
                </div>
              </div>
              <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-7 py-3.5 text-sm mt-8">
                Order for Pickup <ArrowRight size={16} />
              </Link>
            </div>

            {/* Storefront photo */}
            <div className="relative rounded-3xl overflow-hidden shadow-float-lg h-80 group">
              <img
                src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/efc9b941c_flavorislebuilding.png"
                alt="Flavor Isle storefront in Smiths Grove, KY"
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-center text-white">
                <p className="font-heading text-xl drop-shadow-lg">FLAVOR ISLE</p>
                <p className="text-sm opacity-90 drop-shadow">Smiths Grove, KY</p>
                <a
                  href="https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 bg-white text-patina-mint px-4 py-2 rounded-full text-sm font-heading hover:bg-vanilla-malt transition-colors shadow-float">
                  Get Directions <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── I-65 EXIT 38 WAYFINDING ── */}
      <section className="py-14 px-4 sm:px-6 bg-vanilla-malt">
        <div className="max-w-4xl mx-auto">
          <div className="card-diner overflow-hidden grid grid-cols-1 sm:grid-cols-5 items-stretch">
            <div className="sm:col-span-2 relative min-h-[180px]">
              <img
                src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/7b759012a_FlavorIsleBuilding.png"
                alt="Flavor Isle roadside stand off I-65 Exit 38"
                loading="lazy"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="sm:col-span-3 p-6 sm:p-8 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 text-midnight-cherry font-heading text-xs tracking-widest uppercase mb-2">
                <Car size={14} /> I-65 Exit 38 · Smiths Grove, KY
              </div>
              <h2 className="font-heading text-2xl sm:text-3xl text-obsidian-roast leading-tight">You're Closer Than You Think</h2>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
                Whether you're a local craving a hand-patted burger or an I-65 traveler heading to Mammoth Cave or the Corvette Museum, we're right off the interstate — 0.7 mi, about 2 minutes from Exit 38.
              </p>
              <Link to="/i65-exit-38" className="btn-mint chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm font-heading mt-5 self-start">
                Plan Your Stop <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ + LOCATION ── */}
      <section className="py-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <div className="card-diner p-6 sm:p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="w-14 h-14 bg-midnight-cherry/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                <HelpCircle size={26} className="text-midnight-cherry" />
              </div>
              <div className="flex-1">
                <h2 className="font-heading text-xl text-obsidian-roast">Frequently Asked Questions</h2>
                <p className="text-muted-foreground text-sm mt-1">Hours, allergens, ordering, pickup & delivery — answers to the things folks ask us most.</p>
              </div>
              <Link to="/contact#faq" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm font-heading flex-shrink-0">
                View FAQs <ArrowRight size={16} />
              </Link>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mt-5 pt-5 border-t border-border">
              <div className="flex items-start gap-3 flex-1">
                <div className="w-10 h-10 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin size={18} className="text-midnight-cherry" />
                </div>
                <div>
                  <p className="font-semibold text-obsidian-roast">103 N Main St, Smiths Grove</p>
                  <p className="text-sm text-muted-foreground">Kentucky, KY 42171 · 0.7 mi / ~2 min from I-65</p>
                </div>
              </div>
              <a
                href="https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-mint chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm font-heading flex-shrink-0"
              >
                Get Directions <ArrowRight size={16} />
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── DOWNLOAD APP BANNER ── */}
      <DownloadAppBanner />

      <StickyOrderBar />
      <Footer />
    </div>);

}