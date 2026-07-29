import React from 'react';

const ROSE = '#d85573';
const ROSE_TEXT = '#8e3a4e';

export function SipShackIntroNote() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-4">
      <p className="text-xs font-body text-center leading-snug opacity-80" style={{ color: ROSE_TEXT }}>
        🍋 An independent lemonade stand hosted outside Flavor Isle, run by one of our awesome seasonal teen
        employees — not part of our menu or operations. We just love supporting local kids and community fun.
      </p>
    </div>
  );
}

export function SipShackFinePrint() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <p className="text-xs font-body text-center leading-relaxed text-muted-foreground">
        The Sip Shack is independently operated. Pricing, products, and availability are set by the stand.
        Flavor Isle does not manage or prepare Sip Shack items.
      </p>
    </div>
  );
}