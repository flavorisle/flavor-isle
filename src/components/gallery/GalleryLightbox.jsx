import React, { useEffect } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { optimizedImageUrl } from '@/lib/utils';

export default function GalleryLightbox({ photos, index, onClose, onPrev, onNext }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onPrev();
      if (e.key === 'ArrowRight') onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext]);

  const photo = photos[index];
  if (!photo) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex flex-col items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 15, 30, 0.92)' }}
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close photo"
        className="absolute top-4 right-4 w-11 h-11 rounded-full flex items-center justify-center bg-white/15 text-white hover:bg-white/25 transition-colors"
      >
        <X size={20} />
      </button>

      <img
        src={optimizedImageUrl(photo.url, 1200, 1200, 'fit')}
        alt={photo.alt}
        width="1200"
        height="1200"
        decoding="async"
        className="max-h-[75vh] max-w-full rounded-2xl object-contain shadow-float-lg"
        onClick={(e) => e.stopPropagation()}
      />

      <div key={photo.url} className="mt-4 text-center text-white/90 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500" onClick={(e) => e.stopPropagation()}>
        <p className="font-heading text-lg tracking-wide">{photo.caption}</p>
        <p className="text-xs text-white/60 mt-1">{index + 1} of {photos.length}</p>
      </div>

      <div className="flex items-center gap-4 mt-5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onPrev}
          aria-label="Previous photo"
          className="w-12 h-12 rounded-full flex items-center justify-center bg-white/15 text-white hover:bg-white/25 transition-colors"
        >
          <ChevronLeft size={22} />
        </button>
        <button
          onClick={onNext}
          aria-label="Next photo"
          className="w-12 h-12 rounded-full flex items-center justify-center bg-white/15 text-white hover:bg-white/25 transition-colors"
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </div>
  );
}