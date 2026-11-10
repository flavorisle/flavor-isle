import React from 'react';
import { MapPin, Phone, Clock, Navigation, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import useBusinessHours from '@/hooks/useBusinessHours';
import { hoursGroups } from '@/lib/businessHours';

// Address, phone, directions and live hours — carried over from the old
// square.flavor-isle.com/visit-us page so visitors land on one page.
export default function LocationHours() {
  const businessHours = useBusinessHours();

  return (
    <section id="location" className="max-w-5xl mx-auto px-4 sm:px-6 py-14 scroll-mt-24">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 text-midnight-cherry font-heading text-sm tracking-widest mb-2">
          <MapPin size={16} /> FIND US
        </div>
        <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">Location &amp; Hours</h2>
        <p className="text-muted-foreground mt-2">Right off Exit 38 in Smiths Grove, Kentucky.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card-diner p-6">
          <h3 className="font-heading text-2xl text-obsidian-roast">Flavor Isle</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mt-2">
            103 N Main St<br />
            Smiths Grove, KY 42171-8323
          </p>
          <a href="tel:+12705634618" className="inline-flex items-center gap-2 text-patina-mint font-heading text-sm mt-4 hover:text-midnight-cherry transition-colors">
            <Phone size={15} /> (270) 563-4618
          </a>
          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href="https://www.google.com/maps/dir/?api=1&destination=103+N+Main+St+Smiths+Grove+KY+42171-8323"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-cherry chrome-hover inline-flex items-center gap-2 px-5 py-2.5 text-sm font-heading"
            >
              <Navigation size={15} /> Get Directions
            </a>
            <Link to="/menu" className="btn-mint chrome-hover inline-flex items-center gap-2 px-5 py-2.5 text-sm font-heading">
              Order Online <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        <div className="card-diner p-6">
          <h3 className="font-heading text-2xl text-obsidian-roast flex items-center gap-2">
            <Clock size={18} className="text-midnight-cherry" /> Hours
          </h3>
          <div className="mt-3 space-y-2 text-sm">
            {hoursGroups(businessHours).map((g) => (
              <div key={g.days} className="flex justify-between gap-4 border-b border-border pb-2">
                <span className="text-muted-foreground">{g.days}</span>
                <span className="font-heading text-obsidian-roast">{g.label}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4">Kitchen closes 30 minutes before close. Order ahead to skip the wait.</p>
        </div>
      </div>
    </section>
  );
}