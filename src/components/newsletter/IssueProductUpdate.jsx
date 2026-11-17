import React from 'react';
import { Link } from 'react-router-dom';

// Saved copy of the product update sent to subscribers on November 10, 2026, kept
// so anyone who missed the email can read it here. Copy matches the sent email.
const BUTTON = 'btn-cherry chrome-hover inline-flex items-center gap-2 mt-1 px-5 py-2.5 text-sm font-heading';

export default function IssueProductUpdate() {
  return (
    <article className="card-diner overflow-hidden">
      <img
        src="https://media.base44.com/images/public/6a95fe085a23d5fd44d8cc53/10583e4c5_ecbf45a39_IMG_1604.jpg"
        alt="Flavor Isle burgers and Tasty Threads tees"
        className="w-full h-56 sm:h-72 object-cover"
      />
      <div className="p-6 sm:p-8">
        <p className="font-heading text-xs tracking-[0.18em] uppercase text-smashie-yellow">
          Isle News · November 10, 2026
        </p>
        <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast mt-2 mb-3">
          New Tasty Threads tees, hot fudge cake, and Main Street to walk
        </h2>
        <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
          Three things worth the trip to the Isle this week.
        </p>

        <h3 className="font-heading text-2xl text-obsidian-roast mt-8 mb-1">
          01 · New in Tasty Threads — Frankly The Best In Town
        </h3>
        <p className="font-heading text-[11px] tracking-[0.18em] uppercase text-midnight-cherry mb-3">
          $25 · 14 colorways · XS–2XL
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          The new tee is up in the shop. Printed to order and shipped to your door, with a free shipping
          quote at checkout, and most orders arrive in 4 to 12 business days. More new designs are on the
          rack beside it.
        </p>
        <Link to="/merch" className={BUTTON}>Shop the tees →</Link>

        <h3 className="font-heading text-2xl text-obsidian-roast mt-8 mb-1">
          02 · The dessert — Hot fudge cake, $6.99
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Still doing what it has always done. Warm chocolate cake, gooey hot fudge, vanilla ice cream in
          the middle. Add one to your order and finish the meal the right way.
        </p>
        <Link to="/menu" className={BUTTON}>Order online →</Link>

        <h3 className="font-heading text-2xl text-obsidian-roast mt-8 mb-1">
          03 · The whole town, one page — Explore Smiths Grove
        </h3>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          42171 &amp; Co., Marigold Manor, Psycho Granny's, The Foxhole, Smalls on Main, Ace Coffee Indigo
          Fox, plus Bluegrass Vineyard, Mammoth Cave and the Corvette Museum. Most of it is a one or two
          minute walk from our door, and the guide has the map and the walking times.
        </p>
        <Link to="/explore-smiths-grove" className={BUTTON}>Open the walking guide →</Link>

        <p className="text-sm text-muted-foreground leading-relaxed mt-8">
          We are 0.7 miles off I-65 Exit 38 at 103 North Main Street, on your left from either direction.
          Order online for pickup at flavor-isle.com, or come see us at the walk-up window.
        </p>
        <p className="font-heading text-lg text-obsidian-roast mt-4">See you on Main. — Flavor Isle</p>
        <p className="text-xs text-muted-foreground leading-relaxed mt-4 pt-4 border-t border-border">
          103 N Main St, Smiths Grove, KY 42171 · Monday to Saturday 10:30 to 7 · Sunday 11 to 7 · 0.7 miles
          off I-65 Exit 38
        </p>
      </div>
    </article>
  );
}