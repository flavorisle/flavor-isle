import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, MapPin, Phone, Clock, ShoppingBag } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';

// Plan #342 (letter K) — the Smiths Grove page. The body copy is fixed text
// supplied for this page, so it lives here as data rather than being rewritten
// by any live store setting. The Restaurant block carries the same @id as the
// site's restaurant so Google reads it as one restaurant, not a second one.
const PAGE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Restaurant',
  '@id': 'https://flavor-isle.com/#restaurant',
  name: 'Flavor Isle',
  url: 'https://flavor-isle.com/smiths-grove',
  telephone: '+1-270-563-4618',
  description:
    'Family-owned burger and ice cream diner in Smiths Grove, Kentucky, since 1964. Hand-patted, never-frozen burgers and thick hand-spun shakes, ordered at the walk-up window.',
  address: {
    '@type': 'PostalAddress',
    streetAddress: '103 N Main Street',
    addressLocality: 'Smiths Grove',
    addressRegion: 'KY',
    postalCode: '42171',
    addressCountry: 'US',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.7',
    reviewCount: '458',
    bestRating: '5',
    worstRating: '1',
  },
  openingHoursSpecification: [
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '10:30',
      closes: '19:00',
    },
    {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: 'Sunday',
      opens: '11:00',
      closes: '19:00',
    },
  ],
  servesCuisine: ['Burgers', 'American', 'Ice Cream'],
  hasMenu: 'https://flavor-isle.com/menu',
  acceptsReservations: 'False',
  sameAs: ['https://www.facebook.com/flavorisle', 'https://www.instagram.com/flavor_isle/'],
};

const INTRO = [
  'Flavor Isle is a burger and ice cream diner at 103 N Main Street in Smiths Grove, Kentucky. We are family-owned and have been since 1964. You order at the walk-up window, and you eat it here, in your car, or on the way home.',
  'Burgers are hand-patted and never frozen. Shakes are hand-spun and thick. Hours are Monday through Saturday 10:30 AM to 7:00 PM, and Sunday 11:00 AM to 7:00 PM.',
  'We are 0.7 miles off I-65 Exit 38, which makes us an easy stop if you are already on the road. We are also just a few minutes from the middle of town, which makes us an easy stop if you are not.',
];

const SECTIONS = [
  {
    id: 'restaurants',
    heading: 'Best restaurants in Smiths Grove',
    paragraphs: [
      'Smiths Grove is a small town with a short list of places to eat. We are one of them, and we have been since 1964.',
      'Here is what we actually are, so you can decide if it is what you want tonight. We are a burger and ice cream diner. We are not a full-service restaurant — there is no table service and no reservations. You walk up to the window, you order, you wait a few minutes while it cooks, and you take it where you like.',
      'That suits some people and not others, and we would rather you know before you drive out. What we can tell you is that the burgers are hand-patted and never frozen, the shakes are spun thick, and the sides come out of the fryer hot.',
      'If you are comparing the restaurants in Smiths Grove, come try us and compare for yourself.',
    ],
  },
  {
    id: 'diner',
    heading: 'Best diner',
    paragraphs: [
      'A diner should be plain, quick and familiar, and that is what we try to be.',
      'You order from a person standing on the other side of the window, and if you have a question about what is in something, you can ask it and get a real answer.',
      'We are open seven days. Monday through Saturday we open at 10:30 AM and close at 7:00 PM. Sunday we open at 11:00 AM and close at 7:00 PM.',
      'What we do is burgers, sandwiches, fried sides, and ice cream, from 10:30 in the morning until 7 at night.',
      'If you are looking for a diner in Smiths Grove, this is a diner in Smiths Grove. Come see whether it is your kind.',
    ],
  },
  {
    id: 'desserts',
    heading: 'Best desserts',
    paragraphs: [
      'The dessert side of the menu is shorter than the burger side, and it is the part people underestimate.',
      'There is hot fudge cake. There is cherry delight — ice cream between chocolate cake, with cherries over the top. There is strawberry shortcake and pineapple delight cake. There are soft serve cones, a cup of ice cream, and floats.',
      'And there are the shakes, which are dessert in a cup whether or not you call them that.',
      'You can order dessert with your food at the walk-up window, or you can come back for it after. Nobody here is going to raise an eyebrow at somebody who orders a burger and then a hot fudge cake and eats both.',
      'If you are hunting for desserts in Smiths Grove, this is what we have. It is not a bakery case and it is not fancy. It is cold, it is sweet, and it is made when you order it.',
    ],
  },
  {
    id: 'milkshakes',
    heading: 'Best milkshakes',
    paragraphs: [
      'Our shakes are hand-spun, and they are thick on purpose. Thick enough that we hand you a spoon with it, because a straw alone will not get you to the bottom.',
      'The fruit ones use real fruit — strawberry, cherry, banana — not syrup. The rest of the board is what it says: chocolate, vanilla, caramel, butterscotch, peanut butter, pineapple, cookies and creme, orange creamsicle, hot fudge.',
      'There is also a rotating line of Bliss shakes that changes with the season. In December that means peppermint — Peppermint Crunch, Peppermint Bark, Peppermint Oreo, Peppermint Hot Cocoa — along with Ginger Bread and Snow Day. When they come off the board, they are gone until next year.',
      'If you want to know what is on the shake board today, call (270) 563-4618 and ask. It changes, and we would rather tell you than have you drive out for something we do not have.',
    ],
    link: { label: 'See the full shake list', to: '/milkshakes' },
  },
  {
    id: 'burgers',
    heading: 'Best burgers',
    paragraphs: [
      'The burger is the reason most people stop the first time.',
      'The beef comes in as beef. We pat the patties by hand, here, and they go on the flat top when you order them. They are never frozen. That takes longer than a pre-formed patty, and at a walk-up window that means a few minutes of standing around. We think it is the right trade, and most people who come back seem to agree.',
      'The list: hamburger, cheeseburger, double cheeseburger, bacon cheeseburger, double bacon cheeseburger, double bacon hamburger, mushroom Swiss, double mushroom Swiss, mini burger, mini cheeseburger, and hamburger steak.',
      'They come off the flat top hot, and they are best eaten within a few minutes of getting them. If you are driving far, eat in the truck.',
      'If you are looking for the best burgers in Smiths Grove, we are not going to tell you we have won that. What we will tell you is that we have been patting them by hand on Main Street since 1964, and that 4.7 stars across 458 Google reviews is not a bad place to start your own comparison.',
    ],
    link: { label: 'See the full menu', to: '/menu' },
  },
  {
    id: 'finding-us',
    heading: 'Finding us',
    paragraphs: [
      'Flavor Isle is at 103 N Main Street, Smiths Grove, KY 42171. From I-65, take Exit 38 and go 0.7 miles into town.',
      'We are open Monday through Saturday 10:30 AM to 7:00 PM, and Sunday 11:00 AM to 7:00 PM.',
      'Order at the walk-up window, call (270) 563-4618, or order online at flavor-isle.com for pickup.',
    ],
    link: { label: 'Directions', to: '/contact' },
  },
];

