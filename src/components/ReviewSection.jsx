import React, { useState, useEffect } from 'react';
import { Camera, X, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ReviewForm from '@/components/ReviewForm';
import ReviewCarousel from '@/components/ReviewCarousel';

export default function ReviewSection() {
  const [reviews, setReviews] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    base44.entities.Review.filter({ is_approved: true })
      .then(data => setReviews(data || []))
      .catch(() => {});
  }, []);

  return (
    <section className="pt-20 pb-8 px-4 sm:px-6 fall26-section">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-4">
          <div>
            <p className="text-patina-mint text-sm font-heading uppercase tracking-widest mb-2">Smiths Grove Loves Flavor Isle</p>
            <h2 className="font-heading text-4xl text-obsidian-roast">What Our Neighbors Are Saying</h2>
          </div>
          {!submitted ? (
            <button
              onClick={() => setShowForm(true)}
              className="btn-cherry chrome-hover px-6 py-3 text-sm flex items-center gap-2 flex-shrink-0"
            >
              <Camera size={16} /> Share Your Experience
            </button>
          ) : (
            <div className="flex items-center gap-2 text-patina-mint font-semibold text-sm">
              <CheckCircle size={18} /> Thanks for your review!
            </div>
          )}
        </div>

        {/* Real approved customer reviews — swipeable carousel */}
        <div className="mb-10">
          <ReviewCarousel reviews={reviews} />
        </div>

        {/* Submit Form Modal — uses the shared ReviewForm, so reviews posted
            here land in the same Review feed and show up after approval. */}
        {showForm && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-float-lg w-full max-w-lg p-8 relative">
              <button onClick={() => setShowForm(false)} className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors">
                <X size={20} />
              </button>
              <h3 className="font-heading text-2xl text-obsidian-roast mb-1">Share Your Visit</h3>
              <p className="text-muted-foreground text-sm mb-6">Your review will appear after approval.</p>

              <ReviewForm
                submitLabel="Submit Review"
                onSuccess={() => { setSubmitted(true); setShowForm(false); }}
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}