import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, Utensils, ShoppingBag, Bike, HelpCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import ReviewSection from '@/components/ReviewSection';
import GoogleReviewsCard from '@/components/GoogleReviewsCard';
import HeroSection from '@/components/HeroSection';


import SocialProofStrip from '@/components/SocialProofStrip';
import DownloadAppBanner from '@/components/DownloadAppBanner';
import WhyFlavorIsle from '@/components/WhyFlavorIsle';
import DailySpecialsSection from '@/components/DailySpecialsSection';
import AdBannerStrip from '@/components/AdBannerStrip';
import MerchPromo from '@/components/MerchPromo';
import MilkshakePromoBanner from '@/components/MilkshakePromoBanner';
import EarlyCloseNotice from '@/components/EarlyCloseNotice';
import WhyOrderDirect from '@/components/WhyOrderDirect';
import NearbyAreas from '@/components/NearbyAreas';
import useBusinessHours from '@/hooks/useBusinessHours';
import { hoursSummary } from '@/lib/businessHours';


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

  const handleOrder = (type) => {
    setOrderType(type);
    navigate('/menu');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <EarlyCloseNotice />

      {/* ── HERO ── */}
      <HeroSection />

      {/* ── PROMO BANNERS ── */}
      <AdBannerStrip placement="home" />

      {/* ── WHY FLAVOR ISLE ── */}
      <WhyFlavorIsle />

      {/* ── WHY ORDER DIRECT (incl. Star Rewards) ── */}
      <WhyOrderDirect />

      {/* ── FEATURED MENU ITEMS ── */}
      <section className="py-16 bg-obsidian-roast">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-sm font-heading uppercase tracking-widest mb-2 text-[hsl(var(--primary))]">FAN FAVORITES</p>
              <h2 className="font-heading text-4xl text-white">The Classics</h2>
            </div>
            <Link to="/menu" className="btn-cherry chrome-hover px-5 py-2.5 text-sm flex items-center gap-2">
              Full Menu <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
            {
              name: 'Double Cheeseburger',
              desc: 'Two fresh, hand-patted beef patties stacked with double American cheese, lettuce, tomato, and our special sauce.',
              price: '$9.50',
              img: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/1b6e0909b1fdbe33d4e2df41b1e87aee97b3f99a/original.jpeg',
              tag: 'Best Seller'
            },
            {
              name: 'Onion Rings',
              desc: 'Golden, crispy battered onion rings — the side everyone raves about.',
              price: '$3.25',
              img: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/9fc6558ed_IMG_0370.png',
              tag: 'Must Try'
            },
            {
              name: 'Hot Fudge Cake',
              desc: 'Rich chocolate cake smothered in hot fudge, topped with whipped cream and chopped peanuts.',
              price: '$6.99',
              img: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/149a9d514dd6dcf81944320b6813bb86990ac036/original.jpeg',
              tag: 'Fan Fave'
            }].
            map((item) =>
            <div key={item.name} className="group rounded-3xl overflow-hidden bg-white/5 border border-white/10 hover:border-midnight-cherry/50 transition-all">
                <div className="relative h-52 overflow-hidden">
                  <img src={item.img} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-3 right-3 bg-midnight-cherry text-white text-xs font-heading px-3 py-1 rounded-full">{item.tag}</div>
                </div>
                <div className="p-5">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-heading text-white text-base">{item.name}</h3>
                    <span className="text-midnight-cherry font-heading text-lg">{item.price}</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── SHAKE ISLE PROMO ── */}
      <MilkshakePromoBanner variant="feature" />

      {/* ── TASTY THREADS MERCH ── */}
      <MerchPromo />

      {/* ── DAILY SPECIALS ── */}
      <DailySpecialsSection />

      {/* ── REVIEWS ── */}
      <ReviewSection />

      {/* ── GOOGLE REVIEWS ── */}
      <section className="pb-12 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <GoogleReviewsCard />
        </div>
      </section>

      {/* ── LOCATION ── */}
      <section className="py-20 bg-patina-mint/10 px-4 sm:px-6">
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

      {/* ── NEARBY AREAS / I-65 WAYFINDING ── */}
      <NearbyAreas hideCta />

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

      <Footer />
    </div>);

}