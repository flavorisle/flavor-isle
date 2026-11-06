import React from 'react';

// Winter Bliss issue, November 5, 2026 — the newest entry in the newsletter
// archive on /newsletter. Copy supplied verbatim by Wesley.
const WINTER_SEVEN = [
  {
    name: 'Peppermint Bark Bliss',
    note: 'White chocolate and crushed peppermint, topped with whipped cream.',
  },
  {
    name: 'Peppermint Hot Cocoa Bliss',
    note: 'Crushed peppermint and marshmallow fluff, topped with whipped cream.',
  },
  {
    name: 'Peppermint Crunch Bliss',
    note: 'Peppermint and crushed candy cane, topped with whipped cream.',
  },
  {
    name: 'Peppermint Oreo Bliss',
    note: 'Oreo and crushed peppermint, blended thick.',
  },
  {
    name: 'Snow Day Bliss',
    note: 'White chocolate, marshmallow fluff, and vanilla, topped with whipped cream.',
  },
  {
    name: 'Christmas Orange Bliss',
    note: 'Bright orange and chocolate, topped with whipped cream.',
  },
  {
    name: 'Ginger Bread Bliss',
    note: 'Gingerbread, marshmallow fluff, and graham cracker crumble.',
  },
];

const STILL_POURING = [
  {
    name: 'Strawberry Crunch',
    image: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/1cfd01973_card_strawberry.jpg',
  },
  {
    name: 'Banana Pudding',
    image: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/8c3b8db50_card_banana.jpg',
  },
  {
    name: 'Caramel Apple',
    image: 'https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/cb33a0ad0_card_caramel.jpg',
  },
];

export default function IssueWinterBliss() {
  return (
    <article className="card-diner overflow-hidden">
      <img
        src="https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/d7170f196_banner-v2.jpg"
        alt="Winter Bliss milkshakes at Flavor Isle"
        className="w-full h-56 sm:h-72 object-cover"
      />
      <div className="p-6 sm:p-8">
        <p className="font-heading text-xs tracking-[0.18em] uppercase text-smashie-yellow">
          Isle News · November 5, 2026
        </p>
        <h3 className="font-heading text-3xl sm:text-4xl text-obsidian-roast mt-2 mb-3">
          Winter Bliss is here.
        </h3>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Seven new shakes are pouring, blended thick with our soft serve and finished with whipped cream
          unless the recipe says otherwise. Pick vanilla or chocolate soft serve as your base.
        </p>

        <h4 className="font-heading text-2xl text-obsidian-roast mt-8 mb-4">01 · The winter seven</h4>
        <div className="grid sm:grid-cols-2 gap-3">
          {WINTER_SEVEN.map((shake) => (
            <div key={shake.name} className="rounded-2xl bg-[#fff8e8] p-4">
              <p className="font-heading text-lg leading-tight text-obsidian-roast">{shake.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{shake.note}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mt-4">
          $5.99 for the 14 oz, and 50 cents more for the 20 oz.
        </p>

        <h4 className="font-heading text-2xl text-obsidian-roast mt-8 mb-4">02 · Still pouring</h4>
        <div className="grid grid-cols-3 gap-3">
          {STILL_POURING.map((shake) => (
            <div key={shake.name} className="rounded-2xl overflow-hidden bg-[#fff8e8]">
              <img
                src={shake.image}
                alt={`${shake.name} Bliss shake`}
                className="w-full aspect-square object-cover"
              />
              <p className="font-heading text-sm leading-tight text-obsidian-roast px-3 py-2.5">
                {shake.name}
              </p>
            </div>
          ))}
        </div>

        <h4 className="font-heading text-2xl text-obsidian-roast mt-8 mb-3">03 · Come get one</h4>
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
          Order at flavor-isle.com or grab one at the walk-up window.
        </p>
      </div>
    </article>
  );
}