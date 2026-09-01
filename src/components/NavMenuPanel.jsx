// Dropdown navigation panel for the main header. Anchored under the header as a
// proper menu: grouped sections, icons, active highlighting, and the account /
// sign-in actions pinned at the bottom.
import React from 'react';
import { Link } from 'react-router-dom';
import {
  Home, UtensilsCrossed, IceCream2, Layers, Shirt, Sparkles, Bot,
  MessageSquareHeart, MapPin, User, LogOut, ChevronRight, Phone, Camera,
  PackageSearch, Instagram, Newspaper,
} from 'lucide-react';

const GROUPS = [
  {
    title: 'Order',
    links: [
      { label: 'Home', to: '/', icon: Home },
      { label: 'Menu', to: '/menu', icon: UtensilsCrossed },
      { label: 'Milkshakes', to: '/milkshakes', icon: IceCream2 },
      { label: 'Combos', to: '/combos', icon: Layers },
      { label: 'Tasty Threads', to: '/merch', icon: Shirt },
      { label: 'Order Status', to: '/order-status', icon: PackageSearch },
    ],
  },
  {
    title: 'More',
    links: [
      { label: 'Gallery', to: '/gallery', icon: Camera },
      { label: 'Community News', to: '/community-news', icon: Newspaper },
      { label: 'Social Reviews', to: '/social-reviews', icon: Instagram },
      { label: 'Meet Smashie', to: '/meet-smashie', icon: Sparkles },
      { label: 'Connect AI', to: '/connect', icon: Bot },
      { label: 'Feedback', to: '/feedback', icon: MessageSquareHeart },
      { label: 'Contact & Location', to: '/contact', icon: MapPin },
    ],
  },
];

export default function NavMenuPanel({ pathname, onClose, isAuthenticated, user, logout }) {
  const row = (link) => {
    const Icon = link.icon;
    const active = pathname === link.to;
    return (
      <Link
        key={link.to}
        to={link.to}
        onClick={onClose}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-body font-semibold transition-colors ${
          active
            ? 'bg-midnight-cherry text-white'
            : 'text-obsidian-roast hover:bg-muted'
        }`}
      >
        <span
          className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
            active ? 'bg-white/20 text-white' : 'bg-muted text-midnight-cherry group-hover:bg-white'
          }`}
        >
          <Icon size={16} />
        </span>
        <span className="flex-1 truncate">{link.label}</span>
        <ChevronRight size={15} className={active ? 'text-white/70' : 'text-muted-foreground'} />
      </Link>
    );
  };

  return (
    <div className="absolute left-0 right-0 top-full z-50 px-4 sm:px-6 pt-2">
      <div className="ml-auto w-full sm:max-w-sm bg-white rounded-2xl border border-border shadow-float-lg overflow-hidden">
        <div className="max-h-[70vh] overflow-y-auto p-3 space-y-4">
          {GROUPS.map(group => (
            <div key={group.title}>
              <p className="px-3 pb-1 text-[11px] font-heading tracking-[0.2em] text-muted-foreground uppercase">
                {group.title}
              </p>
              <div className="space-y-1">{group.links.map(row)}</div>
            </div>
          ))}

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