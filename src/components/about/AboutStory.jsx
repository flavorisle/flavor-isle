import React from 'react';

const DINER_PHOTO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/e0abb3484_IMG_8841.png';

export default function AboutStory() {
  return (
    <section className="py-20 px-4 sm:px-6" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div className="order-2 md:order-1">
          <p className="font-heading uppercase tracking-widest text-sm text-midnight-cherry mb-3">Our Story</p>
          <h2 className="font-heading uppercase text-4xl sm:text-5xl leading-tight text-obsidian-roast mb-6">
            A Main Street Original
          </h2>
          <div className="space-y-4 text-muted-foreground leading-relaxed">
            <p className="text-obsidian-roast text-lg">
              Flavor Isle started with a simple idea: cook real food, cook it fresh, and treat every guest like a neighbor.
            </p>
            <p>
              Since 1964, our corner of North Main Street has been where Smiths Grove meets up — after ball games, on Friday nights, and on slow summer evenings under the patio lights. Travelers pull off I-65 for a burger and end up coming back every trip through Kentucky.
            </p>
            <p>
              Owners have changed, the sign has been repainted, and Smashie showed up to answer the phones. But the grill, the recipes, and the promise haven't moved an inch: fresh ingredients, made to order, served with a smile.
            </p>
          </div>
        </div>
        <div className="order-1 md:order-2">
          <div className="relative">
            <img
              src={DINER_PHOTO}
              alt="Families eating at picnic tables under string lights at Flavor Isle"
              className="w-full aspect-[4/3] object-cover rounded-3xl shadow-float-lg"
            />
            <div className="absolute -bottom-5 -left-3 sm:-left-6 bg-smashie-yellow text-obsidian-roast rounded-2xl px-5 py-3 shadow-float">
              <p className="font-heading text-3xl leading-none">60+</p>
              <p className="font-body text-xs uppercase tracking-widest font-bold">Years in Smiths Grove</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}