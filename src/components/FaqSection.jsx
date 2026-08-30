import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, Phone } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import useLiveStatus from '@/hooks/useLiveStatus';

export default function FaqSection() {
  const { waitMin } = useLiveStatus();
  const pickupMin = waitMin || 20;
  const deliveryMin = (waitMin || 20) + 20;

  const FAQ_SECTIONS = [
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
          a: "Head to the Account page and use the “Track Order” tab — drop in your order number to see live status updates from the moment we confirm your order until it's ready.",
        },
        {
          q: 'Do you deliver? Is there a fee?',
          a: 'Yes, we deliver locally for a flat $3.99 delivery fee. Just choose Delivery at checkout and enter your address.',
        },
        {
          q: 'Can I order by phone?',
          a: 'Of course! Call us at (270) 563-4618 and we\'ll take your order over the phone.',
        },
        {
          q: 'What if I need to cancel or change my order?',
          a: "Call us as soon as possible at (270) 563-4618. If the kitchen hasn't started your order yet, we'll happily adjust or cancel it.",
        },
      ],
    },
  ];

  return (
    <section id="faq" className="py-16 px-4 sm:px-6 scroll-mt-24">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <div className="w-14 h-14 bg-midnight-cherry rounded-full flex items-center justify-center mx-auto mb-4">
            <HelpCircle size={26} className="text-white" />
          </div>
          <h2 className="font-heading text-4xl text-obsidian-roast mb-2">Frequently Asked Questions</h2>
          <p className="text-muted-foreground">Everything you need to know about our menu, allergies, and ordering.</p>
        </div>

        <div className="space-y-8">
          {FAQ_SECTIONS.map((section) => (
            <div key={section.title} className="card-diner p-6">
              <h3 className="font-heading text-xl text-midnight-cherry mb-2">{section.title}</h3>
              <Accordion type="single" collapsible className="w-full">
                {section.faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`${section.title}-${i}`}>
                    <AccordionTrigger className="font-heading text-left text-obsidian-roast text-base">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          ))}
        </div>

        <div className="card-diner p-8 text-center mt-10">
          <h3 className="font-heading text-2xl text-obsidian-roast mb-2">Still have questions?</h3>
          <p className="text-muted-foreground mb-6">Give us a call or send us a message — we're happy to help.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a href="tel:+12705634618" className="btn-cherry chrome-hover px-8 py-4 text-sm font-heading inline-flex items-center justify-center gap-2">
              <Phone size={16} /> (270) 563-4618
            </a>
            <Link to="/contact" className="btn-mint chrome-hover px-8 py-4 text-sm font-heading inline-flex items-center justify-center">
              Contact Us
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}