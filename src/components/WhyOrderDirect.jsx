import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeDollarSign, Star, Phone, HeartHandshake, Sparkles } from 'lucide-react';

const REASONS = [
  {
    icon: BadgeDollarSign,
    title: 'No App Markups',
    body: "Third-party delivery apps add service fees and upcharges on every order. Order direct and you pay menu price — nothing extra tacked on.",
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

        {/* ── Star Rewards — merged from the first-order banner, listed last ── */}
        <div className="mt-5 rounded-2xl overflow-hidden shadow-float bg-card">
          <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] items-stretch">
            <div className="p-7 sm:p-8">
              <div className="inline-flex items-center gap-2 bg-midnight-cherry/10 text-midnight-cherry rounded-full px-3 py-1 mb-4">
                <Sparkles size={14} />
                <span className="text-xs font-heading tracking-widest uppercase">Star Rewards</span>
              </div>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-midnight-cherry/10 flex items-center justify-center flex-shrink-0">
                  <Star size={22} className="text-midnight-cherry" />
                </div>
                <h3 className="font-heading uppercase text-xl text-obsidian-roast">
                  Earn Loyalty Rewards
                </h3>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground mb-5 max-w-md">
                Every direct order earns Flavor Isle loyalty points toward free food — and your first order starts earning right away. Create a free account, order your favorites, and cash points in for shakes, sides, and more. Orders placed through delivery apps don't earn you a thing.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm font-heading">
                  Start Your First Order <ArrowRight size={16} />
                </Link>
                <Link to="/rewards" className="btn-mint inline-flex items-center px-6 py-3 text-sm font-heading">
                  See How Rewards Work
                </Link>
              </div>
            </div>
            <div className="hidden md:block bg-gradient-to-br from-midnight-cherry to-red-900 p-8 text-white">
              <div className="h-full flex flex-col justify-center">
                <div className="text-5xl mb-3">🎁</div>
                <p className="font-heading text-2xl leading-tight">Earn points.</p>
                <p className="font-heading text-2xl leading-tight mb-3">Eat for free.</p>
                <ul className="space-y-2 text-sm text-white/90 font-body">
                  <li>✅ Points on every order</li>
                  <li>✅ Redeem for shakes, sides & more</li>
                  <li>✅ Free to join — no coupon needed</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}