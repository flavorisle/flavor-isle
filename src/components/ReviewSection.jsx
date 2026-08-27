import React, { useState, useEffect } from 'react';
import { Star, Camera, X, CheckCircle, Share2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import ReviewForm from '@/components/ReviewForm';

const SHARE_URL = 'https://taste-isle-express.base44.app';

function ReviewCard({ review }) {
  const [shared, setShared] = useState(false);

  const handleShare = async () => {
    const text = `"${review.text}" — ${review.customer_name}, ${review.rating}★ on Flavor Isle`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Flavor Isle review', text, url: SHARE_URL });
      } else {
        await navigator.clipboard.writeText(`${text} — ${SHARE_URL}`);
        setShared(true);
        setTimeout(() => setShared(false), 2000);
      }
    } catch { /* user cancelled share */ }
  };

  return (
    <div className="card-diner p-6 flex flex-col gap-3">
      {review.photo_url && (
        <div className="w-full h-40 rounded-2xl overflow-hidden">
          <img src={review.photo_url} alt="Visit photo" className="w-full h-full object-cover" />
        </div>
      )}
      <div className="flex gap-1">
        {[...Array(5)].map((_, i) => (
          <Star key={i} size={14} className={i < review.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-200'} />
        ))}
      </div>
      <p className="text-muted-foreground text-sm leading-relaxed">"{review.text}"</p>
      <div className="flex items-center justify-between gap-2">
        <p className="font-heading text-sm text-obsidian-roast">— {review.customer_name}</p>
        <button
          onClick={handleShare}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-midnight-cherry transition-colors tap-44"
          aria-label="Share review"
        >
          {shared ? <><Check size={12} /> Copied!</> : <><Share2 size={12} /> Share</>}
        </button>
      </div>
    </div>
  );
}

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
    <section className="py-20 px-4 sm:px-6">
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

        {/* Review Grid */}
        {reviews.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {reviews.map(r => <ReviewCard key={r.id} review={r} />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
            {[
              { customer_name: 'Sarah M.', text: 'Best burger in Smiths Grove — hands down. The smash burger is everything!', rating: 5 },
              { customer_name: 'James T.', text: 'The milkshakes are thick and creamy. My kids beg to come here every weekend.', rating: 5 },
              { customer_name: 'Linda K.', text: 'Classic diner vibes with amazing food. The all-day breakfast is a must!', rating: 5 },
            ].map(r => <ReviewCard key={r.customer_name} review={r} />)}
          </div>
        )}

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