import React from 'react';
import { Receipt, CheckCircle2, Flame, ShoppingBag, PartyPopper } from 'lucide-react';

// Explains what happens at each stage of an order's lifecycle so customers
// watching the order tracker know what each status means and what to do next.
const STAGES = [
  {
    id: 'pending',
    label: 'Order Placed',
    Icon: Receipt,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
    desc: "We've got your order and payment. It's queued up for the kitchen.",
    expect: 'You\'ll get a confirmation email shortly.',
  },
  {
    id: 'confirmed',
    label: 'Confirmed',
    Icon: CheckCircle2,
    color: 'text-patina-mint',
    bg: 'bg-patina-mint/10',
    desc: 'The crew has your ticket in hand and is lining up your food.',
    expect: 'Your spot in the queue is locked in.',
  },
  {
    id: 'preparing',
    label: 'On the Grill',
    Icon: Flame,
    color: 'text-midnight-cherry',
    bg: 'bg-midnight-cherry/10',
    desc: "Your order is being cooked fresh right now — burgers smashed, shakes spun.",
    expect: 'This is the longest stage. Wait times flex with how busy we are (see the levels above).',
  },
  {
    id: 'ready',
    label: 'Ready',
    Icon: ShoppingBag,
    color: 'text-green-600',
    bg: 'bg-green-100',
    desc: "It's done and bagged up. For pickup, head on over — for delivery, it's heading out.",
    expect: 'Pickup: come grab it hot. Delivery: your driver is on the way.',
  },
  {
    id: 'completed',
    label: 'Completed',
    Icon: PartyPopper,
    color: 'text-midnight-cherry',
    bg: 'bg-midnight-cherry/10',
    desc: "You've got your food and we hope you loved it. Time to dig in!",
    expect: 'We\'ll send a quick review ask so you can tell us how it was.',
  },
];

export default function OrderStatusStages() {
  return (
    <div>
      <h2 className="font-heading text-xl text-obsidian-roast mb-1">What to expect at each stage</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Once you order, you'll see your order move through these stages. Here's what each one means.
      </p>
      <ol className="relative space-y-4 pl-6 border-l-2 border-border">
        {STAGES.map((stage, idx) => {
          const Icon = stage.Icon;
          return (
            <li key={stage.id} className="relative">
              {/* Stage dot */}
              <span className={`absolute -left-[31px] w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-vanilla-malt ${stage.bg}`}>
                <Icon size={12} className={stage.color} />
              </span>
              <div className="card-diner p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-heading text-muted-foreground">STEP {idx + 1}</span>
                  <h3 className="font-heading text-base text-obsidian-roast">{stage.label}</h3>
                </div>
                <p className="text-sm text-muted-foreground">{stage.desc}</p>
                <p className="text-sm text-patina-mint font-semibold mt-1.5">What to expect: {stage.expect}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}