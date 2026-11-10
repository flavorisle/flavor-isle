import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Star } from 'lucide-react';
import { EXTERNAL_REVIEWS } from '@/lib/externalReviews';

// The home page's single review block: three verified outside reviews
// (Tripadvisor, Facebook, Yelp) and a link to the full wall. It replaces the
// carousel below so there is one place on the page for proof, not two.
const FEATURED = EXTERNAL_REVIEWS.filter((review) =>
  ['Sydney L.', 'Holly W.', 'Jeff S.'].includes(review.name),
);

export default function HomeReviews() {
  return (
    <section className="py-14 px-4 sm:px-6 fall26-section" aria-labelledby="home-reviews-heading">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">What People Are Saying</p>
            <h2 id="home-reviews-heading" className="font-heading text-3xl sm:text-4xl text-obsidian-roast">
              Reviews from the road
            </h2>
          </div>
          <Link
            to="/reviews"
            className="inline-flex items-center gap-2 min-h-11 font-heading text-sm text-midnight-cherry hover:text-obsidian-roast transition-colors"
          >
            Read all reviews <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURED.map((review) => (
            <figure key={review.name} className="card-diner p-6 flex flex-col gap-4">
              <div className="flex gap-0.5" aria-label="5 out of 5 stars">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={15} className="text-smashie-yellow fill-smashie-yellow" aria-hidden="true" />
                ))}
              </div>
              <blockquote className="text-[15px] leading-relaxed text-muted-foreground flex-1">
                &ldquo;{review.text}&rdquo;
              </blockquote>
              <figcaption className="text-sm">
                <span className="font-heading text-obsidian-roast">{review.name}</span>
                <span className="text-muted-foreground"> · {review.source}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}