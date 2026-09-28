import React from 'react';
import { AlertTriangle } from 'lucide-react';

// Shake allergy notice from the Flavor Isle team. Shown once on the Shake Isle
// page and again inside every milkshake's customization, so the shared-equipment
// warning is in front of the customer wherever they commit to a shake.
export const ALLERGY_NOTE_TEXT =
  'Every Flavor Isle milkshake is hand-spun on shared equipment. While each flavor lists its specific allergens, all shakes may contain trace amounts of milk, eggs, soy, wheat, peanuts, and tree nuts. Please let our team know about any severe allergy before ordering.';

// Milkshakes live in Square's "Whirl & Twirl" (original + malt) and
// "Blend & Bliss" (premium) categories.
export function isShakeItem(item) {
  return item?.category === 'Shakes' || /whirl|bliss/i.test(item?.square_category || '');
}

// compact — used inside a single shake's customization, above the add button.
export default function AllergyNote({ compact = false, className = '' }) {
  if (compact) {
    return (
      <div className={`rounded-xl border border-smashie-yellow bg-smashie-yellow/10 px-3 py-2.5 ${className}`}>
        <div className="flex items-center gap-1.5 mb-1">
          <AlertTriangle size={13} className="text-midnight-cherry flex-shrink-0" />
          <p className="font-heading text-[11px] uppercase tracking-widest text-obsidian-roast">Allergy Note</p>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{ALLERGY_NOTE_TEXT}</p>
      </div>
    );
  }

  return (
    <section className="px-4 sm:px-6 py-8">
      <div className="max-w-3xl mx-auto rounded-2xl border-2 border-smashie-yellow bg-white p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={16} className="text-midnight-cherry flex-shrink-0" />
          <h2 className="font-heading text-lg text-obsidian-roast">ALLERGY NOTE</h2>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed">{ALLERGY_NOTE_TEXT}</p>
      </div>
    </section>
  );
}