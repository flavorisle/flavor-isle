import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin } from 'lucide-react';

const HERO_PHOTO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/7c655b439_IMG_8923.jpg';
const SMASHIE_WAVE = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/1332ef4b2_IMG_9978.png';

export default function AboutHero() {
  return (
    <section className="relative bg-cover bg-center" style={{ backgroundImage: `url('${HERO_PHOTO}')` }}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-24 pb-20 text-white">
        <div className="flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 text-center md:text-left">
            <p className="inline-flex items-center gap-2 font-heading text-sm tracking-[0.2em] uppercase text-smashie-yellow mb-5">
              <MapPin size={14} /> Smiths Grove, Kentucky · Est. 1964
            </p>
            <h1 className="font-heading uppercase leading-[1.02] text-5xl sm:text-6xl md:text-7xl mb-6 drop-shadow-lg">
              Small Town.<br />Big Flavor.
            </h1>
            <p className="text-lg sm:text-xl max-w-xl mx-auto md:mx-0 font-body leading-relaxed drop-shadow mb-8">
              We're the burger and shake stop just off I-65 that Warren County has trusted for generations. Fresh, never-frozen beef, hand-patted every morning, and shakes spun one at a time.
            </p>
            <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-8 py-4 text-sm font-heading">
              See the Menu <ArrowRight size={16} />
            </Link>
          </div>
          <img
            src={SMASHIE_WAVE}
            alt="Smashie, the Flavor Isle mascot, waving hello"
            className="w-44 sm:w-56 md:w-64 object-contain drop-shadow-2xl flex-shrink-0"
          />
        </div>
      </div>
    </section>
  );
}