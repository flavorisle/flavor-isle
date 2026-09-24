import React from 'react';
import { Link } from 'react-router-dom';
import { Mountain, Car, Clock, Dog, ArrowRight } from 'lucide-react';

// "Just Passing Through?" — traveler welcome section on the About page.
// Anchored at #traveler-tips so the global footer link can jump straight to it.
const TIPS = [
  { icon: Mountain, text: 'Mammoth Cave National Park is about 30 minutes away — book cave tours ahead at recreation.gov.' },
  { icon: Car, text: 'The National Corvette Museum is about 15 minutes up I-65 at Exit 28; Corvette plant tours need reservations.' },
  { icon: Clock, text: "We're a small-town diner, so check our hours before you swing by." },
  { icon: Dog, text: 'Traveling with a four-legged copilot? Ask for curbside pickup and we\'ll bring it out.' },
];

export default function AboutTraveler() {
  return (
    <section id="traveler-tips" className="py-20 px-4 sm:px-6 bg-patina-mint text-white">
      <div className="max-w-3xl mx-auto">
        <p className="font-heading uppercase tracking-widest text-sm text-smashie-yellow mb-3">Road Trip Ready</p>
        <h2 className="font-heading uppercase text-4xl sm:text-5xl leading-tight mb-6">Just Passing Through?</h2>
        <p className="text-lg text-white/90 leading-relaxed mb-8">
          Rolling down I-65? We're 0.7 miles off Exit 38 — take the exit and you'll find us on the left. Hand-patted burgers, thick shakes, and food that comes out fast when you're covering miles.
        </p>
        <ul className="space-y-4 mb-8">
          {TIPS.map((t, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <t.icon size={18} className="text-smashie-yellow" />
              </span>
              <span className="text-white/90 leading-relaxed pt-1">{t.text}</span>
            </li>
          ))}
        </ul>
        <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-7 py-3.5 text-sm font-heading">
          Order Ahead <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  );
}