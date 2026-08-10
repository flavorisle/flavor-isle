import React from 'react';
import { Lock, MapPin, ChefHat } from 'lucide-react';

// Clean trust row — reassures customers right before they pay without
// looking like a loud advertisement. Uses subtle, on-brand styling.
const BADGES = [
  { icon: Lock, label: 'Secure Checkout' },
  { icon: MapPin, label: 'Locally Owned' },
  { icon: ChefHat, label: 'Made Fresh' },
];

export default function CheckoutTrustBadges({ variant = 'full' }) {
  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-center gap-4 py-2">
        {BADGES.map(({ icon: Icon, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-muted-foreground">
            <Icon size={14} className="text-patina-mint" />
            <span className="text-[10px] uppercase tracking-wider font-heading">{label}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex justify-center gap-4 sm:gap-6 py-4 bg-white/50 rounded-xl border border-border">
      {BADGES.map(({ icon: Icon, label }) => (
        <div key={label} className="flex flex-col items-center gap-1.5">
          <div className="p-2 bg-muted rounded-full text-patina-mint">
            <Icon size={16} />
          </div>
          <span className="text-[10px] uppercase tracking-wider font-heading text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}