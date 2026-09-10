// Compact "see / leave our Google reviews" card. Links out to the Flavor Isle
// Google listing — no API key or stored review data involved.
import React from 'react';
import { Star, ExternalLink } from 'lucide-react';

const SEARCH_URL = 'https://www.google.com/search?q=Flavor+Isle+Smiths+Grove+KY+reviews';

export default function GoogleReviewsCard({ className = '' }) {
  return (
    <div className={`card-diner p-6 text-center ${className}`}>
      <div className="flex items-center justify-center gap-1 mb-2">
        {[0, 1, 2, 3, 4].map(i => (
          <Star key={i} size={18} className="text-smashie-yellow fill-current" />
        ))}
      </div>
      <h3 className="font-heading text-2xl text-obsidian-roast tracking-wide">
        REVIEWS ON GOOGLE
      </h3>
      <p className="text-sm text-muted-foreground font-body mt-1 max-w-md mx-auto">
        See what folks around Smiths Grove are saying about our burgers and shakes — or add your own.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
        <a
          href={SEARCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-mint chrome-hover inline-flex items-center gap-2 px-5 py-3 text-sm tap-44"
        >
          Read Google Reviews <ExternalLink size={15} />
        </a>
        <a
          href={SEARCH_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-cherry chrome-hover inline-flex items-center gap-2 px-5 py-3 text-sm tap-44"
        >
          Leave a Review <Star size={15} />
        </a>
      </div>
    </div>
  );
}