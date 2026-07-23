import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function TestimonialsBanner() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.Review.filter({ is_approved: true }, '-created_date', 6)
      .then((data) => {
        setReviews(data || []);
        setLoading(false);
      })
      .catch(() => {
        setReviews([]);
        setLoading(false);
      });
  }, []);

  return (
    <section className="py-20 px-4 sm:px-6" style={{ background: '#0B355A' }}>
      <div className="text-center mb-12">
        <p className="font-heading uppercase tracking-widest text-sm mb-3" style={{ color: '#FFD700' }}>
          What People Are Saying
        </p>
        <h2 className="font-heading uppercase text-4xl sm:text-5xl text-white">Real Guests. Real Love.</h2>
      </div>

      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-6">
        {loading && (
          <div className="sm:col-span-2 text-center text-white/70 font-body py-10">
            Loading guest love…
          </div>
        )}
        {!loading && reviews.length === 0 && (
          <div className="sm:col-span-2 text-center text-white/70 font-body py-10">
            Be the first to leave a review.
          </div>
        )}
        {reviews.map((r) => (
          <div key={r.id} className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex gap-1 mb-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  className={i < Math.round(r.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-white/30'}
                />
              ))}
            </div>
            <p className="text-white/90 mb-4 leading-relaxed line-clamp-4">&ldquo;{r.text}&rdquo;</p>
            <p className="font-heading uppercase text-sm tracking-wide" style={{ color: '#FFD700' }}>
              — {r.customer_name}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}