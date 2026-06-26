import React, { useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Clock, Star, MapPin, Utensils, ShoppingBag, Bike } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

const SPECIALS_TICKER = [
  "🍔 Double Smash Burger — $10.99",
  "🥤 Thick Vanilla Malt — $5.49",
  "🍟 Loaded Cheese Fries — $4.99",
  "⭐ Today's Special: BLT Deluxe — $8.99",
  "🍳 All-Day Breakfast Platter — $9.49",
  "🥧 Homemade Pie Slice — $3.99",
  "🍔 Double Smash Burger — $10.99",
  "🥤 Thick Vanilla Malt — $5.49",
  "🍟 Loaded Cheese Fries — $4.99",
  "⭐ Today's Special: BLT Deluxe — $8.99",
  "🍳 All-Day Breakfast Platter — $9.49",
  "🥧 Homemade Pie Slice — $3.99",
];

const FEATURES = [
  { icon: '🍔', label: 'Hand-Smashed Burgers', desc: 'Fresh beef, never frozen' },
  { icon: '🥤', label: 'Thick Milkshakes', desc: 'Blended with real ice cream' },
  { icon: '🍳', label: 'All-Day Breakfast', desc: 'Because breakfast is forever' },
  { icon: '🥧', label: 'Homemade Pies', desc: 'Baked fresh every morning' },
];

const TESTIMONIALS = [
  { name: 'Sarah M.', text: 'Best burger in Smiths Grove — hands down. The smash burger is everything!', rating: 5 },
  { name: 'James T.', text: 'The milkshakes are thick and creamy. My kids beg to come here every weekend.', rating: 5 },
  { name: 'Linda K.', text: 'Classic diner vibes with amazing food. The all-day breakfast is a must!', rating: 5 },
];

