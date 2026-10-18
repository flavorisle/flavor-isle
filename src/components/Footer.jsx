import React from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, Instagram, Facebook, Twitter } from 'lucide-react';
import useBusinessHours from '@/hooks/useBusinessHours';
import { hoursGroups } from '@/lib/businessHours';
import FooterSmsOptIn from '@/components/FooterSmsOptIn';
import FooterEmailSignup from '@/components/FooterEmailSignup';
import KentuckyTourismBadge from '@/components/KentuckyTourismBadge';
import FindSmashieClueChip from '@/components/findSmashie/FindSmashieClueChip';
import { optimizedImageUrl } from '@/lib/utils';

// Footer links, split into two labelled columns so they read as short scannable
// lists instead of one long stack down the page.
const ORDER_LINKS = [
  { label: 'Order Online', to: '/menu' },
  { label: 'Combos', to: '/combos' },
  { label: 'Milkshakes', to: '/milkshakes' },
  { label: 'Tasty Threads Merch', to: '/merch' },
  { label: 'Star Rewards', to: '/rewards' },
  { label: 'Newsletter', to: '/newsletter' },
  { label: 'My Account', to: '/account' },
];

const VISIT_LINKS = [
  { label: 'About Us', to: '/about' },
  { label: 'What to Expect', to: '/what-to-expect' },
  { label: 'What People Are Saying', to: '/reviews' },
  { label: 'I-65 Exit 38 Stop', to: '/i65-exit-38' },
  { label: 'Mammoth Cave Dining', to: '/mammoth-cave-dining' },
  { label: 'Corvette Car Clubs', to: '/corvette-car-clubs' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Contact Us', to: '/contact' },
  { label: 'Share Feedback', to: '/feedback' },
];

const HEADING_CLASS = 'font-heading text-sm uppercase tracking-widest text-smashie-yellow mb-4';

// Every footer link gets a comfortable tap height and an obvious hover/focus
// state, so nothing here reads as flat low-contrast text on the navy band.
const LINK_CLASS =
  'inline-flex items-center min-h-[38px] text-[15px] text-white/85 hover:text-white hover:underline underline-offset-4 transition-colors';

export default function Footer() {
  const businessHours = useBusinessHours();

  return (
    <footer className="bg-obsidian-roast text-white fall26-footer-accent">
      {/* Main footer */}
      <div className="max-w-7xl mx-auto px-5 sm:px-6 py-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-x-10 gap-y-10">
        {/* Brand */}
        <div className="sm:col-span-2 lg:col-span-3">
          <img
            src={optimizedImageUrl('https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/7b759012a_FlavorIsleBuilding.png', 600, 400, 'fit')}
            alt="Flavor Isle roadside stand — Smiths Grove, KY, Est. 1964"
            width="600"
            height="400"
            loading="lazy"
            decoding="async"
            className="w-full max-w-[240px] object-contain mb-4"
          />
          <p className="text-white/85 text-[15px] leading-relaxed">
            Smiths Grove's favorite burger restaurant. Fresh, never-frozen burgers, thick shakes, and hot sides.
          </p>
          <div className="flex gap-3 mt-5">
            <a
              href="https://instagram.com/flavor_isle"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Flavor Isle on Instagram"
              className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
            >
              <Instagram size={18} />
            </a>
            <a
              href="https://facebook.com/flavorisle"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Flavor Isle on Facebook"
              className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
            >
              <Facebook size={18} />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Flavor Isle on Twitter"
              className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/25 transition-colors"
            >
              <Twitter size={18} />
            </a>
          </div>
        </div>

        {/* Hours */}
        <div className="lg:col-span-3">
          <h4 className={HEADING_CLASS}>Hours</h4>
          <div className="text-[15px] text-white/85 divide-y divide-white/10">
            {hoursGroups(businessHours).map((g) => (
              <div key={g.days} className="flex justify-between gap-4 py-2">
                <span>{g.days}</span>
                <span className="text-white/75 text-right">{g.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Links */}
        <div className="sm:col-span-2 lg:col-span-4 grid grid-cols-2 gap-x-8 gap-y-8">
          <div>
            <h4 className={HEADING_CLASS}>Order &amp; Explore</h4>
            <div className="flex flex-col items-start">
              {ORDER_LINKS.map((l) => (
                <Link key={l.label} to={l.to} className={LINK_CLASS}>{l.label}</Link>
              ))}
            </div>
          </div>
          <div>
            <h4 className={HEADING_CLASS}>Visit &amp; Learn</h4>
            <div className="flex flex-col items-start">
              {VISIT_LINKS.map((l) => (
                <Link key={l.label} to={l.to} className={LINK_CLASS}>{l.label}</Link>
              ))}
            </div>
          </div>
        </div>

        {/* Find us */}
        <div className="lg:col-span-2">
          <h4 className={HEADING_CLASS}>Find Us</h4>
          <div className="flex flex-col items-start gap-1 text-[15px]">
            <a
              href="https://maps.google.com/?q=103+N+Main+St+Smiths+Grove+KY+42171"
              target="_blank"
              rel="noopener noreferrer"
              className={`${LINK_CLASS} items-start gap-2 text-left`}
            >
              <MapPin size={17} className="mt-1 flex-shrink-0 text-smashie-yellow" />
              <span>103 N Main St<br />Smiths Grove, KY 42171</span>
            </a>
            <a href="tel:+12705634618" className={`${LINK_CLASS} gap-2`}>
              <Phone size={17} className="flex-shrink-0 text-smashie-yellow" />
              <span>(270) 563-4618</span>
            </a>
            <p className="flex items-start gap-2 py-2 text-white/75">
              <Clock size={17} className="mt-1 flex-shrink-0 text-smashie-yellow" />
              <span>Kitchen closes 30 min before closing</span>
            </p>
          </div>
        </div>
      </div>

      {/* Email newsletter signup */}
      <FooterEmailSignup />

      {/* SMS opt-in + A2P disclosure */}
      <FooterSmsOptIn />

      {/* Clue of the Day — the hunt's riddle chip, October only. It renders
          nothing outside the hunt window, so the band disappears with it. */}
      <FindSmashieClueChip placement="footer" />

      {/* Traveler tips link — shown on every page */}
      <div className="border-t border-white/10 px-5 sm:px-6 py-4 text-center">
        <Link
          to="/about#traveler-tips"
          className="inline-flex items-center min-h-[38px] text-[15px] text-white/85 hover:text-white hover:underline underline-offset-4 transition-colors"
        >
          Just passing through? See traveler tips.
        </Link>
      </div>

      {/* Bottom bar — Kentucky Tourism listing + legal */}
      <div className="border-t border-white/10 px-5 sm:px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col-reverse sm:flex-row items-center justify-between gap-5">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
            <span className="text-white/70">© 2026 Flavor Isle. All rights reserved.</span>
            <Link to="/privacy-policy" className="inline-flex items-center min-h-[38px] text-white/85 hover:text-white hover:underline underline-offset-4 transition-colors">Privacy Policy</Link>
            <Link to="/terms-of-service" className="inline-flex items-center min-h-[38px] text-white/85 hover:text-white hover:underline underline-offset-4 transition-colors">Terms of Service</Link>
            <span className="text-white/60">Designed by WSLY Studios</span>
          </div>
          <KentuckyTourismBadge />
        </div>
      </div>
    </footer>
  );
}