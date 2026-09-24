import React from 'react';
import { Wifi, BatteryFull, Search, Receipt, User, ShoppingBag, Star, Plus, ChevronLeft, Home } from 'lucide-react';

const LOGO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';
const HERO_BURGER = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/ff12a1c2b_IMG_0375.png';

// Real Flavor Isle food photos provided by the owner.
const BEST_SELLERS = [
  {
    name: 'Double Bacon Cheeseburger',
    desc: 'Two fresh patties, bacon, melted cheese',
    price: 9.5,
    rating: 4.8,
    image: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/a5648d9bc_20240618_193404581_iOS.jpg',
  },
  {
    name: 'Zesty Bacon Ranch Fries',
    desc: 'Crinkle fries, bacon, ranch, zesty seasoning',
    price: 4.99,
    rating: 4.7,
    image: 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/d03ee300c_IMG_9874.jpg',
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
        <div className="flex items-center justify-between px-6 pt-2 pb-1 text-[14px] font-heading" style={{ color: '#003366' }}>
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <Wifi size={12} />
            <BatteryFull size={16} />
          </div>
        </div>

        {/* App header */}
        <div className="flex items-center justify-between px-4 py-2">
          <img src={LOGO} alt="Flavor Isle" className="w-8 h-8 rounded-lg object-contain" />
          <div className="text-center leading-none">
            <div className="font-heading text-sm" style={{ color: '#003366' }}>FLAVOR ISLE</div>
            <div className="text-[14px] tracking-widest" style={{ color: '#7a8fa6' }}>SMITHS GROVE, KY</div>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ backgroundColor: '#003366' }}>
            <User size={15} className="text-white" />
          </div>
        </div>

        {/* Scrollable app content */}
        <div className="h-[520px] overflow-y-auto scrollbar-hide px-3 pb-3">
          {/* Hero */}
          <div className="rounded-2xl overflow-hidden relative h-36 mb-3">
            <img src={HERO_BURGER} alt="Flavor Isle double cheeseburger" className="w-full h-full object-cover" style={{ objectPosition: 'center 78%' }} />
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-2" style={{ background: 'linear-gradient(to top, rgba(0,51,102,0.78) 0%, rgba(0,51,102,0) 55%)' }}>
              <img src={LOGO} alt="Flavor Isle" className="w-9 h-9 rounded-lg object-contain mb-0.5 bg-white/90 p-0.5" />
              <div className="font-heading text-white text-base leading-none">FLAVOR ISLE</div>
              <div className="text-white/80 text-[14px] tracking-widest">SMITHS GROVE, KY</div>
            </div>
          </div>

          {/* Craving pills */}
          <p className="font-heading text-[14px] mb-2" style={{ color: '#003366' }}>WHAT ARE YOU CRAVING?</p>
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-4">
            {CRAVINGS.map((c, i) => (
              <span
                key={c}
                className="text-[14px] font-heading px-3 py-1.5 rounded-full whitespace-nowrap"
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
                    <span className="text-[14px] font-semibold" style={{ color: '#003366' }}>{item.rating}</span>
                  </div>
                  <div className="font-heading text-[14px] leading-tight" style={{ color: '#003366' }}>{item.name}</div>
                  <div className="text-[14px] leading-tight mb-1.5" style={{ color: '#4A4A4A' }}>{item.desc}</div>
                  <div className="flex items-center justify-between">
                    <span className="font-heading text-[14px]" style={{ color: '#003366' }}>${item.price.toFixed(2)}</span>
                    <span
                      className="text-[14px] font-heading text-white px-2 py-1 rounded-full"
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
            <span className="text-[14px] font-heading" style={{ color: '#003366' }}>HOME</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Search size={16} style={{ color: '#7a8fa6' }} />
            <span className="text-[14px] font-heading" style={{ color: '#7a8fa6' }}>SEARCH</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <Receipt size={16} style={{ color: '#7a8fa6' }} />
            <span className="text-[14px] font-heading" style={{ color: '#7a8fa6' }}>ORDERS</span>
          </div>
          <div className="flex flex-col items-center gap-0.5">
            <User size={16} style={{ color: '#7a8fa6' }} />
            <span className="text-[14px] font-heading" style={{ color: '#7a8fa6' }}>PROFILE</span>
          </div>
          <div className="flex flex-col items-center gap-0.5 relative">
            <ShoppingBag size={16} style={{ color: '#7a8fa6' }} />
            <span className="text-[14px] font-heading" style={{ color: '#7a8fa6' }}>CART</span>
            <span className="absolute -top-1 right-1 w-3 h-3 rounded-full text-[14px] text-white flex items-center justify-center" style={{ backgroundColor: '#C23126' }}>2</span>
          </div>
        </div>
      </div>
    </div>
  );
}