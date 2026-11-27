import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Navigation, ArrowRight, Clock, Phone, MapPin, Car, Mountain } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import useBusinessHours from '@/hooks/useBusinessHours';
import { optimizedImageUrl } from '@/lib/utils';
import { hoursGroups, hoursSummary } from '@/lib/businessHours';
import useLiveStatus from '@/hooks/useLiveStatus';
import { pickupQuote } from '@/lib/waitQuote';
import { getAvailableItems } from '@/lib/menuCache';
import { priceLine } from '@/lib/menuPriceSamples';
import PhotoChapter from '@/components/cinematic/PhotoChapter';
import { islePhotos } from '@/components/cinematic/photos';

const BUILDING = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/7b759012a_FlavorIsleBuilding.png';

export default function MammothCaveDining() {
  const businessHours = useBusinessHours();
  const { waitMin } = useLiveStatus();
  const [priceText, setPriceText] = useState('');

  // Today's menu prices, so the answers below quote real numbers.
  useEffect(() => {
    let active = true;
    getAvailableItems()
      .then((items) => { if (active) setPriceText(priceLine(items)); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const pickupQuoteText = pickupQuote(waitMin);

  // Answers for travelers searching "diner near Mammoth Cave". The same list
  // feeds the FAQPage structured data so the markup can't drift from the page.
  const FAQS = [
    {
      q: 'Where can I find a diner near Mammoth Cave?',
      a: `Flavor Isle is a family-owned burger and fries restaurant 15 minutes from Mammoth Cave National Park: take I-65 North to Exit 38 (Smiths Grove) and we are 0.7 miles off the ramp at 103 N Main St, Smiths Grove, KY 42171. We serve fresh, never-frozen hand-patted burgers, chicken, crinkle fries, onion rings, hand-spun milkshakes and daily specials, for dine-in or pickup. Hours: ${hoursSummary(businessHours)}, and the kitchen closes 30 minutes before close. Order ahead at flavor-isle.com or call (270) 563-4618 — pickup orders are usually ready in about ${pickupQuoteText}.${priceText ? ` Prices today: ${priceText}.` : ''} Parking is free at the door, with room for trucks, RVs and trailers.`,
    },
    {
      q: 'How far is the diner from Mammoth Cave?',
      a: 'About 15 minutes by car. Head north from the park on the Mammoth Cave Parkway to I-65 North, take Exit 38 for Smiths Grove, and Flavor Isle is 0.7 miles off the exit on the left at 103 N Main St.',
    },
    {
      q: 'Can we eat there on the way to or from the caves?',
      a: `Yes — it is a straight shot up I-65 from the park, built for a quick stop. Order at flavor-isle.com before you leave, choose pickup, and it is usually ready in about ${pickupQuoteText}; the dining room is open too. We are open ${hoursSummary(businessHours)}, and the kitchen closes 30 minutes before close.`,
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
        title="Diner Near Mammoth Cave — Flavor Isle, 15 Min via I-65 Exit 38"
        description="Diner near Mammoth Cave National Park: Flavor Isle at I-65 Exit 38 in Smiths Grove, KY 42171 — hand-patted burgers, crinkle fries and thick shakes, 15 minutes from the park, open daily for dine-in or pickup."
        ogTitle="Diner Near Mammoth Cave — Flavor Isle | Smiths Grove, KY"
        ogDescription="Visiting Mammoth Cave National Park? Flavor Isle is 15 minutes away off I-65 Exit 38 — burgers, shakes, hours, prices and quick pickup for cave-bound travelers."
        ogImage="https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/e14074219_card-mammoth.png"
        ogImageAlt="Flavor Isle Mammoth Cave dining share card"
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Navbar />

      {/* Hero */}
      <section className="relative bg-patina-mint text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src={optimizedImageUrl(BUILDING, 1600, 900)} alt="" width="1600" height="900" loading="eager" fetchPriority="high" decoding="async" className="w-full h-full object-cover" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-smashie-yellow text-obsidian-roast px-4 py-1.5 rounded-full font-heading text-sm tracking-wide mb-6">
            <Mountain size={16} /> NEAR MAMMOTH CAVE NATIONAL PARK
          </div>
          <h1 className="font-heading text-4xl sm:text-6xl leading-tight">
            The Kid-Friendly Burger &amp; Shake Stop
          </h1>
          <p className="font-body text-lg sm:text-xl text-white/90 mt-4">
            15 minutes from the park entrance · Straight down I-65, Exit 38
          </p>
          <p className="font-body text-base text-white/80 mt-3 max-w-xl mx-auto">
            Caves work up an appetite. Grab a hand-patted burger, crinkle fries, and a thick shake the whole family will love — made fresh to order, ready when you are.
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



      <PhotoChapter photo={islePhotos.burger} heading="Add Flavor Isle to your route." action="Order Now" />
      <PhotoChapter photo={islePhotos.chickenFries} heading="Fuel up before the caves." action="Get Directions" to="https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171" />
      {/* Directions */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-6">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-midnight-cherry font-heading text-sm tracking-widest mb-2">
            <Navigation size={16} /> MAMMOTH CAVE TO FLAVOR ISLE
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">15 Minutes Down I-65</h2>
        </div>
        <div className="card-diner p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-midnight-cherry/10 flex items-center justify-center">
              <Car size={18} className="text-midnight-cherry" />
            </div>
            <h3 className="font-heading text-xl text-obsidian-roast">From the park to our counter</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Head north from Mammoth Cave on the Mammoth Cave Parkway to I-65 North. Take <strong>Exit 38 (Smiths Grove)</strong> — just 0.7 miles off the exit. Take a left off the ramp and you'll find us on your left at 103 N Main St. About 15 minutes total — perfect for a lunch or dinner stop on your way to or from the caves.
          </p>
          <div className="mt-4">
            <a
              href="https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-mint chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm font-heading"
            >
              <MapPin size={16} /> 1-Tap Google Maps Directions <ArrowRight size={16} />
            </a>
          </div>
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

      {/* Traveler questions — plain headings and answers, so the text is in the
          page itself for readers and for search/AI crawlers. */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-midnight-cherry font-heading text-sm tracking-widest mb-2">
            <Mountain size={16} /> TRAVELERS ASK
          </div>
          <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">Diner Near Mammoth Cave</h2>
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

      {/* Final CTA + internal links */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
        <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">Order Ahead &amp; Skip the Wait</h2>
        <p className="text-muted-foreground mt-3">Place your order online and pick it up on your way through.</p>
        <Link to="/menu" className="btn-cherry chrome-hover px-10 py-4 text-base font-heading inline-flex items-center gap-2 mt-6">
          Order Online <ArrowRight size={18} />
        </Link>
        <div className="mt-8 flex flex-wrap gap-3 justify-center text-sm">
          <Link to="/i65-exit-38" className="text-patina-mint hover:text-midnight-cherry font-heading transition-colors">I-65 Exit 38 Guide</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/explore-smiths-grove" className="text-patina-mint hover:text-midnight-cherry font-heading transition-colors">Explore Smiths Grove</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/corvette-car-clubs" className="text-patina-mint hover:text-midnight-cherry font-heading transition-colors">Corvette Car Clubs</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/menu" className="text-patina-mint hover:text-midnight-cherry font-heading transition-colors">Full Menu</Link>
        </div>
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
}