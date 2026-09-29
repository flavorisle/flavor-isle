import React from 'react';

// One quiet card for the non-payment states on the pay page: order not found,
// already paid, or an order the crew collects at the counter.
export default function PayPageState({ Icon, tone, title, body, children }) {
  const tones = {
    good: 'bg-patina-mint/10 text-patina-mint',
    warn: 'bg-smashie-yellow/20 text-obsidian-roast',
    bad: 'bg-destructive/10 text-destructive',
  };

  return (
    <div className="card-diner p-6 text-center">
      {Icon && (
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${tones[tone] || tones.warn}`}>
          <Icon size={22} />
        </div>
      )}
      <h2 className="font-heading text-xl text-obsidian-roast mb-1">{title}</h2>
      <p className="text-sm text-muted-foreground font-body leading-relaxed">{body}</p>
      {children}
    </div>
  );
}