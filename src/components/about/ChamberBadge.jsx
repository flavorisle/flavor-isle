// Compact "proud member" trust badge for the Barren County Chamber of Commerce.
// Sits at the bottom of the dark navy values section on the About page.
import React from 'react';
import { Award, ExternalLink } from 'lucide-react';

const CHAMBER_URL = 'https://www.barreninc.com/';

export default function ChamberBadge() {
  return (
    <a
      href={CHAMBER_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white/5 border border-white/15 hover:border-smashie-yellow/60 hover:bg-white/10 transition-colors tap-44"
    >
      <span className="w-9 h-9 rounded-full bg-smashie-yellow flex items-center justify-center flex-shrink-0">
        <Award size={18} className="text-patina-mint" />
      </span>
      <span className="text-left">
        <span className="block font-heading uppercase text-sm tracking-wider text-white leading-tight">
          Proud Member
        </span>
        <span className="block text-xs text-gray-300 font-body">
          Barren County Chamber of Commerce
        </span>
      </span>
      <ExternalLink size={14} className="text-gray-400 group-hover:text-smashie-yellow transition-colors flex-shrink-0" />
    </a>
  );
}