import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeDollarSign, Star, Phone, HeartHandshake } from 'lucide-react';

const REASONS = [
  {
    icon: BadgeDollarSign,
    title: 'No App Markups',
    body: "Third-party delivery apps add service fees and upcharges on every order. Order direct and you pay menu price — nothing extra tacked on.",
  },
  {
    icon: Star,
    title: 'Earn Loyalty Rewards',
    body: "Every direct order earns Flavor Isle loyalty points toward free food. Orders placed through delivery apps don't earn you a thing.",
  },
  {
    icon: Phone,
    title: 'Talk to the Kitchen',
    body: "Need to add a side or change your pickup time? Call us and we'll handle it in seconds. Delivery apps put a wall between you and the crew.",
  },
  {
    icon: HeartHandshake,
    title: 'Support Local',
    body: "When you order direct, every dollar stays right here in Smiths Grove — not skimmed off to a tech company in another state.",
  },
];

export default function WhyOrderDirect() {
  return (
    <section className="py-20 px-4 sm:px-6 bg-midnight-cherry/5">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="font-heading uppercase tracking-widest text-sm mb-3 text-midnight-cherry">
            Order Direct. Get More.
          </p>
          <h2 className="font-heading uppercase text-4xl sm:text-5xl leading-tight text-obsidian-roast">
            Why Order Straight From Us?
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
            We love seeing you walk through the door — and we'd rather you order from us than hand your money to a delivery app. Here's what you get when you order direct.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {REASONS.map((r) => {
            const Icon = r.icon;
            return (
              <div key={r.title} className="bg-card rounded-2xl p-7 shadow-float flex gap-4">
                <div className="w-12 h-12 rounded-full bg-midnight-cherry/10 flex items-center justify-center flex-shrink-0">
                  <Icon size={22} className="text-midnight-cherry" />
                </div>
                <div>
                  <h3 className="font-heading uppercase text-xl mb-2 text-obsidian-roast">
                    {r.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{r.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="text-center mt-10">
          <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-8 py-4 text-sm font-heading">
            Order Direct <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}