function Body({ paragraphs }) {
  return (
    <div className="space-y-4">
      {paragraphs.map((text) => (
        <p key={text} className="text-muted-foreground leading-relaxed">
          {text}
        </p>
      ))}
    </div>
  );
}

export default function SmithsGrove() {
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Seo
        title="Smiths Grove, KY Diner | Flavor Isle Burgers & Shakes"
        description="Family-owned since 1964, Flavor Isle is a walk-up burger and ice cream diner at 103 N Main St in Smiths Grove, KY. Hand-patted burgers, thick shakes."
        ogTitle="Smiths Grove, KY Diner | Flavor Isle Burgers & Shakes"
        ogDescription="Family-owned since 1964, Flavor Isle is a walk-up burger and ice cream diner at 103 N Main St in Smiths Grove, KY. Hand-patted burgers, thick shakes."
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(PAGE_SCHEMA) }} />
      <Navbar />
      <CartDrawer />

      {/* Intro */}
      <section className="bg-white border-b border-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
          <h1 className="font-heading text-4xl sm:text-5xl text-obsidian-roast leading-tight">
            Flavor Isle in Smiths Grove, Kentucky
          </h1>
          <div className="mt-6">
            <Body paragraphs={INTRO} />
          </div>
          <p className="text-muted-foreground leading-relaxed mt-4">
            Flavor Isle has 4.7 stars across 458 Google reviews.{' '}
            <Link to="/reviews" className="text-midnight-cherry hover:underline underline-offset-4">
              You can read them
            </Link>
            , and you are welcome to add one.
          </p>

          {/* At a glance */}
          <div className="card-diner p-6 mt-8 space-y-4">
            {[
              { icon: Phone, label: 'Phone', value: '(270) 563-4618', href: 'tel:+12705634618' },
              {
                icon: MapPin,
                label: 'Address',
                value: '103 N Main Street, Smiths Grove, KY 42171',
                href: 'https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171',
              },
              { icon: Clock, label: 'Hours', value: 'Mon–Sat 10:30 AM–7:00 PM · Sun 11:00 AM–7:00 PM', href: null },
              { icon: ShoppingBag, label: 'Order', value: 'at the walk-up window, by phone, or online at flavor-isle.com', href: null },
            ].map((info) => (
              <div key={info.label} className="flex items-start gap-4">
                <div className="w-11 h-11 bg-midnight-cherry/10 rounded-2xl flex items-center justify-center flex-shrink-0">
                  <info.icon size={18} className="text-midnight-cherry" />
                </div>
                <div className="min-w-0">
                  <p className="font-heading text-sm text-obsidian-roast mb-0.5">{info.label}</p>
                  {info.href ? (
                    <a
                      href={info.href}
                      target={info.href.startsWith('http') ? '_blank' : undefined}
                      rel="noopener noreferrer"
                      className="text-muted-foreground text-sm hover:text-midnight-cherry transition-colors"
                    >
                      {info.value}
                    </a>
                  ) : (
                    <p className="text-muted-foreground text-sm">{info.value}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Body sections */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
        {SECTIONS.map((section) => (
          <section key={section.id} id={section.id} className="py-8 scroll-mt-24">
            <h2 className="font-heading text-3xl text-obsidian-roast mb-4">{section.heading}</h2>
            <Body paragraphs={section.paragraphs} />
            {section.link && (
              <Link
                to={section.link.to}
                className="inline-flex items-center gap-1.5 mt-4 text-sm font-heading text-midnight-cherry hover:text-patina-mint transition-colors"
              >
                {section.link.label} <ArrowRight size={14} />
              </Link>
            )}
          </section>
        ))}
      </div>

      <Footer />
    </div>
  );
}