export default function Home() {
  const { setOrderType } = useCart();
  const navigate = useNavigate();

  const handleOrder = (type) => {
    setOrderType(type);
    navigate('/menu');
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      {/* ── HERO ── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0 z-0">
          <img
            src="https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=1800&q=85&fit=crop"
            alt="Signature burger"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/50 to-black/20" />
        </div>

        {/* Vertical Ticker Sidebar */}
        <div className="absolute right-0 top-0 h-full w-16 bg-midnight-cherry/90 z-10 hidden lg:flex flex-col items-center overflow-hidden py-4">
          <div className="writing-mode-vertical text-white font-heading text-xs tracking-widest mb-4 opacity-60">FRESH OUT</div>
          <div className="flex-1 overflow-hidden w-full">
            <div className="animate-ticker flex flex-col items-center gap-6 py-4">
              {SPECIALS_TICKER.map((s, i) => (
                <div key={i} className="writing-mode-vertical text-white text-xs whitespace-nowrap font-body opacity-80 [writing-mode:vertical-rl] rotate-180 px-2">
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-20 lg:pr-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-patina-mint/20 border border-patina-mint/40 text-patina-mint px-4 py-2 rounded-full text-sm font-semibold mb-6 backdrop-blur-sm">
              <div className="w-2 h-2 bg-patina-mint rounded-full animate-pulse" />
              Now Open · Est. Smiths Grove, KY
            </div>

            <h1 className="font-heading text-5xl sm:text-7xl text-white leading-[1.05] mb-6">
              REAL FOOD.<br />
              <span className="text-midnight-cherry" style={{ WebkitTextStroke: '1px #A1001A', color: '#FF6B6B' }}>REAL GOOD.</span>
            </h1>

            <p className="text-gray-200 text-lg leading-relaxed mb-10 max-w-lg">
              Smiths Grove's classic American diner. Hand-smashed burgers, thick shakes, and homestyle cooking made fresh every day.
            </p>

            {/* Command Center */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-6 max-w-lg">
              <p className="text-white/70 text-sm font-semibold uppercase tracking-widest mb-4">How would you like to order?</p>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => handleOrder('pickup')}
                  className="flex flex-col items-center gap-2 bg-midnight-cherry text-white p-4 rounded-2xl font-heading text-sm hover:bg-red-800 transition-all hover:scale-105 chrome-hover"
                >
                  <ShoppingBag size={24} />
                  Pickup
                  <span className="text-xs font-body opacity-75">15–25 min</span>
                </button>
                <button
                  onClick={() => handleOrder('delivery')}
                  className="flex flex-col items-center gap-2 bg-white/20 text-white p-4 rounded-2xl font-heading text-sm hover:bg-white/30 transition-all hover:scale-105 border border-white/30"
                >
                  <Bike size={24} />
                  Delivery
                  <span className="text-xs font-body opacity-75">35–50 min</span>
                </button>
                <button
                  onClick={() => handleOrder('dine_in')}
                  className="flex flex-col items-center gap-2 bg-patina-mint text-white p-4 rounded-2xl font-heading text-sm hover:bg-teal-600 transition-all hover:scale-105 chrome-hover"
                >
                  <Utensils size={24} />
                  Dine-In
                  <span className="text-xs font-body opacity-75">Seat yourself</span>
                </button>
              </div>

              {/* Kitchen Status */}
              <div className="mt-4 flex items-center gap-2 text-sm text-white/70">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Kitchen is open · ~20 min wait right now
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20 px-4 sm:px-6 max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="font-heading text-4xl text-obsidian-roast mb-3">Why Flavor Isle?</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Everything made fresh, every day. That's the Flavor Isle promise.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {FEATURES.map(f => (
            <div key={f.label} className="card-diner p-6 text-center">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-heading text-sm text-obsidian-roast mb-1">{f.label}</h3>
              <p className="text-muted-foreground text-xs">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURED MENU ITEMS ── */}
      <section className="py-16 bg-obsidian-roast">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">Fan Favorites</p>
              <h2 className="font-heading text-4xl text-white">The Classics</h2>
            </div>
            <Link to="/menu" className="btn-cherry chrome-hover px-5 py-2.5 text-sm flex items-center gap-2">
              Full Menu <ArrowRight size={16} />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                name: 'The Isle Smash Burger',
                desc: 'Double smashed patties, American cheese, special sauce, pickles, on a brioche bun.',
                price: '$10.99',
                img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=600&q=80&fit=crop',
                tag: 'Best Seller'
              },
              {
                name: 'Thick Vanilla Malt',
                desc: 'Hand-spun with real vanilla ice cream and malted milk. Served with extra in the tin.',
                price: '$5.49',
                img: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?w=600&q=80&fit=crop',
                tag: 'Fan Fave'
              },
              {
                name: 'Loaded Cheese Fries',
                desc: 'Crinkle-cut fries smothered in cheddar cheese sauce, jalapeños, and bacon bits.',
                price: '$4.99',
                img: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=600&q=80&fit=crop',
                tag: 'Must Try'
              }
            ].map(item => (
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
                  <p className="text-gray-400 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">Reviews</p>
            <h2 className="font-heading text-4xl text-obsidian-roast">Smiths Grove Loves Us</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="card-diner p-6">
                <div className="flex gap-1 mb-3">
                  {[...Array(t.rating)].map((_, i) => (
                    <Star key={i} size={16} className="text-yellow-400 fill-yellow-400" />
                  ))}
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed mb-4">"{t.text}"</p>
                <p className="font-heading text-sm text-obsidian-roast">— {t.name}</p>
              </div>
            ))}
          </div>
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
                    <p className="font-semibold text-obsidian-roast">Main Street, Smiths Grove</p>
                    <p className="text-sm">Kentucky, KY 42171</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock size={18} className="text-midnight-cherry" />
                  </div>
                  <div>
                    <p className="font-semibold text-obsidian-roast">Open Daily</p>
                    <p className="text-sm">Mon–Fri: 7AM–10PM · Sat: 8AM–11PM · Sun: 8AM–9PM</p>
                  </div>
                </div>
              </div>
              <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-7 py-3.5 text-sm mt-8">
                Order for Pickup <ArrowRight size={16} />
              </Link>
            </div>

            {/* Stylized map placeholder */}
            <div className="relative rounded-3xl overflow-hidden shadow-float-lg h-80">
              <div className="w-full h-full bg-gradient-to-br from-patina-mint to-teal-700 flex items-center justify-center relative">
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
                }} />
                <div className="text-center text-white z-10">
                  <div className="w-16 h-16 bg-midnight-cherry rounded-full flex items-center justify-center mx-auto mb-4 shadow-float-lg">
                    <MapPin size={28} />
                  </div>
                  <p className="font-heading text-xl">FLAVOR ISLE</p>
                  <p className="text-sm opacity-80">Smiths Grove, KY</p>
                  <a
                    href="https://maps.google.com/?q=Smiths+Grove+KY"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 bg-white text-patina-mint px-4 py-2 rounded-full text-sm font-heading hover:bg-vanilla-malt transition-colors"
                  >
                    Get Directions <ArrowRight size={14} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA BANNER ── */}
      <section className="py-16 bg-midnight-cherry px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-heading text-4xl text-white mb-4">Hungry? Let's Fix That.</h2>
          <p className="text-red-200 mb-8">Order online for pickup, delivery, or dine-in. Hot food, fast.</p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/menu" className="bg-white text-midnight-cherry font-heading px-8 py-4 rounded-2xl hover:bg-vanilla-malt transition-colors chrome-hover">
              Order Now
            </Link>
            <a href="tel:+12705635000" className="border-2 border-white text-white font-heading px-8 py-4 rounded-2xl hover:bg-white/10 transition-colors">
              Call Us
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}