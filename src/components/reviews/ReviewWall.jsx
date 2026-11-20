import React from 'react';
import PhotoTile from '@/components/ui/PhotoTile';
import { CATEGORY_PHOTOS } from '@/lib/categoryPhotos';

// Photo-forward wall of the verified external reviews (issue #339).
//
// A dish tag is only ever a dish the reviewer actually named in their own
// words — the tags are read from the review text, never assigned by hand — and
// the photo is the site's real photograph for that dish. When a review names a
// dish we have no photograph of, the card falls back to the house burger photo.
// No review is added, removed, shortened or reworded.
const DISHES = [
  { test: /milkshake|shake/i, tag: 'Milkshake', photo: CATEGORY_PHOTOS['Whirl & Twirl'] },
  { test: /cheeseburger|burger/i, tag: 'Burger', photo: CATEGORY_PHOTOS['Old-Fashioned Burgers'] },
  { test: /onion rings/i, tag: 'Onion rings', photo: CATEGORY_PHOTOS['Snack & Munch'] },
  { test: /fries/i, tag: 'Fries', photo: CATEGORY_PHOTOS['Crunch & Munch'] },
  { test: /ice cream/i, tag: 'Ice cream', photo: CATEGORY_PHOTOS['Blend & Bliss'] },
  { test: /chili dog|hot dog|chuck wagon/i, tag: 'Chili dog', photo: null },
  { test: /pork tenderloin/i, tag: 'Pork tenderloin', photo: null },
  { test: /fried mushrooms/i, tag: 'Fried mushrooms', photo: null },
  { test: /mozzarella sticks/i, tag: 'Mozzarella sticks', photo: null },
];

const FALLBACK_PHOTO = CATEGORY_PHOTOS['Old-Fashioned Burgers'];

function dishFor(review) {
  const text = review.text || '';
  const hits = DISHES.filter((dish) => dish.test.test(text));
  return {
    tags: hits.slice(0, 2).map((dish) => dish.tag),
    photo: (hits.find((dish) => dish.photo) || {}).photo || FALLBACK_PHOTO,
  };
}

export default function ReviewWall({ reviews = [] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {reviews.map((review, i) => {
        const { tags, photo } = dishFor(review);
        return (
          <figure
            key={`${review.name}-${i}`}
            className="overflow-hidden rounded-2xl border border-border bg-white shadow-[0_2px_10px_rgba(0,0,0,0.06)]"
          >
            <PhotoTile imageUrl={photo.url} alt={photo.alt} size="lg" className="rounded-none" />
            <div className="p-4">
              {tags.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-patina-mint/10 px-2 py-0.5 text-xs font-semibold text-patina-mint">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <blockquote className="text-sm leading-relaxed text-obsidian-roast">{`“${review.text}”`}</blockquote>
              <figcaption className="mt-3 flex items-center justify-between gap-2 text-xs">
                <span className="font-semibold text-obsidian-roast">{review.name}</span>
                <span className="text-muted-foreground">{review.source}</span>
              </figcaption>
            </div>
          </figure>
        );
      })}
    </div>
  );
}