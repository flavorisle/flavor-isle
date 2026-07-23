import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function OurStory() {
  return (
    <section className="py-20 px-4 sm:px-6" style={{ background: '#F6F1E3' }}>
      <div className="max-w-3xl mx-auto">
        {/* Restaurant image */}
        <div className="rounded-2xl overflow-hidden shadow-float-lg mb-12">
          <img
            src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/7c655b439_IMG_8923.jpg"
            alt="Flavor Isle storefront"
            className="w-full h-72 sm:h-96 object-cover"
          />
        </div>

        {/* Story text */}
        <div>
          <p className="font-heading uppercase tracking-widest text-sm mb-3" style={{ color: '#d36a44' }}>
            Since 1964
          </p>
          <h2 className="font-heading uppercase text-3xl sm:text-4xl mb-3" style={{ color: '#B33900' }}>
            A Family Recipe for Community
          </h2>
          <div className="w-24 h-1 mb-6" style={{ background: '#D35400' }} />

          <p className="mb-5 leading-relaxed text-base" style={{ color: '#2C3E50' }}>
            Since its founding in the mid-1960s by Joyce Massey, Flavor Isle has been more than just
            a place to eat — it has been the heartbeat of Smiths Grove. Families gathered after
            school events, friends met for a bite, and locals stopped in for their favorite treat.
            Hotdogs for 15¢. Milkshakes for a quarter. Flavors that became traditions.
          </p>
          <p className="mb-5 leading-relaxed text-base" style={{ color: '#2C3E50' }}>
            Joyce passed the torch to her daughter Lesa Booker, who carried the legacy for nearly a
            decade — from 2014 through 2023. Today its operator is Ashley Booker — Joyce's
            granddaughter — and her brother Wesley, bringing the restaurant into the modern era. New
            menu additions. Online ordering. A rewards program. But the same hand-patted burgers,
            the same milkshakes, the same no-shortcuts standard as day one.
          </p>
          <p className="mb-8 leading-relaxed text-base" style={{ color: '#2C3E50' }}>
            We've fed generations of families, welcomed weary travelers off I-65, and never
            once compromised on what makes us us. Whether you've been coming for decades or this
            is your first visit — you'll always feel at home here.
          </p>

          <Link
            to="/about"
            className="inline-flex items-center gap-2 font-heading uppercase text-sm tracking-wider hover:gap-3 transition-all"
            style={{ color: '#d36a44' }}
          >
            Read Our Full Story <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}