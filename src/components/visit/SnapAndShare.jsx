import React from 'react';
import { Facebook, Camera } from 'lucide-react';

// Snap & share band from the old visit-us page — one short social callout.
export default function SnapAndShare() {
  return (
    <section className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
      <div className="card-diner p-6 sm:p-8 text-center">
        <div className="inline-flex items-center gap-2 text-midnight-cherry font-heading text-sm tracking-widest mb-2">
          <Camera size={16} /> SNAP &amp; SHARE
        </div>
        <h2 className="font-heading text-2xl sm:text-3xl text-obsidian-roast">Tag your Flavor Isle moments</h2>
        <p className="text-muted-foreground mt-3 max-w-xl mx-auto">
          We love seeing your burgers, shakes, and squad shots. Use <strong className="text-obsidian-roast">#FlavorIsle</strong> and show the world why they not like us.
        </p>
        <a
          href="https://facebook.com/flavorisle"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-mint chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm font-heading mt-5"
        >
          <Facebook size={16} /> Follow on Facebook
        </a>
      </div>
    </section>
  );
}