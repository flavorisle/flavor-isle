import React from 'react';
import { Link } from 'react-router-dom';
import { Flame, IceCream2, Snowflake, UtensilsCrossed, Navigation, ArrowRight, Clock, Phone, MapPin, Car } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import NearbyAreas from '@/components/NearbyAreas';
import useBusinessHours from '@/hooks/useBusinessHours';
import { hoursGroups } from '@/lib/businessHours';

const BUILDING = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/7b759012a_FlavorIsleBuilding.png';
const LOGO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';

const FAVORITES = [
  { icon: Flame, title: 'Hand-Patted Burgers', desc: 'Fresh, never frozen — smashed and stacked to order.' },
  { icon: UtensilsCrossed, title: 'Hand-Cut Fries', desc: 'Crispy crinkle fries, tots & loaded sides.' },
  { icon: IceCream2, title: 'Thick Milkshakes', desc: 'Hand-spun in custom flavors — banana pudding, caramel, more.' },
  { icon: Snowflake, title: 'Soft-Serve', desc: 'Classic cones, sundaes & treats.' },
];

export default function I65Exit38() {
  const businessHours = useBusinessHours();

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Flavor Isle | I-65 Exit 38 Burger & Ice Cream Stop Near Bowling Green, KY"
        description="Off I-65 Exit 38 in Smiths Grove — 15 min north of Bowling Green. Fresh hand-patted burgers, hand-cut fries, thick milkshakes & soft-serve since 1964. Order ahead online for pickup."
        ogTitle="I-65 Exit 38 Food Stop — Flavor Isle | Smiths Grove, KY"
        ogDescription="Skip the interstate chains. Flavor Isle is 0.7 miles off I-65 Exit 38 — hand-patted burgers, thick shakes, fast pickup for road trippers."
        ogImage="https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/b3c1594ee_card-i65.png"
        ogImageAlt="Flavor Isle I-65 Exit 38 road-trip share card"
      />
      <Navbar />

      {/* Hero */}
      <section className="relative bg-patina-mint text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src={BUILDING} alt="" loading="lazy" className="w-full h-full object-cover" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-smashie-yellow text-obsidian-roast px-4 py-1.5 rounded-full font-heading text-sm tracking-wide mb-6">
            <Car size={16} /> I-65 EXIT 38 · SMITHS GROVE, KY
          </div>
          <h1 className="font-heading text-4xl sm:text-6xl leading-tight">
            The Burger &amp; Ice Cream Stop at I-65 Exit 38
          </h1>
          <p className="font-body text-lg sm:text-xl text-white/90 mt-4">
            15 minutes north of Bowling Green · Family-owned since 1964
          </p>
          <p className="font-body text-base text-white/80 mt-3 max-w-xl mx-auto">
            Stretch your legs, grab a hand-patted burger and a thick shake, and get back on the road. Fresh, never frozen — made to order.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/menu" className="btn-cherry chrome-hover px-8 py-4 text-base font-heading flex items-center justify-center gap-2">
              Order Ahead <ArrowRight size={18} />
            </Link>
            <a href="tel:+12705634618" className="btn-yellow chrome-hover px-8 py-4 text-base font-heading flex items-center justify-center gap-2">
              <Phone size={18} /> (270) 563-4618
            </a>
          </div>
        </div>
      </section>

      {/* Directions */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-midnight-cherry font-heading text-sm tracking-widest mb-2">
            <Navigation size={16} /> HOW TO FIND US
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">Right Off Exit 38</h2>
          <p className="text-muted-foreground mt-2">103 N Main St, Smiths Grove, KY 42171</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-diner p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-midnight-cherry/10 flex items-center justify-center">
                <Navigation size={18} className="text-midnight-cherry" />
              </div>
              <h3 className="font-heading text-xl text-obsidian-roast">Northbound (toward Louisville)</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Take I-65 North to <strong>Exit 38 (Smiths Grove)</strong>. Turn right off the ramp onto US-31W / N Main St. Flavor Isle is just 0.7 miles ahead on the left at 103 N Main St.
            </p>
          </div>
          <div className="card-diner p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-midnight-cherry/10 flex items-center justify-center">
                <Navigation size={18} className="text-midnight-cherry" />
              </div>
              <h3 className="font-heading text-xl text-obsidian-roast">Southbound (toward Nashville)</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Take I-65 South to <strong>Exit 38 (Smiths Grove)</strong>. Turn left off the ramp onto US-31W / N Main St. Flavor Isle is just 0.7 miles ahead on the left at 103 N Main St.
            </p>
          </div>
        </div>
        <div className="mt-4 text-center">
          <a
            href="https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-patina-mint font-heading text-sm hover:text-midnight-cherry transition-colors"
          >
            <MapPin size={16} /> Open in Google Maps
          </a>
        </div>
      </section>

      {/* Story */}
      <section className="bg-white border-y border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
          <img src={LOGO} alt="Flavor Isle" loading="lazy" className="w-16 h-16 object-contain mx-auto mb-4 rounded-xl" />
          <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">A Roadside Favorite Since 1964</h2>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            Flavor Isle has been feeding I-65 travelers and Smiths Grove locals for three generations. What started as a small roadside burger stand is still the same family recipe today — hand-patted burgers, hand-cut fries, and thick milkshakes made to order. No freezers, no shortcuts. Just a quick, friendly stop worth pulling off for.
          </p>
        </div>
      </section>

      {/* Nearby areas + I-65 wayfinding */}
      <NearbyAreas hideCta />

      {/* Fan favorites */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-center mb-8">
          <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">Fan Favorites</h2>
          <p className="text-muted-foreground mt-2">What travelers pull off for.</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {FAVORITES.map((f) => (
            <div key={f.title} className="card-diner p-5 text-center">
              <div className="w-12 h-12 rounded-full bg-midnight-cherry/10 flex items-center justify-center mx-auto mb-3">
                <f.icon size={22} className="text-midnight-cherry" />
              </div>
              <div className="font-heading text-lg text-obsidian-roast leading-none">{f.title}</div>
              <p className="text-xs text-muted-foreground mt-2 leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 text-center">
          <Link to="/menu" className="btn-cherry chrome-hover px-8 py-4 text-base font-heading inline-flex items-center gap-2">
            See the Full Menu <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* Hours */}
      <section className="bg-patina-mint text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 text-smashie-yellow font-heading text-sm tracking-widest mb-2">
              <Clock size={16} /> HOURS
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl">Open to Serve You</h2>
          </div>
          <div className="max-w-sm mx-auto space-y-2 text-sm">
            {hoursGroups(businessHours).map((g) => (
              <div key={g.days} className="flex justify-between gap-4 border-b border-white/15 pb-2">
                <span className="text-white/85">{g.days}</span>
                <span className="font-heading text-white">{g.label}</span>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-white/70 mt-6">Kitchen closes 30 minutes before close. Order ahead to skip the wait.</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
        <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">Order Ahead &amp; Skip the Wait</h2>
        <p className="text-muted-foreground mt-3">Place your order online and pick it up on your way through.</p>
        <Link to="/menu" className="btn-cherry chrome-hover px-10 py-4 text-base font-heading inline-flex items-center gap-2 mt-6">
          Order Online <ArrowRight size={18} />
        </Link>
        <div className="mt-8 flex flex-wrap gap-3 justify-center text-sm">
          <Link to="/mammoth-cave-dining" className="text-patina-mint hover:text-midnight-cherry font-heading transition-colors">Mammoth Cave Dining</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/corvette-car-clubs" className="text-patina-mint hover:text-midnight-cherry font-heading transition-colors">Corvette Car Clubs</Link>
        </div>
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
}