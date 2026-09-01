// Dropdown navigation panel for the main header. Anchored under the header as a
// proper menu: grouped sections, icons, active highlighting, and the account /
// sign-in actions pinned at the bottom.
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Home, UtensilsCrossed, Shirt, Sparkles, Users, Info, User, LogOut, Phone,
} from 'lucide-react';
import NavSuperLink from '@/components/NavSuperLink';

// Super links: five top-level sections, each expanding to its child pages.
const GROUPS = [
  {
    title: 'Order',
    icon: UtensilsCrossed,
    links: [
      { label: 'Full Menu', to: '/menu' },
      { label: 'Milkshakes', to: '/milkshakes' },
      { label: 'Combos', to: '/combos' },
      { label: 'Order Status', to: '/order-status' },
    ],
  },
  {
    title: 'Shop',
    icon: Shirt,
    links: [
      { label: 'Tasty Threads', to: '/merch' },
    ],
  },
  {
    title: 'Smashie AI',
    icon: Sparkles,
    links: [
      { label: 'Meet Smashie', to: '/meet-smashie' },
      { label: 'Connect AI', to: '/connect' },
    ],
  },
  {
    title: 'Community',
    icon: Users,
    links: [
      { label: 'Gallery', to: '/gallery' },
      { label: 'Community News', to: '/community-news' },
      { label: 'Social Reviews', to: '/social-reviews' },
      { label: 'Feedback', to: '/feedback' },
    ],
  },
  {
    title: 'About',
    icon: Info,
    links: [
      { label: 'Contact & Location', to: '/contact' },
      { label: 'What to Expect', to: '/what-to-expect' },
      { label: 'Get the App', to: '/download' },
    ],
  },
];

export default function NavMenuPanel({ pathname, onClose, isAuthenticated, user, logout }) {
  // Start with the section containing the current page expanded.
  const [openGroup, setOpenGroup] = useState(
    () => GROUPS.find(g => g.links.some(l => l.to === pathname))?.title ?? null
  );
  const homeActive = pathname === '/';

  return (
    <div className="absolute left-0 right-0 top-full z-50 px-4 sm:px-6 pt-2">
      <div className="ml-auto w-full sm:max-w-sm bg-white rounded-2xl border border-border shadow-float-lg overflow-hidden">
        <div className="max-h-[70vh] overflow-y-auto p-3 space-y-3">
          <div className="space-y-1">
            <Link
              to="/"
              onClick={onClose}
              className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-heading tracking-wider uppercase transition-colors tap-44 ${
                homeActive ? 'bg-midnight-cherry text-white' : 'text-obsidian-roast hover:bg-muted'
              }`}
            >
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                homeActive ? 'bg-white/20 text-white' : 'bg-muted text-midnight-cherry'
              }`}>
                <Home size={16} />
              </span>
              Home
            </Link>
            {GROUPS.map(group => (
              <NavSuperLink
                key={group.title}
                group={group}
                pathname={pathname}
                open={openGroup === group.title}
                onToggle={() => setOpenGroup(openGroup === group.title ? null : group.title)}
                onClose={onClose}
              />
            ))}
          </div>

          <a
            href="tel:+12705634618"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-semibold text-obsidian-roast hover:bg-muted transition-colors"
          >
            <span className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-midnight-cherry">
              <Phone size={16} />
            </span>
            (270) 563-4618
          </a>

          <Link
            to="/menu"
            onClick={onClose}
            className="btn-cherry chrome-hover block px-5 py-3 text-center text-sm font-heading"
          >
            Order Now
          </Link>
        </div>

        <div className="border-t-2 border-border bg-muted/40 p-3 space-y-1">
          {isAuthenticated ? (
            <>
              <Link
                to="/account"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-semibold text-obsidian-roast hover:bg-white transition-colors"
              >
                <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-patina-mint">
                  <User size={16} />
                </span>
                <span className="flex-1 truncate">My Account</span>
              </Link>
              <button
                onClick={() => { logout(); onClose(); }}
                className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-body text-obsidian-roast hover:bg-white transition-colors"
              >
                <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-midnight-cherry">
                  <LogOut size={16} />
                </span>
                Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              onClick={onClose}
              className="btn-mint block px-5 py-3 text-center text-sm font-heading"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}