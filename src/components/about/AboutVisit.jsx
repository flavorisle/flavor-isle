import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Clock, ArrowRight } from 'lucide-react';
import useBusinessHours from '@/hooks/useBusinessHours';
import { hoursGroups } from '@/lib/businessHours';
import { optimizedImageUrl } from '@/lib/utils';

const STREET_PHOTO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/1ade54fbc_IMG_0427.jpeg';

export default function AboutVisit() {
  const businessHours = useBusinessHours();
  return (
    <section className="py-20 px-4 sm:px-6" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <img
          src={optimizedImageUrl(STREET_PHOTO, 800, 600)}
          alt="Flavor Isle walk-up window and picnic tables under the awning"
          width="800"
          height="600"
          loading="lazy"
          decoding="async"
          className="w-full aspect-[4/3] object-cover rounded-3xl shadow-float-lg"
        />
        <div>
          <p className="font-heading uppercase tracking-widest text-sm text-midnight-cherry mb-3">Come See Us</p>
          <h2 className="font-heading uppercase text-4xl sm:text-5xl leading-tight text-obsidian-roast mb-6">
            Main & First, Smiths Grove
          </h2>
          <div className="space-y-5 text-obsidian-roast">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="mt-0.5 text-midnight-cherry flex-shrink-0" />
              <a href="https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171" target="_blank" rel="noopener noreferrer" className="hover:text-midnight-cherry transition-colors">
                103 N Main St, Smiths Grove, KY 42171<br />
                <span className="text-sm text-muted-foreground">Exit 38 off I-65 · 15 minutes from Bowling Green</span>
              </a>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={20} className="mt-0.5 text-midnight-cherry flex-shrink-0" />
              <div className="text-sm space-y-1 w-full max-w-xs">
                {hoursGroups(businessHours).map((g) => (
                  <div key={g.days} className="flex justify-between gap-4">
                    <span className="font-semibold">{g.days}</span>
                    <span className="text-muted-foreground">{g.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-7 py-3.5 text-sm font-heading">
              Order Now <ArrowRight size={16} />
            </Link>
            <Link to="/contact" className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full border-2 border-border text-obsidian-roast font-heading text-sm hover:border-midnight-cherry/40 transition-colors">
              Contact & Directions
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}