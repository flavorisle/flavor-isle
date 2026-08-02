import React from 'react';
import { Wifi, BatteryFull, Search, Receipt, User, ShoppingBag, Star, Plus, ChevronLeft, Home } from 'lucide-react';

const LOGO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';

// Real photos already synced from Square — real Flavor Isle item imagery.
const BEST_SELLERS = [
  {
    name: 'Circus Cookie Bliss Milkshake',
    desc: 'Real ice cream, cookie crumble, thick shake',
    price: 5.99,
    rating: 4.8,
    image: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/fce44bc19f5273f8db53155385a31671b33671c4/original.jpeg',
  },
  {
    name: '8pc Mozzarella Sticks',
    desc: 'Golden, gooey, served with marinara',
    price: 6.6,
    rating: 4.7,
    image: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/674666783b85ac5a983b1acb8611e322faab2e3f/original.jpeg',
  },
];

const CRAVINGS = ['Burgers', 'Chicken', 'Sides', 'Shakes', 'Drinks'];

export default function AppPhoneMockup() {
  return (
    <div className="relative mx-auto" style={{ width: 300, maxWidth: '90vw' }}>
      {/* Floating back button (decorative, like the mockup) */}
      <div
        className="absolute -left-3 bottom-24 z-10 w-11 h-11 rounded-full flex items-center justify-center shadow-float-lg"
        style={{ backgroundColor: '#C23126' }}
        aria-hidden
      >
        <ChevronLeft size={22} className="text-white" />
      </div>

      {/* Phone frame */}
      <div
        className="rounded-[2.5rem] border-[10px] shadow-float-lg overflow-hidden relative"
        style={{ borderColor: '#003366', backgroundColor: '#F7F3E8' }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 rounded-b-2xl z-20" style={{ backgroundColor: '#003366' }} />

        {/* Status bar */}
        <div className="flex items-center justify-between px-6 pt-2 pb-1 text-[11px] font-heading" style={{ color: '#003366' }}>
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <Wifi size={12} />
            <BatteryFull size={16} />
          </div>
        </div>

        {/* App header */}
        <div className="flex items-center justify-between px-4 py-2">
          <img src={LOGO} alt="Flavor Isle" className="w-8 h-8 rounded-full object-contain" />
          <div className="text-center leading-none">
            <div className="font-heading text-sm" style={{ color: '#003366' }}>FLAVOR ISLE</div>
            <div className="text-[8px] tracking-widest" style={{ color: '#7a8fa6' }}>SMITHS GROVE, KY</div>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#003366' }}>
            <User size={15} className="text-white" />
          </div>
        </div>

        {/* Scrollable app content */}
        <div className="h-[520px] overflow-y-auto scrollbar-hide px-3 pb-3">
          {/* Hero */}
          <div
            className="rounded-2xl overflow-hidden relative h-36 flex flex-col items-center justify-center mb-3"
            style={{ background: 'linear-gradient(135deg, #003366 0%, #0b2f50 100%)' }}
          >
            <img src={LOGO} alt="Flavor Isle" className="w-16 h-16 rounded-full object-contain mb-1 bg-white/90 p-1" />
            <div className="font-heading text-white text-lg leading-none">FLAVOR ISLE</div>
            <div className="text-white/70 text-[10px] tracking-widest">SMASH BURGERS · SHAKES</div>
          </div>

          {/* Craving pills */}
          <p className="font-heading text-[11px] mb-2" style={{ color: '#003366' }}>WHAT ARE YOU CRAVING?</p>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-4">
            {CRAVINGS.map((c, i) => (
              <span
                key={c}
                className="text-[10px] font-heading px-3 py-1.5 rounded-full whitespace-nowrap"
                style={
                  i === 0
                    ? { backgroundColor: '#C85125', color: 'white' }
                    : { backgroundColor: 'white', color: '#003366', border: '1px solid #e3dcc7' }
                }
              >
                {c}
              </span>
            ))}
          </div>

          {/* Best sellers */}
          <p className="font-heading text-sm mb-2" style={{ color: '#003366' }}>BEST SELLERS</p>
          <div className="grid grid-cols-2 gap-2.5">
            {BEST_SELLERS.map(item => (
              <div key={item.name} className="rounded-2xl bg-white overflow-hidden shadow-sm">
                <div className="h-20 w-full overflow-hidden">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="p-2">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Star size={9} className="fill-current" style={{ color: '#F5A623' }} />
                    <span className="text-[9px] font-semibold" style={{ color: '#003366' }}>{item.rating}</span>
                  </div>
                  <div className="font-heading text-[11px] leading-tight" style={{ color: '#003366' }}>{item.name}</div>
                  <div className="text-[8px] leading-tight mb-1.5" style={{ color: '#4A4A4A' }}>{item.desc}</div>
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-[11px]" style={{ color: '#003366' }}>${item.price.toFixed(2)}</span>
                    <span
                      className="text-[9px] font-heading text-white px-2 py-1 rounded-full"
                      style={{ backgroundColor: '#C85125' }}
                    >
                      ADD +
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* In-app bottom nav */}
        <div className="flex items-center justify-around py-2 border-t" style={{ backgroundColor: 'white', borderColor: '#e3dcc7' }}>
          <div className="flex flex-col items-center gap-0.5">
            <Home size={16} style={{ color: '#003366' }} />
            <span className="text-[7px] font-heading" style={{ color: '#003366' }}>HOME</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Search size={16} style={{ color: '#7a8fa6' }} />
            <span className="text-[7px] font-heading" style={{ color: '#7a8fa6' }}>SEARCH</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Receipt size={16} style={{ color: '#7a8fa6' }} />
            <span className="text-[7px] font-heading" style={{ color: '#7a8fa6' }}>ORDERS</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <User size={16} style={{ color: '#7a8fa6' }} />
            <span className="text-[7px] font-heading" style={{ color: '#7a8fa6' }}>PROFILE</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 relative">
            <ShoppingBag size={16} style={{ color: '#7a8fa6' }} />
            <span className="text-[7px] font-heading" style={{ color: '#7a8fa6' }}>CART</span>
            <span className="absolute -top-1 right-1 w-3 h-3 rounded-full text-[7px] text-white flex items-center justify-center" style={{ backgroundColor: '#C23126' }}>2</span>
          </div>
        </div>
      </div>
    </div>
  );
}