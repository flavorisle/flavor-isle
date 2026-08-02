import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

const LOGO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';
const CART = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/1371a20d4_CartEmblem.png';

function PhoneFrame({ children, label }) {
  return (
    <div className="mx-auto" style={{ maxWidth: 280 }}>
      <div className="relative rounded-[2.5rem] bg-obsidian-roast p-2 shadow-float-lg">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-16 h-4 bg-obsidian-roast rounded-full z-20" />
        <div className="rounded-[2rem] overflow-hidden bg-vanilla-malt flex flex-col" style={{ aspectRatio: '9 / 19.5' }}>
          {children}
        </div>
      </div>
      {label && <p className="text-center font-heading text-obsidian-roast text-sm mt-4 tracking-wide">{label}</p>}
    </div>
  );
}

function AppHeader({ title }) {
  return (
    <div className="flex items-center justify-between px-3 py-2.5 bg-white border-b border-border">
      <img src={LOGO} alt="Flavor Isle" className="w-7 h-7 rounded-full object-contain" />
      <span className="font-heading text-obsidian-roast text-sm tracking-wide">{title}</span>
      <img src={CART} alt="Cart" className="w-6 h-6 object-contain" />
    </div>
  );
}

function ItemRow({ item }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-xl shadow-sm">
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-12 h-12 rounded-lg bg-muted flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-heading text-obsidian-roast text-xs leading-tight truncate">{item.name}</p>
        <p className="text-midnight-cherry font-heading text-sm">${Number(item.price).toFixed(2)}</p>
      </div>
      <span className="bg-midnight-cherry text-white text-[10px] font-heading px-2.5 py-1 rounded-full">Add</span>
    </div>
  );
}

function CartRow({ item, qty }) {
  return (
    <div className="flex items-center gap-2.5 px-3 py-2.5 bg-white rounded-xl shadow-sm">
      {item.image_url ? (
        <img src={item.image_url} alt={item.name} className="w-11 h-11 rounded-lg object-cover flex-shrink-0" />
      ) : (
        <div className="w-11 h-11 rounded-lg bg-muted flex-shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="font-heading text-obsidian-roast text-xs leading-tight truncate">{item.name}</p>
        <p className="text-patina-mint font-semibold text-xs">${(Number(item.price) * qty).toFixed(2)}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-obsidian-roast text-xs">−</span>
        <span className="font-heading text-obsidian-roast text-xs w-3 text-center">{qty}</span>
        <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-obsidian-roast text-xs">+</span>
      </div>
    </div>
  );
}

export default function AppScreenshots() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    base44.entities.MenuItem
      .filter({ is_available: true, is_hidden: false })
      .then(setItems)
      .catch(() => {});
  }, []);

  const burgers = items.filter((i) => (i.display_category || i.category) === 'Burgers').slice(0, 2);
  const sides = items.filter((i) => (i.display_category || i.category) === 'Sides').slice(0, 1);
  const shakes = items.filter((i) => (i.display_category || i.category) === 'Shakes').slice(0, 3);
  const menuPicks = [...burgers, ...sides].filter(Boolean);
  const cartPicks = [...burgers, ...sides].filter(Boolean);

  const cartTotal = cartPicks.reduce((sum, it, idx) => sum + Number(it.price) * (idx === 0 ? 2 : 1), 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
      {/* Menu screen */}
      <PhoneFrame label="Browse the Menu">
        <AppHeader title="Menu" />
        <div className="flex gap-1.5 px-3 py-2 overflow-hidden">
          {['Burgers', 'Chicken', 'Sides', 'Shakes'].map((c, i) => (
            <span
              key={c}
              className={`text-[9px] font-heading px-2 py-1 rounded-full whitespace-nowrap ${
                i === 0 ? 'bg-midnight-cherry text-white' : 'bg-white text-obsidian-roast'
              }`}
            >
              {c}
            </span>
          ))}
        </div>
        <div className="flex-1 overflow-hidden px-3 pb-3 space-y-2">
          {menuPicks.map((it) => (
            <ItemRow key={it.id} item={it} />
          ))}
        </div>
      </PhoneFrame>

      {/* Cart screen */}
      <PhoneFrame label="Build Your Order">
        <AppHeader title="Your Order" />
        <div className="px-3 py-2">
          <span className="text-[9px] font-heading px-2.5 py-1 rounded-full bg-midnight-cherry text-white">Pickup</span>
        </div>
        <div className="flex-1 overflow-hidden px-3 pb-2 space-y-2">
          {cartPicks.map((it, i) => (
            <CartRow key={it.id} item={it} qty={i === 0 ? 2 : 1} />
          ))}
        </div>
        <div className="px-3 py-2.5 bg-white border-t border-border">
          <div className="flex justify-between font-heading text-obsidian-roast text-xs mb-2">
            <span>Total</span>
            <span>${cartTotal.toFixed(2)}</span>
          </div>
          <div className="bg-midnight-cherry text-white text-center font-heading text-xs py-2 rounded-full">Checkout</div>
        </div>
      </PhoneFrame>

      {/* Shakes screen */}
      <PhoneFrame label="Thick Shakes">
        <AppHeader title="Shakes" />
        <div className="flex gap-1.5 px-3 py-2 overflow-hidden">
          {['Shakes', 'Drinks', 'Sides'].map((c, i) => (
            <span
              key={c}
              className={`text-[9px] font-heading px-2 py-1 rounded-full whitespace-nowrap ${
                i === 0 ? 'bg-midnight-cherry text-white' : 'bg-white text-obsidian-roast'
              }`}
            >
              {c}
            </span>
          ))}
        </div>
        <div className="flex-1 overflow-hidden px-3 pb-3 space-y-2">
          {shakes.map((it) => (
            <ItemRow key={it.id} item={it} />
          ))}
        </div>
      </PhoneFrame>
    </div>
  );
}