import React from 'react';

const ROSE = '#d85573';
const ROSE_TEXT = '#8e3a4e';

export function SipShackIntroNote() {
  return (
    <div className="max-w-2xl mx-auto px-4 pt-6">
      <div className="rounded-3xl px-5 py-4 space-y-2" style={{ backgroundColor: 'white', border: `1.5px solid ${ROSE}` }}>
        <p className="font-body text-sm leading-relaxed" style={{ color: ROSE_TEXT }}>
          The Sip Shack is an independent lemonade stand proudly hosted outside Flavor Isle.
          It's run by one of our awesome seasonal teen employees, and she's allowed to sell lemonade while she's working.
        </p>
        <p className="font-body text-sm leading-relaxed" style={{ color: ROSE_TEXT }}>
          Sip Shack isn't part of our menu or operations — we just love supporting local kids and community fun.
        </p>
      </div>
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