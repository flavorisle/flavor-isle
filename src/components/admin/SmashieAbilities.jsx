import React from 'react';

export const ABILITIES = [
  ['orders', 'Take orders', 'Pickup, delivery and dine-in orders with a secure payment link'],
  ['menu', 'Menu questions', 'Live menu, prices and recommendations'],
  ['hours', 'Store hours', 'Current opening information'],
  ['wait', 'Current wait', 'Live busyness and wait estimates'],
  ['history', 'Our story', 'Flavor Isle history'],
  ['directions', 'Directions', 'How to find the restaurant'],
  ['messages', 'Take messages', 'Save a message for the crew'],
  ['transfer', 'Counter transfer', 'Connect phone callers to a person'],
];

export default function SmashieAbilities({ value = {}, onChange }) {
  return <section className="card-diner p-5 space-y-2">
    <h3 className="font-heading text-obsidian-roast">What Smashie can do</h3>
    <p className="text-sm text-muted-foreground">Switch phone abilities on or off. Store closures still override these settings.</p>
    {ABILITIES.map(([key, name, description]) => <div key={key} className="flex items-center justify-between gap-3 py-2 border-t border-border">
      <div><p className="font-heading text-sm text-obsidian-roast">{name}</p><p className="text-xs text-muted-foreground">{description}</p></div>
      <button type="button" role="switch" aria-label={name} aria-checked={value[key] !== false}
        onClick={() => onChange({ ...value, [key]: value[key] === false })}
        className={`min-w-12 min-h-11 rounded-full px-1 flex items-center ${value[key] !== false ? 'bg-midnight-cherry justify-end' : 'bg-muted justify-start'}`}>
        <span className="w-6 h-6 rounded-full bg-white shadow" />
      </button>
    </div>)}
  </section>;
}