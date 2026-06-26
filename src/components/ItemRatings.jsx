import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Star, ChevronLeft, ChevronRight } from 'lucide-react';

export default function ItemRatings({ itemName }) {
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(0);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    base44.entities.Review.filter({ is_approved: true })
      .then(data => {
        const itemReviews = (data || []).filter(r => 
          r.customer_name && (r.customer_name.toLowerCase().includes(itemName.toLowerCase()) || 
          itemName.toLowerCase().includes(r.customer_name.toLowerCase()))
        );
        
        if (itemReviews.length > 0) {
          const avg = (itemReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / itemReviews.length).toFixed(1);
          setAvgRating(avg);
          setReviews(itemReviews.slice(0, 10));
        }
      })
      .catch(() => {});
  }, [itemName]);

  if (reviews.length === 0) return null;

  const withPhotos = reviews.filter(r => r.photo_url);

  return (
    <div className="mt-4 space-y-3">
      {/* Rating summary */}
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

      {/* Photos carousel */}
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

      {/* Latest review snippet */}
      {reviews[0] && (
        <div className="text-xs text-muted-foreground line-clamp-2 italic">
          "{reviews[0].text}"
        </div>
      )}
    </div>
  );
}