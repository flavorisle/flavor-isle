import React from 'react';

const bonuses = [
  { title: '2nd online order', text: '50 bonus Stars land in your account when you place your second order on flavor-isle.com. One-time.' },
  { title: 'Birthday', text: '100 bonus Stars on your birthday. Add your month and day in your account profile so we know when it is.' },
  { title: 'Welcome back', text: 'Away for 30 days or more? Your next flavor-isle.com order lands 100 bonus Stars in your account.' },
  { title: 'Order streak', text: '3 orders on flavor-isle.com within 30 days earns a 50 bonus Star streak reward. Once per 30-day window.' },
];

export default function BonusStars() {
  return (
    <div className="card-diner p-5 mb-8">
      <h3 className="font-heading text-xl text-obsidian-roast mb-4">Bonus Stars</h3>
      <div className="space-y-3">
        {bonuses.map(({ title, text }) => (
          <div key={title}>
            <p className="font-heading text-obsidian-roast">{title}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}