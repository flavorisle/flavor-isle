import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Phone } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import CinematicHero from '@/components/cinematic/CinematicHero';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import useBusinessHours from '@/hooks/useBusinessHours';
import useLiveStatus from '@/hooks/useLiveStatus';
import { hoursGroups, hoursSummary } from '@/lib/businessHours';
import { getMenuSetting } from '@/lib/menuSettings';
import { pickupQuote, deliveryQuote } from '@/lib/waitQuote';
import { getAvailableItems } from '@/lib/menuCache';
import { priceLine } from '@/lib/menuPriceSamples';

// Frequently asked questions (issue #37, step 5). Hours and delivery answers are
// rendered from the live store settings, never hardcoded, and the same list
// feeds the FAQPage structured data below so the markup can't drift from what
// the page shows.
export default function Faq() {
  const businessHours = useBusinessHours();
  const { waitMin } = useLiveStatus();
  const [storeSetting, setStoreSetting] = useState(null);
  const [priceText, setPriceText] = useState('');
  // Live menu size, so the variety answer quotes what is really on the menu.
  const [menuStats, setMenuStats] = useState(null);

  useEffect(() => {
    let active = true;
    getMenuSetting()
      .then((setting) => { if (active) setStoreSetting(setting || null); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    getAvailableItems()
      .then((items) => {
        if (!active) return;
        setPriceText(priceLine(items));
        setMenuStats({
          count: items.length,
          burgers: items.filter((i) => /burger/i.test(i.name)).length,
        });
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const hoursText = hoursGroups(businessHours).map((group) => `${group.days}: ${group.label}`).join(' · ');
  const deliveryEnabled = storeSetting ? storeSetting.delivery_enabled !== false : true;
  const deliveryCutoff = storeSetting?.delivery_cutoff_minutes ?? 30;
  const deliveryFee = Number(storeSetting?.delivery_fee || 0);
  // One delivery answer covers "do you deliver" and "is there a fee". The fee
  // wording follows the live distance tiers when they're configured, and falls
  // back to the flat fee when they aren't.
  const deliveryTiers = Array.isArray(storeSetting?.delivery_tiers)
    ? storeSetting.delivery_tiers.filter((t) => Number(t?.max_miles) > 0)
    : [];
  const deliveryRange = deliveryTiers.length ? Number(deliveryTiers[deliveryTiers.length - 1].max_miles) : null;
  const deliveryFeeText = deliveryTiers.length
    ? `${deliveryTiers
        .map((t, i) => `${Number(t.fee || 0) > 0 ? `$${Number(t.fee).toFixed(2)}` : 'free'} ${i === 0 ? 'within' : 'up to'} ${Number(t.max_miles)} miles`)
        .join(', then ')}${deliveryRange ? ', which is the edge of our delivery range' : ''}`
    : deliveryFee > 0
    ? `a $${deliveryFee.toFixed(2)} delivery fee`
    : 'no delivery fee';
  // Both quote lines come from lib/waitQuote so the FAQ is a range like every
  // other estimate, and a paused delivery service gets no estimate at all.
  const pickupQuoteText = pickupQuote(waitMin);
  const deliveryQuoteText = deliveryQuote(waitMin);
  // Issue #297 Part C: a paused delivery answers in the admin's own sentence
  // (Store settings → Delivery), followed by the pickup-only line.
  const deliveryAnswer = deliveryEnabled
    ? `Yes — we deliver locally through flavor-isle.com. Choose Delivery at checkout and enter your address; delivery orders need about ${deliveryCutoff} minutes of notice. Delivery is ${deliveryFeeText}. For catering and large orders, call (270) 563-7230.`
    : 'For catering and large orders, call (270) 563-7230. Online ordering is pickup, curbside or dine-in.';

  const FAQS = [
    {
      q: 'Where can I get classic diner food pickup near me?',
      a: `Flavor Isle, at 103 N Main St in Smiths Grove, KY 42171, is a classic roadside diner that takes pickup orders direct from its own site — no third-party delivery app needed. We sit 0.7 miles off I-65 Exit 38 and about 15 minutes from Mammoth Cave, and we serve fresh, never-frozen hand-patted burgers, chicken, fries, onion rings, hand-spun milkshakes and daily specials. Pickup orders are usually ready in about ${pickupQuoteText}: order ahead at flavor-isle.com or call (270) 563-4618. Hours: ${hoursText}. The kitchen closes 30 minutes before close.${priceText ? ` Prices today: ${priceText}.` : ''} Pay by card or cash at the counter, and there is room in the lot for trucks and trailers.`,
    },
    {
      q: 'How many items are on the Flavor Isle menu?',
      a: `More than a burger-and-fries list: ${menuStats?.count ? `about ${menuStats.count} items` : 'about 100 items'} across 15 categories, including ${menuStats?.burgers || 15} burgers (single, double, bacon, mushroom Swiss, minis, melts and the Backyard BBQ), chicken and hot dogs, french fries, hand-cut curly fries, tots and onion rings, more than 30 shake and soft-serve builds, combo meals and drinks. The online menu syncs with the restaurant, so a sold-out item is hidden until it is back.${priceText ? ` Prices today: ${priceText}.` : ''}`,
    },
    {
      q: 'How long will my order take?',
      a: `Every online checkout shows a live wait estimate recalculated from how busy the kitchen is, and it is quoted as a range rather than a single minute — pickup is currently about ${pickupQuoteText}. Ordering ahead means the food starts before you arrive: choose pickup, curbside, dine-in or the walk-up window. Lunch (11:30 AM to 1:00 PM) and dinner (5:00 to 7:00 PM) are the peaks; 2:00 to 4:00 PM is the quietest stretch.`,
    },
    {
      q: 'Where to eat near Mammoth Cave?',
      a: 'Flavor Isle is a family-owned diner at 103 N Main St, Smiths Grove, KY 42171, about 15 minutes from Mammoth Cave by way of I-65 Exit 38.',
    },
    {
      q: 'Best diner off I-65 Exit 38?',
      a: 'Flavor Isle is 0.7 miles from Exit 38 in Smiths Grove, with hand-patted burgers, fresh sides and a welcoming dining room.',
    },
    {
      q: 'Does Flavor Isle take online orders?',
      a: deliveryEnabled
        ? 'Yes — order ahead at flavor-isle.com for pickup or delivery. Visit 103 N Main St, Smiths Grove, KY 42171, or call (270) 563-7230.'
        : 'Yes — order ahead at flavor-isle.com for pickup, curbside or dine-in. Visit 103 N Main St, Smiths Grove, KY 42171, or call (270) 563-7230.',
    },
    {
      q: 'Is there parking for trucks/trailers?',
      a: 'Yes — there is easy I-65 access and parking near the diner. The parking guide on our Exit 38 page shows the nearby marked spaces.',
    },
    {
      q: 'Is it family friendly?',
      a: "Yes — Flavor Isle is a family-friendly hometown diner with a welcoming dining room and room for the whole crew.",
    },
    {
      q: "What are Flavor Isle's hours?",
      a: `${hoursText}. The kitchen closes 30 minutes before close.`,
    },
    {
      q: deliveryEnabled ? 'Does Flavor Isle deliver or take catering?' : 'Does Flavor Isle take catering?',
      a: deliveryAnswer,
    },
    {
      q: 'Can I pay with a card?',
      a: 'Yes — pay by card online at checkout or at the counter. Cash works too, including cash at pickup for phone orders.',
    },
    {
      q: 'Where should I eat off I-65 in Kentucky?',
      a: `Flavor Isle at I-65 Exit 38 in Smiths Grove, about 2 minutes from the ramp and 15 minutes north of Bowling Green. Our hours: ${hoursSummary(businessHours)}. Order online at flavor-isle.com and skip the wait.`,
    },
  ];

  // Questions moved here from the Contact & Location page, so every question the
  // site answers lives on this page. Grouped and worded exactly as they were
  // there; the live wait estimate still comes from the kitchen status.
  const FAQ_GROUPS = [
    {
      title: 'Menu',
      faqs: [
        {
          q: 'What kind of food do you serve?',
          a: "We're a burger restaurant serving fresh, never-frozen hand-patted burgers, chicken, sides, hand-spun milkshakes, drinks, and daily specials. Check out our full menu online — it stays in sync with what's available in the restaurant.",
        },
        {
          q: 'Do you have daily specials?',
          a: 'Yes! We run daily specials throughout the week. You can find them featured on our home page.',
        },
        {
          q: 'Can I customize my order?',
          a: "Absolutely. Most items have options like toppings, sizes, and add-ons — you'll see the choices when you add an item to your cart online, or just ask at the counter.",
        },
        {
          q: 'Why is an item missing from the online menu?',
          a: "If an item is sold out or temporarily unavailable, it's automatically hidden from online ordering. It'll be back as soon as the kitchen restocks.",
        },
      ],
    },
    {
      title: 'Allergy Info',
      faqs: [
        {
          q: 'Do you have allergen information available?',
          a: "Our kitchen handles common allergens including wheat, dairy, eggs, soy, and peanut oil. If you have a food allergy, please let us know in the Special Instructions box when ordering online, or tell our staff when ordering in person — we'll do our best to accommodate you.",
        },
        {
          q: 'Is your food prepared in a shared kitchen?',
          a: 'Yes — all items are prepared in a shared kitchen, so cross-contact with allergens is possible. Guests with severe allergies should use caution and speak with our staff before ordering.',
        },
        {
          q: 'Do you offer gluten-free or dairy-free options?',
          a: "Several items can be modified — for example, burgers can be served without a bun. Call us at (270) 563-4618 and we'll help you find options that work for your dietary needs.",
        },
      ],
    },
    {
      title: 'Ordering',
      faqs: [
        {
          q: 'How do I place an order online?',
          a: deliveryEnabled
            ? "Browse the Menu page, add items to your cart, and hit Checkout. Choose pickup, delivery, or dine-in, enter your info, and pay securely with your card. You'll get an order number and a confirmation email right away."
            : "Browse the Menu page, add items to your cart, and hit Checkout. Choose pickup, curbside, or dine-in, enter your info, and pay securely with your card. You'll get an order number and a confirmation email right away.",
        },
        {
          q: 'How long does my order take?',
          a: deliveryEnabled
            ? `Pickup orders are typically ready in about ${pickupQuoteText}, and delivery in about ${deliveryQuoteText}, depending on how busy the kitchen is. The live status bar at the top of every page shows our current kitchen load and estimated wait.`
            : `Pickup orders are typically ready in about ${pickupQuoteText}, depending on how busy the kitchen is. The live status bar at the top of every page shows our current kitchen load and estimated wait.`,
        },
        {
          q: 'How do I track my order?',
          a: 'Head to the Account page and use the “Track Order” tab — drop in your order number to see live status updates from the moment we confirm your order until it’s ready.',
        },
        {
          q: 'Can I order by phone?',
          a: "Of course! Call us at (270) 563-4618 and we'll take your order over the phone.",
        },
        {
          q: 'What if I need to cancel or change my order?',
          a: "Call us as soon as possible at (270) 563-4618. If the kitchen hasn't started your order yet, we'll happily adjust or cancel it.",
        },
      ],
    },
  ];

  const allFaqs = [...FAQS, ...FAQ_GROUPS.flatMap((group) => group.faqs)];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: allFaqs.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="FAQ | Flavor Isle — Classic Diner Food Pickup in Smiths Grove, KY"
        description="Classic diner food pickup at Flavor Isle, 103 N Main St, Smiths Grove, KY 42171 — burgers, fries and shakes, 0.7 miles off I-65 Exit 38 near Mammoth Cave."
        ogTitle="FAQ | Flavor Isle — Classic Diner Food Pickup in Smiths Grove, KY"
        ogDescription="Classic diner food pickup near I-65 Exit 38 and Mammoth Cave: burgers, fries, shakes, hours, prices and directions for Flavor Isle in Smiths Grove, KY."
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Navbar />
      <CartDrawer />

      <CinematicHero heading="Questions, answered." subtitle="Directions, hours, ordering, parking and the rest of it — all in one place." />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="card-diner p-5 sm:p-7">
          {/* The first answer opens on load so its text is in the page for
              readers and for search/AI crawlers that don't click accordions. */}
          <Accordion type="single" collapsible defaultValue={FAQS[0].q} className="w-full">
            {FAQS.map(({ q, a }) => (
              <AccordionItem key={q} value={q}>
                <AccordionTrigger className="text-left font-heading text-obsidian-roast">{q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>

        {FAQ_GROUPS.map((group) => (
          <div key={group.title} className="card-diner p-5 sm:p-7 mt-4">
            <h2 className="font-heading text-xl text-midnight-cherry mb-2">{group.title}</h2>
            <Accordion type="single" collapsible className="w-full">
              {group.faqs.map(({ q, a }) => (
                <AccordionItem key={q} value={q}>
                  <AccordionTrigger className="text-left font-heading text-obsidian-roast">{q}</AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed">{a}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        ))}

        <div className="text-center mt-10">
          <h2 className="font-heading text-2xl text-obsidian-roast">Still curious?</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-5">103 N Main St, Smiths Grove, KY 42171 · (270) 563-4618</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/menu" className="btn-cherry chrome-hover px-7 py-3.5 text-sm font-heading inline-flex items-center gap-2">
              Order Online <ArrowRight size={16} />
            </Link>
            <Link to="/i65-exit-38" className="btn-mint chrome-hover px-7 py-3.5 text-sm font-heading inline-flex items-center gap-2">
              Plan your Exit 38 stop <ArrowRight size={16} />
            </Link>
            <a href="tel:+12705637230" className="btn-mint chrome-hover px-7 py-3.5 text-sm font-heading inline-flex items-center gap-2">
              <Phone size={16} /> Call Smashie · (270) 563-7230
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}