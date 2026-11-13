import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import { optimizedImageUrl } from '@/lib/utils';

const PATIO_PHOTO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/75533f8d0_IMG_8839.png';
const MAPS_URL = 'https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171';

// Date night lives on its own page. The home page keeps no date-night content.
export default function DateNight() {
  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Date Night Near Bowling Green KY — Milkshakes & Burgers Off I-65 | Flavor Isle"
        description="Date night 15 minutes north of Bowling Green at Flavor Isle in Smiths Grove. Build your own milkshake, split a basket of fries, two minutes off I-65 Exit 38."
        ogTitle="Date Night in Smiths Grove — Flavor Isle"
        ogDescription="Milkshakes, burgers and a patio worth the drive from Bowling Green. Two minutes off I-65 Exit 38."
      />
      <Navbar />
      <CartDrawer />

      <section className="bg-obsidian-roast text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 text-center">
          <p className="font-heading uppercase tracking-widest text-sm text-smashie-yellow mb-4">Smiths Grove · I-65 Exit 38</p>
          <h1 className="font-heading uppercase text-4xl sm:text-5xl leading-tight">Date Night in Smiths Grove</h1>
          <p className="text-white/85 text-lg mt-4 max-w-2xl mx-auto">Milkshakes, burgers and a patio worth the drive from Bowling Green.</p>
        </div>
      </section>

      <section id="date-night" className="py-14 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast mb-6">
            Flavor Isle: Date Night Milkshakes &amp; Eats Off I-65 in Smiths Grove, KY
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
            <div className="space-y-4 text-muted-foreground leading-relaxed">
              <p>
                Flavor Isle is a Smiths Grove favorite and an easy stop on I-65. Take exit 38, and you are 2 minutes away. Build your own milkshake, split a basket of fries, and make it a night out.
              </p>
              <h3 className="font-heading text-xl text-obsidian-roast pt-2">A Date Night Worth the Drive</h3>
              <p>
                Mom and Dad, this one is for you. Couples drive in from Bowling Green, Scottsville, Glasgow, Brownsville, Cave City and Westmoreland, TN for a laid-back night with no reservation needed. Pick your flavors, split a basket of fries, and take it to go or stay a while.
              </p>
              <h3 className="font-heading text-xl text-obsidian-roast pt-2">Easy to Reach From I-65</h3>
              <div className="space-y-1">
                <p>From Cave City: about 28 minutes south on I-65, exit 38</p>
                <p>From Bowling Green: 15 minutes north on I-65, exit 38</p>
                <p>Address: 103 N Main St, Smiths Grove, KY 42171. Hours: Mon–Thu 10:30 AM–7 PM, Fri–Sat 10:30 AM–8 PM, Sun 11 AM–7 PM</p>
              </div>
              <h3 className="font-heading text-xl text-obsidian-roast pt-2">What to Order</h3>
              <p>Try the Shake Isle and our hand-patted burgers. Order online and skip the wait.</p>
              <p>
                Make a night of it: <Link to="/explore-smiths-grove" className="underline underline-offset-4 text-midnight-cherry font-semibold">our Explore Smiths Grove guide</Link> points you to the shops and stops a short walk from our door.
              </p>
              <div className="flex flex-wrap gap-3 pt-2">
                <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm font-heading">
                  Order for Pickup
                </Link>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-heading rounded-full border-2 border-patina-mint text-patina-mint hover:bg-patina-mint hover:text-white transition-colors"
                >
                  Get Directions
                </a>
                <Link to="/explore-smiths-grove" className="inline-flex items-center gap-2 px-6 py-3 text-sm font-heading rounded-full border-2 border-midnight-cherry text-midnight-cherry hover:bg-midnight-cherry hover:text-white transition-colors">
                  Explore Smiths Grove <ArrowRight size={16} />
                </Link>
              </div>
            </div>
            <img
              src={optimizedImageUrl(PATIO_PHOTO, 800, 600)}
              alt="Summer evenings on the patio at Flavor Isle"
              width="800"
              height="600"
              loading="lazy"
              decoding="async"
              className="w-full aspect-[4/3] object-cover rounded-3xl shadow-float"
            />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}