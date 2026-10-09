import React from 'react';
import { Facebook, Star } from 'lucide-react';
import { GOOGLE_REVIEW_URL } from '@/components/ReviewPlatformLinks';

export default function ReviewsRatings() {
  return (
    <section className="bg-patina-mint px-4 sm:px-6 py-10" aria-label="Flavor Isle review ratings">
      <div className="max-w-5xl mx-auto flex flex-wrap items-stretch justify-center gap-3">
        <div className="bg-card text-card-foreground rounded-xl px-5 py-4 flex items-center gap-3 min-w-[200px]">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center"><Facebook size={20} className="text-blue-600" /></div>
          <div><p className="font-heading text-xl leading-none">90%</p><p className="text-sm text-muted-foreground">249 reviews · Facebook</p></div>
        </div>
        <div className="bg-card text-card-foreground rounded-xl px-5 py-4 flex items-center gap-3 min-w-[200px]">
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center"><span className="font-heading text-xs text-green-700">TA</span></div>
          <div><p className="font-heading text-xl leading-none">4.5/5</p><p className="text-sm text-muted-foreground">30 reviews · Tripadvisor</p></div>
        </div>
        <a href={GOOGLE_REVIEW_URL} target="_blank" rel="noopener noreferrer" className="bg-card text-card-foreground rounded-xl px-5 py-4 flex items-center gap-3 min-w-[200px] hover:shadow-float-lg transition-shadow">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center"><Star size={20} className="text-amber-600 fill-amber-500" /></div>
          <div><p className="font-heading text-xl leading-none">4.7</p><p className="text-sm text-muted-foreground">445 reviews · Google</p></div>
        </a>
      </div>
    </section>
  );
}