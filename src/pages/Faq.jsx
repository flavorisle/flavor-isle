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
import { hoursGroups } from '@/lib/businessHours';
import { getMenuSetting } from '@/lib/menuSettings';

// Frequently asked questions (issue #37, step 5). Hours and delivery answers are
// rendered from the live store settings, never hardcoded, and the same list
// feeds the FAQPage structured data below so the markup can't drift from what
// the page shows.
export default function Faq() {
  const businessHours = useBusinessHours();
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
  const deliveryAnswer = deliveryEnabled
    ? `Yes — we deliver locally through flavor-isle.com. Delivery orders need about ${deliveryCutoff} minutes of notice${deliveryFee > 0 ? `, with a $${deliveryFee.toFixed(2)} delivery fee` : ' at no delivery fee'}. For catering and large orders, call (270) 563-4618.`
    : 'Delivery is paused right now, so ordering is pickup only through flavor-isle.com. For catering and large orders, call (270) 563-4618.';

  const FAQS = [
    {
      q: 'Where is Flavor Isle?',
      a: '103 N Main St, Smiths Grove, KY 42171, just 0.7 miles off I-65 Exit 38 — between Louisville and Nashville.',
    },
    {
      q: 'Is Flavor Isle near Mammoth Cave National Park?',
      a: 'Yes — about 15 minutes: Mammoth Cave Parkway to I-65, Exit 38, left off the ramp (the same directions on our Mammoth Cave dining page).',
    },
    {
      q: 'Does Flavor Isle take online orders?',
      a: 'Yes — order ahead at flavor-isle.com and skip the wait, or call in a phone order at (270) 563-4618.',
    },
    {
      q: "What are Flavor Isle's hours?",
      a: `${hoursText}. The kitchen closes 30 minutes before close.`,
    },
    {
      q: 'Is there parking for trucks and trailers?',
      a: 'Yes — easy on/off I-65 parking. Look for the blue P markers along N Main St and in the nearby marked lots, and avoid the spots marked with a red crossed-out P.',
    },
    {
      q: 'Is Flavor Isle family friendly?',
      a: "Yes — we're a hometown burgers and shakes restaurant with a kids menu and ice cream cones, and there's room for the whole crew.",
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

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map(({ q, a }) => ({
      '@type': 'Question',
      name: q,
      acceptedAnswer: { '@type': 'Answer', text: a },
    })),
  };

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="FAQ | Flavor Isle — Smiths Grove, KY (I-65 Exit 38)"
        description="Flavor Isle FAQs: where we are off I-65 Exit 38, how close we are to Mammoth Cave, online ordering, live hours, truck and trailer parking, family seating, delivery and catering."
        ogTitle="FAQ | Flavor Isle — Smiths Grove, KY (I-65 Exit 38)"
        ogDescription="Directions off I-65 Exit 38, live hours, online ordering, parking for trucks and trailers, delivery and catering — the questions folks ask us most."
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

        <div className="text-center mt-10">
          <h2 className="font-heading text-2xl text-obsidian-roast">Still curious?</h2>
          <p className="text-sm text-muted-foreground mt-2 mb-5">Call us or come see us at 103 N Main St, Smiths Grove.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <Link to="/menu" className="btn-cherry chrome-hover px-7 py-3.5 text-sm font-heading inline-flex items-center gap-2">
              Order Online <ArrowRight size={16} />
            </Link>
            <a href="tel:+12705634618" className="btn-mint chrome-hover px-7 py-3.5 text-sm font-heading inline-flex items-center gap-2">
              <Phone size={16} /> (270) 563-4618
            </a>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}