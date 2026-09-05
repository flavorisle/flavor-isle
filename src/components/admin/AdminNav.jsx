import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, Receipt, Tag, MessagesSquare, MessageSquareQuote, Printer, Store } from 'lucide-react';

const LINKS = [
  { label: 'Dashboard', to: '/admin', Icon: LayoutDashboard },
  { label: 'Menu Manager', to: '/admin/menu', Icon: UtensilsCrossed },
  { label: 'Print Menu', to: '/admin/print-menu', Icon: Printer },
  { label: 'Orders', to: '/admin/orders', Icon: Receipt },
  { label: 'Store Settings', to: '/admin/store-settings', Icon: Store },
  { label: 'Reviews', to: '/admin/reviews', Icon: MessageSquareQuote },
  { label: 'Merch Categories', to: '/admin/merch-categories', Icon: Tag },
  { label: 'Comms', to: '/admin/communications', Icon: MessagesSquare },
];

export default function AdminNav() {
  const { pathname } = useLocation();
  return (
    <div className="bg-obsidian-roast border-b border-white/10">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-2 overflow-x-auto py-3 scrollbar-hide">
        {LINKS.map(({ label, to, Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-heading whitespace-nowrap transition-all ${
                active ? 'bg-midnight-cherry text-white' : 'text-gray-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon size={14} /> {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}