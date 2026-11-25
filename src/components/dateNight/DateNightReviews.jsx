import React from 'react';
import { DATE_NIGHT_REVIEWS } from '@/lib/dateNightReviews';

// Reviews that appear only here (issue #358). The data lives in
// src/lib/dateNightReviews.js so the wording and dates can be filled in once,
// without touching this markup.
export default function DateNightReviews() {
  return (
    <section className="dn2-block">
      <h2 className="dn2-h">What folks say</h2>

      <div className="dn2-reviews">
        {DATE_NIGHT_REVIEWS.map((review) => (
          <article key={review.name} className="dn2-review">
            <p className="dn2-review-name">{review.name}</p>
            <p className="dn2-review-meta">
              {review.source}
              {review.date ? ` · ${review.date}` : ''}
            </p>
            {review.quote ? (
              <p className="dn2-review-quote">{review.quote}</p>
            ) : review.highlight ? (
              <p className="dn2-review-quote">Wrote about the {review.highlight}.</p>
            ) : null}
            <a
              className="dn2-review-link"
              href={review.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read it on Google
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}