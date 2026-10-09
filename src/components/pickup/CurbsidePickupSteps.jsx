import React from 'react';
import { Link } from 'react-router-dom';
import { Car, Phone } from 'lucide-react';

// Step-by-step curbside pickup instructions shown on the Contact & Location
// page, directly under the parking/zone map, so a customer who just pulled in
// knows exactly what to do. Wording matches the real flow: choose Curbside at
// checkout, park in a lettered zone, open the order status page, pick the zone,
// then tap "I'm Here — Curbside Pickup".
const STEPS = [
  {
    title: 'Order curbside before you head over',
    body: "Add your food to the bag at flavor-isle.com and choose Curbside at checkout, or call (270) 563-4618 and we'll take the order over the phone.",
  },
  {
    title: 'Park in Zone A, B or C',
    body: "Use the map above. Zone A is behind Flavor Isle, Zone B is by the Post Office, Zone C is across N Main St in the Oreid Insurance lot — and please never park on 1st St.",
  },
  {
    title: 'Open your order status page',
    body: 'Go to flavor-isle.com/order-status, or the Track Order tab in your account, and look up your order number.',
  },
  {
    title: 'Tap the letter of the zone you parked in',
    body: 'Selecting your zone tells the crew exactly where to look. Not sure which one? Pick the closest and add a note.',
  },
  {
    title: "Tell the kitchen you're here",
    body: 'Tap "I\'m Here — Curbside Pickup", add your car\'s color, make and model, plus anything else the crew should know — extra ketchup, napkins, sauce on the side.',
  },
  {
    title: "Stay in the car — we'll bring it out",
    body: 'The kitchen is alerted the moment you tap it, and someone runs your order out to your zone. Paying cash at pickup is fine too.',
  },
];

export default function CurbsidePickupSteps() {
  return (
    <div className="border-t border-border p-5 sm:p-7">
      <h3 className="font-heading text-xl sm:text-2xl text-obsidian-roast flex items-center gap-2">
        <Car size={22} aria-hidden="true" /> Curbside Pickup — How It Works
      </h3>
      <p className="text-sm text-muted-foreground mt-2">
        Ordered curbside? Here&rsquo;s the whole drill, from the drive over to the knock on your window.
      </p>

      <ol className="mt-5 space-y-4">
        {STEPS.map((step, i) => (
          <li key={step.title} className="flex gap-3">
            <span
              className="flex-shrink-0 w-8 h-8 rounded-full bg-midnight-cherry text-white font-heading flex items-center justify-center"
              aria-hidden="true"
            >
              {i + 1}
            </span>
            <div>
              <p className="font-heading text-obsidian-roast">{step.title}</p>
              <p className="text-sm text-muted-foreground font-body">{step.body}</p>
            </div>
          </li>
        ))}
      </ol>

      <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-6">
        <Link to="/order-status" className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading inline-flex items-center justify-center gap-2">
          Track My Order
        </Link>
        <a href="tel:+12705634618" className="btn-mint chrome-hover px-6 py-3 text-sm font-heading inline-flex items-center justify-center gap-2">
          <Phone size={16} /> (270) 563-4618
        </a>
      </div>

      <p className="text-xs text-muted-foreground font-body mt-4">
        No order number handy? Call or text (270) 563-4618 with your zone letter and your car&rsquo;s color, and we&rsquo;ll bring it out.
      </p>
    </div>
  );
}