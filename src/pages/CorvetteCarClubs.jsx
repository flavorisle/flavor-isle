import React from 'react';
import { Link } from 'react-router-dom';
import { Navigation, ArrowRight, Clock, Phone, MapPin, Car, Gauge, Users } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import useBusinessHours from '@/hooks/useBusinessHours';
import { hoursGroups } from '@/lib/businessHours';
import PhotoChapter from '@/components/cinematic/PhotoChapter';
import { islePhotos } from '@/components/cinematic/photos';

const BUILDING = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/7b75912a_FlavorIsleBuilding.png';

export default function CorvetteCarClubs() {
  const businessHours = useBusinessHours();

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Corvette Car Club Dining near Bowling Green — Flavor Isle"
        description="A nostalgic roadside burger stop minutes from the National Corvette Museum in Bowling Green, KY. Group seating, hand-patted burgers, thick shakes, and free parking right off I-65 Exit 38."
        ogTitle="Corvette Museum & Car Club Dining — Flavor Isle | Smiths Grove, KY"
        ogDescription="Rolling into Bowling Green for the Corvette Museum or a car club run? Flavor Isle is 15 minutes up I-65 — big burgers, group-friendly, easy parking."
        ogImage="https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/6a698f419_card-corvette.png"
        ogImageAlt="Flavor Isle Corvette car club dining share card"
      />
      <Navbar />

      {/* Hero */}
      <section className="relative bg-patina-mint text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src={BUILDING} alt="" loading="lazy" className="w-full h-full object-cover" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-smashie-yellow text-obsidian-roast px-4 py-1.5 rounded-full font-heading text-sm tracking-wide mb-6">
            <Gauge size={16} /> CORVETTE MUSEUM & CAR CLUBS
          </div>
          <h1 className="font-heading text-4xl sm:text-6xl leading-tight">
            The Classic Diner Stop for Car Clubs
          </h1>
          <p className="font-body text-lg sm:text-xl text-white/90 mt-4">
            Nostalgic roadside burgers & shakes · Minutes from the Corvette Museum
          </p>
          <p className="font-body text-base text-white/80 mt-3 max-w-xl mx-auto">
            Pull off I-65 Exit 38 and step back into 1964. Hand-patted burgers, hand-cut fries, and thick milkshakes — the kind of stop your car club will want to make a tradition.
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

      <PhotoChapter photo={islePhotos.burgerTots} heading="Add Flavor Isle to your route." action="Order Now" />
      <PhotoChapter photo={islePhotos.chicken} heading="A stop worth the drive." action="Get Directions" to="https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171" />

      {/* Group seating + scenic route */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card-diner p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-midnight-cherry/10 flex items-center justify-center">
                <Users size={18} className="text-midnight-cherry" />
              </div>
              <h3 className="font-heading text-xl text-obsidian-roast">Group Seating Available</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Bringing the whole club? We have room for groups. Call ahead and we’ll have your orders ready so your crew can eat, swap stories, and get back on the road without the wait.
            </p>
          </div>
          <div className="card-diner p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-10 h-10 rounded-full bg-midnight-cherry/10 flex items-center justify-center">
                <Navigation size={18} className="text-midnight-cherry" />
              </div>
              <h3 className="font-heading text-xl text-obsidian-roast">Take the Scenic Route</h3>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Skip the interstate and cruise <strong>US-31W</strong> between the Corvette Museum and Exit 38. It’s a classic two-lane run through Kentucky countryside — the kind of road that makes the burger taste better.
            </p>
          </div>
        </div>
      </section>

      {/* Directions */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-6">
        <div className="card-diner p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-10 h-10 rounded-full bg-midnight-cherry/10 flex items-center justify-center">
              <Car size={18} className="text-midnight-cherry" />
            </div>
            <h3 className="font-heading text-xl text-obsidian-roast">From the Corvette Museum</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Head north on I-65 from the National Corvette Museum in Bowling Green to <strong>Exit 38 (Smiths Grove)</strong> — about 15 minutes. Just 0.7 miles off I-65 Exit 38 — coming up from Bowling Green, take a left off the exit and you'll find us on your left. Prefer the scenic route? Take US-31W north straight to our front door.
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
          <Link to="/mammoth-cave-dining" className="text-patina-mint hover:text-midnight-cherry font-heading transition-colors">Mammoth Cave Dining</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/menu" className="text-patina-mint hover:text-midnight-cherry font-heading transition-colors">Full Menu</Link>
        </div>
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
}