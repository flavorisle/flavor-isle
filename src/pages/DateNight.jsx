import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Clock, MapPin, Heart, Car } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import useBusinessHours from '@/hooks/useBusinessHours';
import { optimizedImageUrl } from '@/lib/utils';
import { hoursGroups } from '@/lib/businessHours';

const PATIO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/75533f8d0_IMG_8839.png';

export default function DateNight() {
  const businessHours = useBusinessHours();

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Date Night in Smiths Grove KY — Milkshakes & Burgers | Flavor Isle"
        description="Date night milkshakes and eats off I-65 at Flavor Isle in Smiths Grove, KY. Build your own shake, split a basket of fries, and make a night of it — 2 minutes from Exit 38."
        ogTitle="Date Night at Flavor Isle — Milkshakes & Eats Off I-65"
        ogDescription="A laid-back date night in Smiths Grove: build-your-own milkshakes, hand-patted burgers, no reservation needed. 2 minutes off I-65 Exit 38."
      />
      <Navbar />

      {/* Hero */}
      <section className="relative bg-patina-mint text-white overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img src={optimizedImageUrl(PATIO, 1600, 900)} alt="" width="1600" height="900" loading="eager" fetchPriority="high" decoding="async" className="w-full h-full object-cover" />
        </div>
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-smashie-yellow text-obsidian-roast px-4 py-1.5 rounded-full font-heading text-sm tracking-wide mb-6">
            <Heart size={16} /> DATE NIGHT OFF I-65
          </div>
          <h1 className="font-heading text-4xl sm:text-6xl leading-tight">
            Date Night Milkshakes &amp; Eats
          </h1>
          <p className="font-body text-lg sm:text-xl text-white/90 mt-4">
            Smiths Grove, KY · 2 minutes from I-65 Exit 38
          </p>
          <p className="font-body text-base text-white/80 mt-3 max-w-xl mx-auto">
            Build your own milkshake, split a basket of fries, and make it a night out. No reservation needed.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/menu" className="btn-cherry chrome-hover px-8 py-4 text-base font-heading flex items-center justify-center gap-2">
              Order for Pickup <ArrowRight size={18} />
            </Link>
            <Link to="/milkshakes" className="btn-yellow chrome-hover px-8 py-4 text-base font-heading flex items-center justify-center gap-2">
              See the Shakes
            </Link>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
        <p className="text-muted-foreground leading-relaxed">
          Flavor Isle is a Smiths Grove favorite and an easy stop on I-65. Take Exit 38, and you are 2 minutes away. Build your own milkshake, split a basket of fries, and make it a night out.
        </p>

        <h2 className="font-heading text-2xl sm:text-3xl text-obsidian-roast mt-10 mb-3">A Date Night Worth the Drive</h2>
        <p className="text-muted-foreground leading-relaxed">
          Mom and Dad, this one is for you. Couples drive in from Bowling Green, Scottsville and Glasgow for a laid-back night with no reservation needed. Pick your flavors, split a basket of fries, and take it to go or stay a while.
        </p>

        <h2 className="font-heading text-2xl sm:text-3xl text-obsidian-roast mt-10 mb-3">Easy to Reach From I-65</h2>
        <div className="card-diner p-6 space-y-2 text-muted-foreground">
          <p className="flex items-start gap-2">
            <Car size={17} className="mt-1 flex-none text-midnight-cherry" />
            <span>From Cave City: about 28 minutes south on I-65, Exit 38</span>
          </p>
          <p className="flex items-start gap-2">
            <Car size={17} className="mt-1 flex-none text-midnight-cherry" />
            <span>From Bowling Green: 15 minutes north on I-65, Exit 38</span>
          </p>
          <p className="flex items-start gap-2">
            <MapPin size={17} className="mt-1 flex-none text-midnight-cherry" />
            <span>103 N Main St, Smiths Grove, KY 42171</span>
          </p>
        </div>

        <h2 className="font-heading text-2xl sm:text-3xl text-obsidian-roast mt-10 mb-3">What to Order</h2>
        <p className="text-muted-foreground leading-relaxed">
          Try the Shake Isle and our hand-patted burgers. Order online and skip the wait.
        </p>
        <div className="flex flex-wrap gap-3 pt-6">
          <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm font-heading">
            Order for Pickup
          </Link>
          <a
            href="https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 text-sm font-heading rounded-full border-2 border-patina-mint text-patina-mint hover:bg-patina-mint hover:text-white transition-colors"
          >
            Get Directions
          </a>
        </div>
      </section>

      {/* Hours */}
      <section className="bg-patina-mint text-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 text-smashie-yellow font-heading text-sm tracking-widest mb-2">
              <Clock size={16} /> HOURS
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl">Open for Date Night</h2>
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
        <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">Make It a Night Out</h2>
        <p className="text-muted-foreground mt-3">Order ahead and it is ready when you park.</p>
        <Link to="/menu" className="btn-cherry chrome-hover px-10 py-4 text-base font-heading inline-flex items-center gap-2 mt-6">
          Order Online <ArrowRight size={18} />
        </Link>
        <div className="mt-8 flex flex-wrap gap-3 justify-center text-sm">
          <Link to="/milkshakes" className="text-patina-mint hover:text-midnight-cherry font-heading transition-colors">Shake Isle Milkshakes</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/i65-exit-38" className="text-patina-mint hover:text-midnight-cherry font-heading transition-colors">I-65 Exit 38 Guide</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/explore-smiths-grove" className="text-patina-mint hover:text-midnight-cherry font-heading transition-colors">Explore Smiths Grove</Link>
          <span className="text-muted-foreground">·</span>
          <Link to="/menu" className="text-patina-mint hover:text-midnight-cherry font-heading transition-colors">Full Menu</Link>
        </div>
      </section>

      <Footer />
      <CartDrawer />
    </div>
  );
}