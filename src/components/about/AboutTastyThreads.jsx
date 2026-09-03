import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Shirt } from 'lucide-react';

const TEES = [
  { id: 462593857, name: 'All You Need is Flavor Isle', image: 'https://files.cdn.printful.com/files/196/1969f01ea3bcd65b3ee5d20ee0897ca5_preview.png' },
  { id: 462577528, name: "Feed Me Flavor Isle & Tell Me I'm Pretty", image: 'https://files.cdn.printful.com/files/e3e/e3e9215aebc273152926012ae11e2a1d_preview.png' },
];

export default function AboutTastyThreads() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-background">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="inline-flex items-center gap-2 font-heading uppercase tracking-widest text-sm text-midnight-cherry mb-3">
            <Shirt size={14} /> Since 2023
          </p>
          <h2 className="font-heading uppercase text-4xl sm:text-5xl leading-tight text-obsidian-roast mb-6">
            Tasty Threads
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p className="text-obsidian-roast text-lg">
              Flavor Isle's official online merch store, launched in 2023.
            </p>
            <p>
              Our regulars asked for a way to wear the flavor home, so we made it happen. Tasty Threads is where you'll find Flavor Isle tees, hoodies, hats, and more — each one printed to order in your size and color and shipped straight to your door.
            </p>
            <p>
              Every design comes from the same place our food does: Smiths Grove pride, a little humor, and zero shortcuts.
            </p>
          </div>
          <Link to="/merch" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-7 py-3.5 text-sm font-heading mt-8">
            Shop Tasty Threads <ArrowRight size={16} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {TEES.map((t) => (
            <Link key={t.id} to={`/merch?product=${t.id}`} className="card-diner overflow-hidden group">
              <div className="aspect-square overflow-hidden bg-white">
                <img
                  src={t.image}
                  alt={`${t.name} tee`}
                  className="w-full h-full object-cover scale-[1.7] group-hover:scale-[1.8] transition-transform duration-500"
                  style={{ transformOrigin: '50% 42%' }}
                />
              </div>
              <p className="p-3 font-heading text-sm leading-tight text-obsidian-roast">{t.name}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}