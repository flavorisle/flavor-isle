import React from 'react';

const TOOLS = [
  ['Live menu lookup', 'Reads available menu items and prices'],
  ['Burger toppings', 'Checks current topping options'],
  ['Shake details', 'Checks current sizes, flavors and prices'],
  ['Place order', 'Sends a secure payment link after confirmation'],
  ['Take message', 'Saves a message for the crew'],
  ['Counter transfer', 'Connects a phone caller to the counter'],
];

export default function SmashieToolInventory() {
  return <section className="card-diner p-5">
    <h3 className="font-heading text-obsidian-roast">Where his tools are kept</h3>
    <p className="text-sm text-muted-foreground mb-3">These built-in actions live in Smashie's phone service. The switches above control their availability; knowledge topics are separate factual answers, not executable actions.</p>
    <ul className="divide-y divide-border">
      {TOOLS.map(([name, detail]) => <li key={name} className="py-2 text-sm"><strong className="text-obsidian-roast">{name}</strong><span className="text-muted-foreground"> — {detail}</span></li>)}
    </ul>
  </section>;
}