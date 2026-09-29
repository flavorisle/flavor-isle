// "Review us on your favorite app" grid for the Reviews page. Each card is a
// direct link to Flavor Isle's verified profile so a happy customer can leave
// a review in one tap. URLs live here as the single source of truth — the
// Google review link is exported and reused by the page's own CTAs.
import React from 'react';
import { Star, Facebook, Instagram, ExternalLink } from 'lucide-react';
import ReviewNextSteps from '@/components/reviews/ReviewNextSteps';

export const GOOGLE_REVIEW_URL = 'https://g.page/r/CV6yjuufbFatEAE/review';

export const REVIEW_PLATFORMS = [
  {
    name: 'Google',
    note: 'Leave a Google review',
    href: GOOGLE_REVIEW_URL,
    tint: 'bg-amber-100',
    icon: <Star size={20} className="text-amber-600 fill-amber-500" />,
  },
  {
    name: 'Yelp',
    note: 'Leave a Yelp review',
    href: 'https://www.yelp.com/biz/flavor-isle-smiths-grove',
    tint: 'bg-red-100',
    mark: 'Y',
    markClass: 'text-red-700',
  },
  {
    name: 'Tripadvisor',
    note: 'Leave a Tripadvisor review',
    href: 'https://www.tripadvisor.com/Restaurant_Review-g39867-d942916-Reviews-Flavor_Isle-Smiths_Grove_Kentucky.html',
    tint: 'bg-green-100',
    mark: 'TA',
    markClass: 'text-green-700',
  },
  {
    name: 'Facebook',
    note: 'Recommend us on Facebook',
    href: 'https://facebook.com/flavorisle',
    tint: 'bg-blue-100',
    icon: <Facebook size={20} className="text-blue-600" />,
  },
  {
    name: 'Instagram',
    note: 'Tag @flavor_isle in your post',
    href: 'https://instagram.com/flavor_isle',
    tint: 'bg-pink-100',
    icon: <Instagram size={20} className="text-pink-600" />,
  },
  {
    name: 'Bing',
    note: 'Rate us on Bing Maps',
    href: 'https://www.bing.com/maps?q=Flavor+Isle+103+N+Main+St+Smiths+Grove+KY+42171',
    tint: 'bg-sky-100',
    mark: 'b',
    markClass: 'text-sky-700',
  },
  {
    name: 'Trustpilot',
    note: 'Leave a Trustpilot review',
    href: 'https://www.trustpilot.com/review/flavor-isle.com',
    tint: 'bg-emerald-100',
    mark: 'TP',
    markClass: 'text-emerald-700',
  },
];

export default function ReviewPlatformLinks() {
  return (
    <section className="bg-obsidian-roast px-4 sm:px-6 py-14">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="font-heading text-3xl sm:text-4xl text-white mb-2">Tried us lately? Review us on your favorite app.</h2>
          <p className="text-gray-300">
            One tap takes you straight to our page. Your review helps the next traveler find the Isle.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {REVIEW_PLATFORMS.map((p) => (
            <a
              key={p.name}
              href={p.href}
              target="_blank"
              rel="noopener noreferrer"
              className="card-diner px-4 py-3 flex items-center gap-3 group"
            >
              <div className={`w-10 h-10 rounded-full ${p.tint} flex items-center justify-center flex-shrink-0`}>
                {p.icon || <span className={`font-heading text-sm ${p.markClass}`}>{p.mark}</span>}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm text-obsidian-roast leading-none flex items-center gap-1.5">
                  {p.name}
                  <ExternalLink size={12} className="opacity-0 group-hover:opacity-60 transition-opacity" />
                </p>
                <p className="text-xs text-muted-foreground mt-1 truncate">{p.note}</p>
              </div>
            </a>
          ))}
        </div>
        <ReviewNextSteps />
      </div>
    </section>
  );
}