import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flame, IceCream2, CakeSlice, UtensilsCrossed, ArrowRight, Phone, Car, Accessibility } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import CinematicHero from '@/components/cinematic/CinematicHero';
import PhotoChapter from '@/components/cinematic/PhotoChapter';
import { islePhotos } from '@/components/cinematic/photos';
import { optimizedImageUrl } from '@/lib/utils';
import ParkingRules from '@/components/parking/ParkingRules';
import { issue23Photos } from '@/lib/issue23Photos';
import LocationHours from '@/components/visit/LocationHours';
import WhatToExpect from '@/components/visit/WhatToExpect';
import SnapAndShare from '@/components/visit/SnapAndShare';
import ExploreSections from '@/components/explore/ExploreSections';
import useLiveStatus from '@/hooks/useLiveStatus';
import useBusinessHours from '@/hooks/useBusinessHours';
import { hoursSummary } from '@/lib/businessHours';
import { pickupQuote } from '@/lib/waitQuote';
import { getAvailableItems } from '@/lib/menuCache';
import { priceLine } from '@/lib/menuPriceSamples';
import TravelerMode from '@/components/travel/TravelerMode';

const LOGO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';

const FAVORITES = [
  { icon: Flame, title: 'Hand-Patted Burgers', desc: 'Fresh, never frozen — smashed and stacked to order.' },
  { icon: UtensilsCrossed, title: 'Hand-Cut Curly Fries', desc: 'Crispy spiral-cut fries, tots & loaded sides.' },
  { icon: IceCream2, title: 'Thick Milkshakes', desc: 'Hand-spun in custom flavors — banana pudding, caramel, more.' },
  { icon: CakeSlice, title: 'Hot Fudge Cakes & Banana Splits', desc: 'Warm cake under hot fudge and soft serve, plus splits piled with pineapple and cherries.' },
];

