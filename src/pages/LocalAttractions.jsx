import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Mountain, Car, Trees, Landmark, Compass, Clock, ArrowRight, Navigation, Camera } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';

// Nearby landmarks and activities around Smiths Grove, KY — helps I-65
// travelers and visitors plan a stop at Flavor Isle into a fuller day out.
const ATTRACTIONS = [
  {
    icon: Mountain,
    name: 'Mammoth Cave National Park',
    distance: '~30 min south on I-65',
    blurb: "The world's longest known cave system. Ranger-led tours, hiking trails, and a visitor center — a must-do day trip from the Isle.",
    map: 'https://www.google.com/maps/search/?api=1&query=Mammoth+Cave+National+Park',
  },
  {
    icon: Car,
    name: 'National Corvette Museum',
    distance: '~15 min south in Bowling Green',
    blurb: "Showcases of America's sports car, including the famous sinkhole exhibit. A quick, air-conditioned stop for car lovers.",
    map: 'https://www.google.com/maps/search/?api=1&query=National+Corvette+Museum+Bowling+Green+KY',
  },
  {
    icon: Compass,
    name: 'Corvette Assembly Plant',
    distance: '~15 min south in Bowling Green',
    blurb: 'The only place Corvettes are built. Tours run seasonally — check ahead for availability and reserve early.',
    map: 'https://www.google.com/maps/search/?api=1&query=Bowling+Green+Assembly+Plant+KY',
  },
  {
    icon: Trees,
    name: 'Lost River Cave',
    distance: '~15 min south in Bowling Green',
    blurb: 'A guided underground boat tour through a natural cave, plus valley trails and a butterfly habitat. Great for families.',
    map: 'https://www.google.com/maps/search/?api=1&query=Lost+River+Cave+Bowling+Green+KY',
  },
  {
    icon: Landmark,
    name: 'Historic Railpark & Train Museum',
    distance: '~15 min south in Bowling Green',
    blurb: 'Restored 1925 L&N depot with railcars you can walk through and exhibits on Kentucky railroad history.',
    map: 'https://www.google.com/maps/search/?api=1&query=Historic+Railpark+Train+Museum+Bowling+Green+KY',
  },
  {
    icon: Camera,
    name: 'Riverview at Hobson Grove',
    distance: '~15 min south in Bowling Green',
    blurb: 'A restored 1860s Italianate mansion overlooking the Barren River. Guided tours tell the story of the Civil War era.',
    map: 'https://www.google.com/maps/search/?api=1&query=Riverview+at+Hobson+Grove+Bowling+Green+KY',
  },
  {
    icon: Compass,
    name: 'Beech Bend Park',
    distance: '~15 min south in Bowling Green',
    blurb: 'A classic amusement park with roller coasters, a water park, and a drag strip — seasonal hours, check before you go.',
    map: 'https://www.google.com/maps/search/?api=1&query=Beech+Bend+Park+Bowling+Green+KY',
  },
  {
    icon: Landmark,
    name: 'Smiths Grove Historic District',
    distance: 'Walkable from Flavor Isle',
    blurb: 'A quiet Main Street of antique shops, historic homes, and small-town charm — right outside our door at 103 N Main St.',
    map: 'https://www.google.com/maps/search/?api=1&query=Smiths+Grove+KY+downtown',
  },
];

export default function LocalAttractions() {
  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Local Attractions Near Flavor Isle | Smiths Grove, KY"
        description="Plan your day around Flavor Isle — Mammoth Cave, the National Corvette Museum, Lost River Cave, and more, all minutes from I-65 Exit 38 in Smiths Grove, KY."
      />
      <Navbar />
      <CartDrawer />

      {/* Hero */}
      <section className="bg-patina-mint text-white px-4 sm:px-6 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-smashie-yellow text-obsidian-roast px-4 py-1.5 rounded-full font-heading text-sm tracking-wide mb-6">
            <MapPin size={16} /> SMITHS GROVE, KY · I-65 EXIT 38
          </div>
          <h1 className="font-heading text-4xl sm:text-6xl leading-tight">
            Make a Day of It
          </h1>
          <p className="font-body text-lg text-white/90 mt-4 max-w-xl mx-auto">
            Flavor Isle sits right off I-65 Exit 38 — the perfect fuel stop on your way to Mammoth Cave, the Corvette Museum, and Bowling Green's best attractions.
          </p>
        </div>
      </section>

      {/* Intro band */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10 text-center">
        <p className="text-muted-foreground leading-relaxed">
          Grab a hand-patted burger and a thick shake, then explore what's around. Here's what's nearby — all within about 30 minutes of our counter.
        </p>
      </section>

      {/* Attractions grid */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-14">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ATTRACTIONS.map((a) => (
            <div key={a.name} className="card-diner p-6 flex gap-4">
              <div className="w-12 h-12 rounded-full bg-midnight-cherry/10 flex items-center justify-center flex-shrink-0">
                <a.icon size={22} className="text-midnight-cherry" />
              </div>
              <div className="min-w-0">
                <h2 className="font-heading text-xl text-obsidian-roast leading-tight">{a.name}</h2>
                <p className="flex items-center gap-1.5 text-xs text-patina-mint font-heading tracking-wide uppercase mt-1">
                  <Clock size={12} /> {a.distance}
                </p>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">{a.blurb}</p>
                <a
                  href={a.map}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-heading text-midnight-cherry hover:text-patina-mint transition-colors mt-3"
                >
                  <Navigation size={14} /> Get directions <ArrowRight size={14} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="bg-obsidian-roast text-white px-4 sm:px-6 py-14">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-3xl sm:text-4xl mb-2">Fuel up before you explore</h2>
          <p className="text-gray-300 mb-6">Order ahead online and pick up on your way through — no wait, no detour.</p>
          <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-8 py-4 text-base font-heading">
            Order Online <ArrowRight size={18} />
          </Link>
          <div className="mt-6 flex flex-wrap gap-3 justify-center text-sm">
            <Link to="/i65-exit-38" className="text-smashie-yellow hover:text-white font-heading transition-colors">I-65 Exit 38 Guide</Link>
            <span className="text-white/30">·</span>
            <Link to="/mammoth-cave-dining" className="text-smashie-yellow hover:text-white font-heading transition-colors">Mammoth Cave Dining</Link>
            <span className="text-white/30">·</span>
            <Link to="/corvette-car-clubs" className="text-smashie-yellow hover:text-white font-heading transition-colors">Corvette Car Clubs</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}