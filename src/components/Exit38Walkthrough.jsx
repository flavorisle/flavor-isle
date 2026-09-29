import React from 'react';
import { issue23Photos } from '@/lib/issue23Photos';

const steps = [
  ['1 · Exit the ramp', 'Take I-65 Exit 38 toward Smiths Grove and follow N Main Street into town.'],
  ['2 · Park nearby', 'Look for Flavor Isle at 103 N Main St. Use the parking map to find a place to pull in.'],
  ['3 · Come to the counter', 'Walk up, order a hand-patted burger and shake, and settle in before the next leg of your trip.'],
];

export default function Exit38Walkthrough() {
  return <section className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
    <h2 className="font-heading text-3xl text-obsidian-roast mb-3">From the ramp to the counter</h2>
    <p className="text-muted-foreground mb-6">On your way to Mammoth Cave or the National Corvette Museum? Skip the interstate chains for a small-town stop in Smiths Grove.</p>
    <div className="grid md:grid-cols-3 gap-4 mb-8">{steps.map(([title, body]) => <div key={title} className="card-diner p-5">
      <h3 className="font-heading text-xl text-obsidian-roast mb-2">{title}</h3><p className="text-sm text-muted-foreground">{body}</p>
    </div>)}</div>
    <figure><img src={issue23Photos.parking} alt="Wesley's parking map for Flavor Isle at I-65 Exit 38" loading="lazy" className="w-full rounded-2xl object-contain" />
      <figcaption className="text-sm text-muted-foreground mt-2">Parking map · 103 N Main St, Smiths Grove</figcaption></figure>
  </section>;
}