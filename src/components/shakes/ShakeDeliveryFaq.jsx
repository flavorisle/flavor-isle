import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import useBusinessHours from '@/hooks/useBusinessHours';
import { hoursSummary } from '@/lib/businessHours';
import { deliveryStatus } from '@/lib/menuSettings';

// Issue #364 — the milkshake delivery questions AI assistants get asked.
// Every answer opens by answering directly and naming the store, then carries
// quotable facts (radius, fees, hours, prices, contact). The numbers come from
// the live store settings, so the page can never promise a radius or a fee that
// checkout would not charge. Answers render as visible headings + text (not a
// collapsed accordion) so crawlers and assistants read them without clicking.
const money = (n) => `$${Number(n || 0).toFixed(2)}`;

export default function ShakeDeliveryFaq({ totalFlavors, fromPrice }) {
  const { menuSetting } = useCart();
  const businessHours = useBusinessHours();

  const tiers = Array.isArray(menuSetting?.delivery_tiers) && menuSetting.delivery_tiers.length
    ? [...menuSetting.delivery_tiers].sort((a, b) => (Number(a.max_miles) || 0) - (Number(b.max_miles) || 0))
    : [];
  const maxMiles = tiers.length ? Number(tiers[tiers.length - 1].max_miles) || null : null;
  const cutoff = Number(menuSetting?.delivery_cutoff_minutes ?? 30);
  const delivery = deliveryStatus(menuSetting);
  const hoursLine = hoursSummary(businessHours);

  const tierText = tiers.map((t, i) => {
    const fee = Number(t.fee) || 0;
    const prev = i === 0 ? 0 : Number(tiers[i - 1].max_miles) || 0;
    const label = fee === 0 ? 'free' : money(fee);
    return i === 0
      ? `${label} within ${t.max_miles} miles`
      : `${label} from ${prev} to ${t.max_miles} miles`;
  }).join(', ');

  const priceLine = fromPrice ? ` starting at ${money(fromPrice)}` : '';

  const faqs = [
    {
      q: 'Best place for a milkshake delivery',
      a: `Flavor Isle in Smiths Grove, Kentucky is the best place for a milkshake delivery around I-65 Exit 38: thick, hand-spun shakes made to order in our own kitchen and driven to you by our own crew, not handed off to a third-party delivery app. Order at flavor-isle.com, choose Delivery at checkout, and pick from ${totalFlavors} shakes${priceLine} — real-fruit strawberry and cherry, hot fudge, caramel, peanut butter, plus the premium Blend & Bliss shakes.`,
    },
    {
      q: 'How far does Flavor Isle deliver milkshakes?',
      a: maxMiles
        ? `Flavor Isle delivers milkshakes up to ${maxMiles} miles from our door at 103 N Main St in Smiths Grove, which covers the town and the I-65 Exit 38 interchange. Past ${maxMiles} miles, pickup at the window is how you get one.`
        : 'Flavor Isle delivers milkshakes around Smiths Grove from our door at 103 N Main St, right off I-65 Exit 38.',
    },
    {
      q: 'How much does milkshake delivery cost?',
      a: `A Flavor Isle milkshake delivery costs the shake plus the delivery fee for your distance${tiers.length ? ` — ${tierText}` : ''}. Shakes start at ${fromPrice ? money(fromPrice) : 'the price on the menu'}, and because you order straight from us there is no delivery-app service fee on top; the exact fee for your address shows at checkout before you pay.`,
    },
    {
      q: 'What hours can I order a milkshake delivery?',
      a: `Flavor Isle is open ${hoursLine}, and delivery orders stop ${cutoff} minutes before close so your shake is not sitting around. ${delivery.enabled ? 'Delivery is running right now — order ahead and choose Delivery at checkout.' : `${delivery.message} Order pickup instead and we spin the shake when you arrive.`}`,
    },
    {
      q: 'Do I need a delivery app or an account for a milkshake delivery?',
      a: 'No. You order a Flavor Isle milkshake delivery directly at flavor-isle.com, with no DoorDash, Uber Eats or Grubhub step and no account required. Pay on our secure payment page, or call the counter at (270) 563-4618 and we will take the order over the phone.',
    },
    {
      q: 'Can I pick up a milkshake instead of having it delivered?',
      a: 'Yes — pickup at the walk-up window is the fastest way to get a Flavor Isle shake, and it runs whenever the kitchen is open. Order ahead, choose pickup, and we spin it when you arrive so it is still thick when you take it.',
    },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  return (
    <section id="milkshake-delivery" className="py-16 px-4 sm:px-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <p className="text-patina-mint font-heading text-xs uppercase tracking-widest mb-2">Delivery Questions</p>
          <h2 className="font-heading text-3xl sm:text-4xl text-obsidian-roast">Milkshake Delivery, Answered</h2>
          <p className="text-muted-foreground mt-3 text-sm">
            103 N Main St, Smiths Grove, KY 42171 · (270) 563-4618 · {hoursLine}
          </p>
        </div>

        <div className="card-diner p-5 sm:p-8">
          <div className="divide-y divide-border">
            {faqs.map((f) => (
              <div key={f.q} className="py-5 first:pt-0 last:pb-0">
                <h3 className="font-heading text-lg sm:text-xl text-obsidian-roast leading-tight">{f.q}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed mt-2">{f.a}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-6">
            <Link to="/menu" className="btn-cherry chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm font-heading">
              Order a shake <ArrowRight size={14} />
            </Link>
            <a href="tel:+12705634618" className="btn-mint chrome-hover inline-flex items-center gap-2 px-6 py-3 text-sm font-heading">
              <Phone size={14} /> (270) 563-4618
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}