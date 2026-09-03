import React from 'react';

const PHOTO_1964 = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/0dfcdf627_1CCAA2A1-AA3C-4C56-9922-CB1452069518.JPG';
const PHOTO_GUESTBOOK = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/49f86bd0c_IMG_1445_Original.jpeg';
const PHOTO_50TH = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/18c69de7c_FlavorIsle50thAnniversary5-3-14A.jpeg';

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
              In May 1964, Joyce bought a little ice cream stand on North Main Street from Mrs. Ethel Hardy and named it Joyce's Flavor Isle.
            </p>
            <p>
              She served old-fashioned milkshakes and floats from the walk-up window for fifty years — and in 2014, Smiths Grove lined the sidewalk with balloons and classic cars to celebrate her 50th anniversary with the very menu she opened with in '64.
            </p>
            <p>
              The sign has been repainted, the grill has gotten busier, and Smashie showed up to answer the phones. But the promise hasn't moved an inch: fresh ingredients, made to order, served to neighbors like family.
            </p>
          </div>
        </div>
        <div className="order-1 md:order-2">
          <div className="relative">
            <img
              src={PHOTO_1964}
              alt="Original black-and-white photo of Joyce's Flavor Isle walk-up stand, 1964"
              className="w-full aspect-square object-cover rounded-3xl shadow-float-lg"
            />
            <div className="absolute -bottom-5 -left-3 sm:-left-6 bg-smashie-yellow text-obsidian-roast rounded-2xl px-5 py-3 shadow-float">
              <p className="font-heading text-3xl leading-none">60+</p>
              <p className="font-body text-xs uppercase tracking-widest font-bold">Years in Smiths Grove</p>
            </div>
          </div>
        </div>
      </div>

      {/* 50th anniversary, May 2014 */}
      <div className="max-w-6xl mx-auto mt-20 grid grid-cols-1 sm:grid-cols-2 gap-6">
        <figure>
          <img src={PHOTO_50TH} alt="Crowd gathered outside Flavor Isle with balloons for the 50th anniversary" className="w-full aspect-[16/10] object-cover rounded-3xl shadow-float" />
          <figcaption className="mt-3 text-sm text-muted-foreground">May 3, 2014 — the 50th anniversary celebration on Main Street</figcaption>
        </figure>
        <figure>
          <img src={PHOTO_GUESTBOOK} alt="Guest book and anniversary note for Joyce at the 50th celebration" className="w-full aspect-[16/10] object-cover rounded-3xl shadow-float" />
          <figcaption className="mt-3 text-sm text-muted-foreground">Neighbors signed Joyce's guest book with memories from fifty years of shakes</figcaption>
        </figure>
      </div>
    </section>
  );
}