import React from 'react';

// Saved copy of the issue sent to subscribers on November 2, 2026, kept on the
// newsletter page so anyone who missed the email can read it here.
const FLAVORS = [
  { name: 'Strawberry Crunch Bliss shake', tag: 'New', note: 'Strawberry Crunch Bliss' },
  { name: 'Banana Pudding Bliss shake', tag: 'Signature', note: 'Banana Pudding Bliss' },
  { name: 'Caramel Apple Bliss shake', tag: 'Limited Time', note: 'Caramel Apple Bliss' },
  { name: 'Apple Pie Bliss shake', tag: 'New', note: '' },
  { name: "S'more's Bliss shake", tag: 'New', note: '' },
  { name: 'Banana Split Bliss shake', tag: 'Signature', note: '' },
];

export default function NewsletterIssue() {
  return (
    <section className="max-w-2xl mx-auto px-4 sm:px-6 pb-16">
      <article className="card-diner overflow-hidden">
        <img
          src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/1ade54fbc_IMG_0427.jpeg"
          alt="The Flavor Isle sign on Main Street in Smiths Grove"
          className="w-full h-56 sm:h-72 object-cover"
        />
        <div className="p-6 sm:p-8">
          <p className="font-heading text-xs tracking-[0.18em] uppercase text-smashie-yellow">
            Isle News · November 2, 2026
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast mt-2 mb-3">
            Fall is officially Bliss season.
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
            Three things changed at the Isle this week: new Bliss shakes, online ordering is back, and we
            close at 7:00 PM now.
          </p>

          <h3 className="font-heading text-2xl text-obsidian-roast mt-8 mb-2">01 · The Bliss shakes</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">
            Hand-spun, piled high, and only here. Pick vanilla or chocolate soft serve as your base.
          </p>
          <div className="grid sm:grid-cols-3 gap-3">
            {FLAVORS.map((f) => (
              <div key={f.name} className="rounded-2xl bg-[#fff8e8] p-4">
                <p className="font-heading text-[10px] tracking-[0.18em] uppercase text-midnight-cherry">{f.tag}</p>
                <p className="font-heading text-lg leading-tight text-obsidian-roast mt-1">{f.name}</p>
                {f.note && <p className="text-xs text-muted-foreground mt-1">{f.note}</p>}
              </div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mt-4">
            Six Bliss flavors, hand-spun with your pick of vanilla or chocolate soft serve. $5.99 for 14 oz,
            $6.49 for 20 oz.
          </p>

          <h3 className="font-heading text-2xl text-obsidian-roast mt-8 mb-2">02 · Online ordering is back on</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Order from your phone and we'll have it ready at the counter, usually in about 15 minutes. We'll
            text you the moment it's up. Delivery is paused while we're short a driver. Pickup, the walk-up
            window, curbside, and dine-in are all open as usual.
          </p>

          <h3 className="font-heading text-2xl text-obsidian-roast mt-8 mb-2">03 · We close at 7:00 PM now</h3>
          <div className="rounded-2xl border border-border overflow-hidden text-sm">
            <div className="flex justify-between px-4 py-2.5 border-b border-border">
              <span className="font-heading text-obsidian-roast">Monday to Saturday</span>
              <span className="text-muted-foreground">10:30 AM to 7:00 PM</span>
            </div>
            <div className="flex justify-between px-4 py-2.5">
              <span className="font-heading text-obsidian-roast">Sunday</span>
              <span className="text-muted-foreground">11:00 AM to 7:00 PM</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed mt-3">
            Last pickup order is 6:45 PM. Happy hour still runs 2:00 to 6:00 PM, half off drinks.
          </p>

          <div className="rounded-2xl bg-patina-mint mt-8 p-6">
            <img
              src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/cc3a8ab5c_Copilot_20250829_140545.png"
              alt="Tasty Threads, Flavor Isle apparel"
              className="w-32 rounded-xl bg-white mb-4"
            />
            <p className="font-heading text-[10px] tracking-[0.2em] uppercase text-smashie-yellow">Tasty Threads</p>
            <p className="font-heading text-2xl text-white leading-tight mt-1 mb-2">
              &ldquo;Leaves Change Shakes Stay Legendary&rdquo;
            </p>
            <p className="text-sm text-white/80 leading-relaxed">
              Our fall tee is in the shop now. $19.99, sizes XS to 2XL, 14 colors to pick from.
            </p>
          </div>

          <p className="text-sm text-muted-foreground leading-relaxed mt-6">
            That's the whole update. Come see us this week, we'll keep a cup ready.
          </p>
        </div>
      </article>
    </section>
  );
}