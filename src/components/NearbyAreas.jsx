import React from 'react';
import { MapPin, Navigation, Car, Mountain, Landmark, Store } from 'lucide-react';

// Nearby towns Flavor Isle draws customers from, with approximate drive time
// from Smiths Grove off I-65. Used for local SEO + wayfinding for travelers.
const NEARBY_TOWNS = [
  { name: 'Smiths Grove', note: 'Right here at home', time: '0 min' },
  { name: 'Park City', note: 'Exit 48 · I-65', time: '~12 min' },
  { name: 'Cave City', note: 'Exit 53 · I-65', time: '~21 min' },
  { name: 'Horse Cave', note: 'Exit 58 · I-65', time: '~20 min' },
  { name: 'Bowling Green', note: 'South on I-65', time: '~15 min' },
  { name: 'Brownsville', note: 'Near Mammoth Cave', time: '~23 min' },
  { name: 'Scottsville', note: 'South of Bowling Green', time: '~23 min' },
  { name: 'Glasgow', note: 'South of Cave City', time: '~24 min' },
];

// I-65 traveler attractions nearby — for folks passing through.
const ATTRACTIONS = [
  { icon: Mountain, name: 'Mammoth Cave National Park', note: 'World-famous caves · ~30 min' },
  { icon: Landmark, name: 'National Corvette Museum', note: 'Bowling Green · ~10 min' },
  { icon: Store, name: "Buc-ee's", note: 'Right here in Smiths Grove · ~2 min' },
];

const DIRECTIONS_URL = 'https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171';

export default function NearbyAreas({ hideCta = false }) {
  return (
    <section className="py-16 px-4 sm:px-6 bg-vanilla-malt">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-10">
          <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">You're Closer Than You Think</p>
          <h2 className="font-heading text-4xl text-obsidian-roast mb-3">A Quick Stop Off I-65</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
            Whether you're a local craving a hand-patted burger or an I-65 traveler heading to Mammoth Cave or the Corvette Museum, Flavor Isle is right off the interstate in Smiths Grove — just 0.7 miles (about 2 minutes) from I-65, easy on, easy off.
          </p>
        </div>

        {/* Nearby towns grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
          {NEARBY_TOWNS.map((town) => (
            <div
              key={town.name}
              className="card-diner p-4 text-center hover:border-midnight-cherry/40 transition-colors"
            >
              <p className="font-heading text-base text-obsidian-roast leading-tight">{town.name}</p>
              <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{town.note}</p>
              <p className="text-xs font-heading text-midnight-cherry mt-1.5">{town.time}</p>
            </div>
          ))}
        </div>

        {/* I-65 attractions */}
        <div className="rounded-3xl bg-obsidian-roast p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-5">
            <Car size={18} className="text-smashie-yellow" />
            <h3 className="font-heading text-lg text-white tracking-wide">Passing Through? Make Us Your Food Stop</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ATTRACTIONS.map((a) => (
              <div key={a.name} className="flex items-start gap-3 bg-white/5 rounded-2xl p-4 border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-smashie-yellow/15 flex items-center justify-center flex-shrink-0">
                  <a.icon size={18} className="text-smashie-yellow" />
                </div>
                <div>
                  <p className="font-heading text-sm text-white leading-tight">{a.name}</p>
                  <p className="text-[11px] text-gray-300 mt-1">{a.note}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA — hidden on pages that already show directions (e.g. landing FAQ box) */}
        {!hideCta && (
        <div className="text-center mt-8">
          <a
            href={DIRECTIONS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-cherry chrome-hover inline-flex items-center gap-2 px-7 py-3.5 text-sm font-heading"
          >
            <Navigation size={16} /> Get Directions to Flavor Isle
          </a>
          <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1.5">
            <MapPin size={12} /> 103 N Main St, Smiths Grove, KY 42171 · 0.7 mi / ~2 min from I-65
          </p>
        </div>
        )}
      </div>
    </section>
  );
}