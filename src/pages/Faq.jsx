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
import { hoursGroups } from '@/lib/businessHours';
import { getMenuSetting } from '@/lib/menuSettings';

// Frequently asked questions (issue #37, step 5). Hours and delivery answers are
// rendered from the live store settings, never hardcoded, and the same list
// feeds the FAQPage structured data below so the markup can't drift from what
// the page shows.
export default function Faq() {
  const businessHours = useBusinessHours();
  const { waitMin } = useLiveStatus();
  const pickupMin = waitMin || 20;
  const deliveryMin = (waitMin || 20) + 20;
  const [storeSetting, setStoreSetting] = useState(null);

  useEffect(() => {
    let active = true;
    getMenuSetting()
      .then((setting) => { if (active) setStoreSetting(setting || null); })
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
  const deliveryAnswer = deliveryEnabled
    ? `Yes — we deliver locally through flavor-isle.com. Choose Delivery at checkout and enter your address; delivery orders need about ${deliveryCutoff} minutes of notice. Delivery is ${deliveryFeeText}. For catering and large orders, call (270) 563-7230.`
    : 'Delivery is paused right now, so ordering is pickup only through flavor-isle.com. For catering and large orders, call (270) 563-7230.';

  const FAQS = [
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
      a: 'Yes — order ahead at flavor-isle.com for pickup or delivery. Visit 103 N Main St, Smiths Grove, KY 42171, or call (270) 563-7230.',
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
      q: 'Does Flavor Isle deliver or take catering?',
      a: deliveryAnswer,
    },
    {
      q: 'Can I pay with a card?',
      a: 'Yes — pay by card online at checkout or at the counter. Cash works too, including cash at pickup for phone orders.',
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
          a: "Browse the Menu page, add items to your cart, and hit Checkout. Choose pickup, delivery, or dine-in, enter your info, and pay securely with your card. You'll get an order number and a confirmation email right away.",
        },
        {
          q: 'How long does my order take?',
          a: `Pickup orders are typically ready in about ~${pickupMin} minutes and delivery takes about ~${deliveryMin} minutes, depending on how busy the kitchen is. The live status bar at the top of every page shows our current kitchen load and estimated wait.`,
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
        title="FAQ | Flavor Isle — Smiths Grove, KY (I-65 Exit 38)"
        description="Find Flavor Isle near Mammoth Cave and I-65 Exit 38, order online, check truck and trailer parking, and plan a family-friendly stop in Smiths Grove."
        ogTitle="FAQ | Flavor Isle — Smiths Grove, KY (I-65 Exit 38)"
        ogDescription="Where to eat near Mammoth Cave, online ordering, truck and trailer parking, and family-friendly dining off I-65 Exit 38."
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Navbar />
      <CartDrawer />

      <CinematicHero heading="Questions, answered." subtitle="Directions, hours, ordering, parking and the rest of it — all in one place." />

      <section className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        <div className="card-diner p-5 sm:p-7">
          <Accordion type="single" collapsible className="w-full">
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
          <p className="text-sm text-muted-foreground mt-2 mb-5">103 N Main St, Smiths Grove, KY 42171 · (270) 563-7230</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/menu" className="btn-cherry chrome-hover px-7 py-3.5 text-sm font-heading inline-flex items-center gap-2">
              Order Online <ArrowRight size={16} />
            </Link>
            <Link to="/i65-exit-38" className="btn-mint chrome-hover px-7 py-3.5 text-sm font-heading inline-flex items-center gap-2">
              Plan your Exit 38 stop <ArrowRight size={16} />
            </Link>
            <a href="tel:+12705637230" className="btn-mint chrome-hover px-7 py-3.5 text-sm font-heading inline-flex items-center gap-2">
              <Phone size={16} /> (270) 563-7230
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}