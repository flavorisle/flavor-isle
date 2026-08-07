import React from 'react';
import { Flame } from 'lucide-react';

// Brand-values band shown on the menu page — reinforces the cook-to-order
// promise after guests have browsed the food.
export default function MadeFreshBanner() {
  return (
    <div className="bg-obsidian-roast py-14 px-4 sm:px-6 mt-8">
      <div className="max-w-3xl mx-auto text-center">
        <div className="w-14 h-14 bg-midnight-cherry rounded-full flex items-center justify-center mx-auto mb-5">
          <Flame size={26} className="text-white" />
        </div>
        <h2 className="font-heading text-3xl sm:text-4xl text-white mb-4 leading-tight">
          MADE FRESH, EVERY SINGLE TIME
        </h2>
        <p className="font-heading text-lg text-smashie-yellow mb-6">
          "No heat lamps. No frozen patties. No shortcuts."
        </p>
        <p className="font-body text-white/80 leading-relaxed max-w-xl mx-auto">
          At Flavor Isle, we believe great food takes time — and it's worth the wait.
          Every order is cooked fresh, right when you place it. That's how it's always been.
          That's how it always will be.
        </p>
      </div>
    </div>
  );
}