// The one visit page: directions and hours, what to expect, parking, the
// store's story, fan favorites, and every stop around Flavor Isle — merged
// from the old Exit 38 guide, Explore Smiths Grove, and visit-us pages.
export default function I65Exit38() {
  const { deliveryEnabled, waitMin } = useLiveStatus();
  const businessHours = useBusinessHours();
  const [priceText, setPriceText] = useState('');

  // Today's prices, so the Bowling Green answers quote real numbers.
  useEffect(() => {
    let active = true;
    getAvailableItems()
      .then((items) => { if (active) setPriceText(priceLine(items)); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const pickupQuoteText = pickupQuote(waitMin);
  const hoursText = hoursSummary(businessHours);

  // Answers for "burgers near Bowling Green KY". The same list feeds the
  // FAQPage structured data so the markup can't drift from the page.
  const FAQS = [
    {
      q: 'Where can I get a burger near Bowling Green, KY?',
      a: `Flavor Isle is a family-owned burger stand 15 minutes north of Bowling Green at 103 N Main St, Smiths Grove, KY 42171 — take I-65 North to Exit 38 and we are 0.7 miles off the ramp. Every burger is fresh, never frozen, hand-patted and cooked to order, with hand-cut fries, thick hand-spun milkshakes and daily specials alongside.${priceText ? ` Prices today: ${priceText}.` : ''} Order ahead at flavor-isle.com or call (270) 563-4618; pickup orders are usually ready in about ${pickupQuoteText}. Hours: ${hoursText}, and the kitchen closes 30 minutes before close.`,
    },
    {
      q: 'How far is Flavor Isle from Bowling Green?',
      a: 'About 15 minutes. Head north on I-65 and take Exit 38 for Smiths Grove, then turn left off the ramp — the restaurant is 0.7 miles ahead on the left at 103 N Main St. Parking is free at the door, behind us, and across the street.',
    },
    {
      q: 'Is it worth the drive from Bowling Green for a burger?',
      a: `Yes — it is a straight shot up I-65 and built as a quick stop: order online before you leave Bowling Green, choose pickup, and it is usually ready in about ${pickupQuoteText}. The dining room is open too, and we have been feeding I-65 travelers from this same roadside stand since 1964. Hours: ${hoursText}.`,
    },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Burgers Near Bowling Green, KY — Flavor Isle at I-65 Exit 38"
        description="Burgers near Bowling Green, KY: Flavor Isle is 15 minutes north at I-65 Exit 38 in Smiths Grove — fresh, never-frozen hand-patted burgers, hand-cut fries and thick shakes. Hours, directions, parking and online pickup."
        ogTitle="Visit Flavor Isle — Exit 38, Smiths Grove KY"
        ogDescription="Location, hours, parking and what to expect at Flavor Isle — plus every shop, winery and attraction around Smiths Grove."
        ogImage="https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/b3c1594ee_card-i65.png"
        ogImageAlt="Flavor Isle Visit Us share card"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Navbar />

      <CinematicHero
        heading="Visit us at Exit 38."
        subtitle="Flavor Isle isn’t built for crowds — it’s built for moments. Fresh burgers, thick shakes, and a warm welcome just off the interstate."
      />

      {/* Issue #341 — Traveler Mode: one tap sets pickup and notes the customer is driving in */}
      <TravelerMode />

      {/* Quick order band */}
      <section className="bg-patina-mint text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl">Thirsty? Let’s fix that.</h2>
            <p className="text-white/80 text-sm mt-1">Order online for {deliveryEnabled ? 'pickup, delivery, or dine-in' : 'pickup, curbside, or dine-in'}. Hot food, fast.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/milkshakes" className="btn-yellow chrome-hover px-6 py-3 text-sm font-heading inline-flex items-center gap-2">
              Build a Shake <ArrowRight size={16} />
            </Link>
            <Link to="/menu" className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading inline-flex items-center gap-2">
              Order Online <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <LocationHours />

      <WhatToExpect />

      {/* Parking & accessibility */}
      <section id="parking" className="max-w-5xl mx-auto px-4 sm:px-6 py-14 scroll-mt-24">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-midnight-cherry font-heading text-sm tracking-widest mb-2">
            <Car size={16} /> PARKING
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">Parking &amp; Accessibility</h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Parking is available behind us, across the street in the lot, and on Main Street — as long as you park in the flow of direction.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 items-start">
          <figure>
            <img
              src={optimizedImageUrl(issue23Photos.parking, 800, 600, 'fit')}
              alt="Parking map for Flavor Isle at I-65 Exit 38"
              width="800"
              height="600"
              loading="lazy"
              decoding="async"
              className="w-full rounded-xl"
            />
            <figcaption className="mt-2 text-sm text-muted-foreground">Where to park when you visit Flavor Isle</figcaption>
            <ParkingRules className="mt-2" />
          </figure>
          <div className="card-diner p-6">
            <h3 className="font-heading text-xl text-obsidian-roast flex items-center gap-2">
              <Accessibility size={18} className="text-midnight-cherry" /> Getting in
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3">
              Outdoor and indoor seating is wheelchair accessible. If you need a hand getting to the door, flag a team member — we’ll help.
            </p>
            <Link to="/what-to-expect" className="inline-flex items-center gap-1.5 text-sm font-heading text-midnight-cherry hover:text-patina-mint transition-colors mt-4">
              More on what to expect <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <SnapAndShare />

      <PhotoChapter photo={islePhotos.dining} heading="Step inside." text="Blue walls, good food, and the community board." />
      <PhotoChapter photo={islePhotos.awards} heading="Come check the wall yourself." />

      {/* Where to eat off I-65 */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
        <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">Where to eat off I-65 in Kentucky</h2>
        <p className="text-muted-foreground mt-4 leading-relaxed">
          Two minutes off Exit 38 in Smiths Grove, 15 minutes north of Bowling Green. Order ahead and the food is ready when you park.
        </p>
        <Link to="/mammoth-cave-dining" className="inline-flex items-center gap-1.5 text-sm font-heading text-midnight-cherry hover:text-patina-mint transition-colors mt-4">
          diner near Mammoth Cave <ArrowRight size={14} />
        </Link>
      </section>

      {/* Bowling Green questions — plain headings and answers, so the text sits
          in the page itself for readers and for search/AI crawlers. */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-14">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-midnight-cherry font-heading text-sm tracking-widest mb-2">
            <UtensilsCrossed size={16} /> FROM BOWLING GREEN
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">Burgers Near Bowling Green, KY</h2>
        </div>
        <div className="space-y-4">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="card-diner p-5 sm:p-6">
              <h3 className="font-heading text-xl text-obsidian-roast">{q}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-2">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Story */}
      <section className="bg-white border-y border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
          <img src={optimizedImageUrl(LOGO, 200, 200, 'fit')} alt="Flavor Isle" width="200" height="200" loading="lazy" decoding="async" className="w-16 h-16 object-contain mx-auto mb-4 rounded-xl" />
          <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">A Roadside Favorite Since 1964</h2>
          <p className="text-muted-foreground mt-4 leading-relaxed">
            Flavor Isle has been feeding I-65 travelers and Smiths Grove locals for three generations. What started as a small roadside burger stand is still the same family recipe today — hand-patted burgers, hand-cut fries, and thick milkshakes made to order. No freezers, no shortcuts. Just a quick, friendly stop worth pulling off for.
          </p>
        </div>
      </section>

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
      </section>

      {/* Around Flavor Isle */}
      <section className="bg-[linear-gradient(180deg,#fffdf7_0%,#F5E9D2_100%)] border-t border-[rgba(0,51,102,.10)]">
        <div className="max-w-[1180px] mx-auto px-5 pt-14 pb-2 text-center">
          <p className="text-xs font-extrabold tracking-[.22em] uppercase text-midnight-cherry mb-3">
            Smiths Grove, Kentucky · Exit 38 off I-65
          </p>
          <h2 className="font-heading text-[clamp(36px,6vw,64px)] leading-[.94] tracking-[.01em] text-obsidian-roast mb-2">
            Around Flavor Isle <span className="text-midnight-cherry">Beyond the Burger</span>
          </h2>
          <p className="max-w-[820px] mx-auto text-base font-semibold text-[#26405a]">
            Flavor Isle is more than a meal. It’s a starting point. After you eat, take a stroll through Smiths Grove and discover the small businesses, local gems, and attractions that make our town one of a kind.{' '}
            <strong className="font-black text-obsidian-roast">They’re not like us, but together we make Smiths Grove unforgettable.</strong>
          </p>
          <a
            href="#shops"
            className="inline-block mt-6 bg-transparent text-obsidian-roast border-2 border-obsidian-roast font-extrabold tracking-[.06em] uppercase text-[13px] px-5 py-3 rounded-md hover:bg-obsidian-roast hover:text-white"
          >
            See the Stops
          </a>
        </div>
      </section>

      <ExploreSections />

      {/* Final CTA */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
        <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">Order Ahead &amp; Skip the Wait</h2>
        <p className="text-muted-foreground mt-3">Place your order online and pick it up on your way through.</p>
        <div className="mt-6 flex flex-wrap gap-3 justify-center">
          <Link to="/menu" className="btn-cherry chrome-hover px-10 py-4 text-base font-heading inline-flex items-center gap-2">
            Order Online <ArrowRight size={18} />
          </Link>
          <a href="tel:+12705634618" className="btn-mint chrome-hover px-8 py-4 text-base font-heading inline-flex items-center gap-2">
            <Phone size={18} /> Call Us
          </a>
        </div>
        <div className="mt-8 flex flex-wrap gap-3 justify-center text-sm">
          <Link to="/mammoth-cave-dining" className="text-patina-mint hover:text-midnight-cherry font-heading transition-colors">Mammoth Cave Dining</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/corvette-car-clubs" className="text-patina-mint hover:text-midnight-cherry font-heading transition-colors">Corvette Car Clubs</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/gallery" className="text-patina-mint hover:text-midnight-cherry font-heading transition-colors">Photo Gallery</Link>
        </div>
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
}