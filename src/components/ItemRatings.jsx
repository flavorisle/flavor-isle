import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, ChevronLeft, ChevronRight, X } from 'lucide-react';
import ReviewForm from './ReviewForm';

// Module-level cache so every ItemRatings card on a page shares ONE fetch of
// the approved-reviews list instead of each card pulling it separately (which
// triggered rate limits and UI jank on menu-heavy pages).
let approvedReviewsCache = null;
let approvedReviewsPromise = null;
function loadApprovedReviews() {
  if (approvedReviewsCache) return Promise.resolve(approvedReviewsCache);
  if (!approvedReviewsPromise) {
    approvedReviewsPromise = base44.entities.Review.filter({ is_approved: true })
      .then(data => { approvedReviewsCache = data || []; return approvedReviewsCache; })
      .catch(() => { approvedReviewsPromise = null; return []; });
  }
  return approvedReviewsPromise;
}

// Shows approved reviews for a specific menu item (matched by menu_item_id,
// with a name-match fallback for legacy reviews) and lets a customer rate
// the item directly from the menu card.
export default function ItemRatings({ item, itemName }) {
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);

  const name = item?.name || itemName || '';

  useEffect(() => {
    let cancelled = false;
    loadApprovedReviews().then(data => {
      if (cancelled) return;
      let itemReviews = [];
      if (item?.id) {
        itemReviews = (data || []).filter(r => r.menu_item_id === item.id);
      }
      // Fallback to name match for older reviews not linked to an item id.
      // Match against the review's menu_item_name snapshot, NOT the
      // reviewer's customer_name (that matched the wrong reviews to items).
      if (itemReviews.length === 0 && name) {
        const lower = name.toLowerCase();
        itemReviews = (data || []).filter(r =>
          !r.menu_item_id && r.menu_item_name &&
          r.menu_item_name.toLowerCase() === lower
        );
      }

      if (itemReviews.length > 0) {
        const avg = (itemReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / itemReviews.length).toFixed(1);
        setAvgRating(avg);
        setReviews(itemReviews.slice(0, 10));
      } else {
        setReviews([]);
      }
    });
    return () => { cancelled = true; };
  }, [item?.id, name]);

  const withPhotos = reviews.filter(r => r.photo_url);

  return (
    <div className="mt-3 space-y-3">
      {reviews.length > 0 && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  size={14}
                  className={i < Math.floor(avgRating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                />
              ))}
            </div>
            <span className="text-xs font-heading text-obsidian-roast">{avgRating}</span>
            <span className="text-xs text-muted-foreground">({reviews.length})</span>
          </div>

          {withPhotos.length > 0 && (
            <div className="relative group">
              <img
                src={withPhotos[photoIndex].photo_url}
                alt={withPhotos[photoIndex].customer_name}
                className="w-full h-24 object-cover rounded-lg"
              />
              {withPhotos.length > 1 && (
                <>
                  <button
                    onClick={() => setPhotoIndex((photoIndex - 1 + withPhotos.length) % withPhotos.length)}
                    className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button
                    onClick={() => setPhotoIndex((photoIndex + 1) % withPhotos.length)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <ChevronRight size={14} />
                  </button>
                </>
              )}
            </div>
          )}

          {reviews[0] && (
            <div className="text-xs text-muted-foreground line-clamp-2 italic">
              "{reviews[0].text}"
            </div>
          )}
        </>
      )}

      <button
        onClick={() => setShowReviewForm(true)}
        className="flex items-center gap-1.5 text-xs font-semibold text-patina-mint hover:text-teal-700 transition-colors tap-44"
      >
        <Star size={12} className="fill-current" />
        {justSubmitted ? 'Thanks for rating!' : 'Rate this item'}
      </button>

      {showReviewForm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowReviewForm(false)}>
          <div className="bg-white rounded-3xl shadow-float-lg w-full max-w-lg p-8 relative max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setShowReviewForm(false)} className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors z-10">
              <X size={20} />
            </button>
            <h3 className="font-heading text-2xl text-obsidian-roast mb-1">Rate {name}</h3>
            <p className="text-muted-foreground text-sm mb-6">Tell the crew how this item hit.</p>
            <ReviewForm
              menuItem={item ? { id: item.id, name } : null}
              submitLabel="Submit Rating"
              onSuccess={() => { setJustSubmitted(true); setShowReviewForm(false); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}