import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Smartphone, Camera, Newspaper, ArrowRight } from 'lucide-react';

const LINKS = [
  { to: '/contact', icon: MapPin, title: 'Contact & Location', desc: 'Directions, hours, and how to reach us.' },
  { to: '/download', icon: Smartphone, title: 'Get the App', desc: 'Order faster and earn rewards from your phone.' },
  { to: '/gallery', icon: Camera, title: 'Gallery', desc: 'Real photos of our burgers and shakes, our restaurant, and our people.' },
  { to: '/community-news', icon: Newspaper, title: 'Community News', desc: 'Events, updates, and local partnerships.' },
];

export default function AboutExplore() {
  return (
    <section className="py-20 px-4 sm:px-6" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="font-heading uppercase tracking-widest text-sm text-midnight-cherry mb-3">Keep Exploring</p>
          <h2 className="font-heading uppercase text-4xl sm:text-5xl leading-tight text-obsidian-roast">More From Flavor Isle</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {LINKS.map(({ to, icon: Icon, title, desc }) => (
            <Link key={to} to={to} className="card-diner p-7 group">
              <div className="w-12 h-12 rounded-2xl bg-patina-mint flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Icon size={22} className="text-white" />
              </div>
              <h3 className="font-heading uppercase text-xl text-obsidian-roast mb-2 group-hover:text-midnight-cherry transition-colors">{title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{desc}</p>
              <span className="inline-flex items-center gap-1 text-sm font-heading text-midnight-cherry group-hover:gap-2 transition-all">
                Open <ArrowRight size={14} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}