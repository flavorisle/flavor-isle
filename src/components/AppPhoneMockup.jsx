import React, { useEffect, useMemo, useState } from 'react';
import { Wifi, BatteryFull, Search, Receipt, ShoppingBag, Star, ChevronLeft, Home, Bell } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { optimizedImageUrl } from '@/lib/utils';

const LOGO = optimizedImageUrl('https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png', 160, 160, 'fit');
const HERO_BURGER = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/ff12a1c2b_IMG_0375.png';

const NAVY = '#003366';
const NAVY_SOFT = '#7a8fa6';
const CREAM = '#F7F3E8';
const ORANGE = '#C85125';
const LINE = '#e3dcc7';

const CRAVINGS = ['Burgers', 'Chicken', 'Sides', 'Shakes', 'Drinks'];

// Shown until (or if) the live Fan Favorites read comes back. Real catalog
// items and Square photos, so the preview never renders empty.
const SAMPLE_ITEMS = [
  { id: 's1', name: 'Mini Cheeseburger', category: 'Burgers', price: 1.46, rating: 4.9, desc: 'Ordered by the dozen', image_url: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/773459974951866410f95644239f28a6ad21822e/original.jpeg' },
  { id: 's2', name: 'Bacon Cheeseburger', category: 'Burgers', price: 6.25, rating: 4.9, desc: 'Bacon, cheese, the works', image_url: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/ad8d76bbb47a33f888d3be71567d319d94c65082/original.jpeg' },
  { id: 's3', name: 'Cheeseburger', category: 'Burgers', price: 5.25, rating: 4.8, desc: 'Hand-patted, American cheese', image_url: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/b764a01145ba3e556049e4a6cd5e39b5333c599a/original.jpeg' },
  { id: 's4', name: 'Mini Burger', category: 'Burgers', price: 1.13, rating: 4.8, desc: 'Small, cheap, dangerous', image_url: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/e37542e2d37b96c2743f21e377bb6883917f7658/original.jpeg' },
  { id: 's5', name: '9 pc Chicken Rings', category: 'Chicken', price: 4.95, rating: 4.7, desc: 'Crispy, dunk-ready', image_url: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/79737d189fc46edc25110cc3653656f1a9261b32/original.jpeg' },
  { id: 's6', name: 'French Fries', category: 'Sides', price: 3.25, rating: 4.8, desc: 'Hot, salty, gone fast', image_url: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/4e92f3bb902bfa24b9bc258513d0b8b7396edfa0/original.jpeg' },
  { id: 's7', name: 'Curly Fries', category: 'Sides', price: 3.25, rating: 4.8, desc: 'Seasoned curls', image_url: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/38a611076ccd03a8d951041f9f5419d835410fe0/original.jpeg' },
  { id: 's8', name: 'Tater Tots', category: 'Sides', price: 3.25, rating: 4.8, desc: 'Crisp outside, fluffy in', image_url: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/8cee307547cd54f1c4bcae5ce91b1a22bbedf850/original.png' },
  { id: 's9', name: 'Onion Rings', category: 'Sides', price: 3.25, rating: 4.8, desc: 'Thick-cut, battered', image_url: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/9ed39a14b2f79500f38fc8e21a188cf2086eee55/original.jpeg' },
  { id: 's10', name: 'Strawberry Crunch Bliss', category: 'Shakes', price: 5.99, rating: 4.9, desc: 'Soft serve, real strawberry', image_url: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/74658b3c7582f8d0e4e6b4b04aa558968cb7eb59/original.jpeg' },
  { id: 's11', name: 'Caramel Apple Bliss', category: 'Shakes', price: 5.99, rating: 4.9, desc: 'Soft serve, caramel, apple', image_url: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/7fd507a60e2f4cf14984579f5e94005dda206ae2/original.png' },
  { id: 's12', name: 'Classic Drinks', category: 'Drinks', price: 1.98, rating: 4.6, desc: 'Fountain, refills up front', image_url: 'https://items-images-production.s3.us-west-2.amazonaws.com/files/4ba3b70d9dd0deca1a8aba6b11b4373e11b160ef/original.jpeg' },
];

const money = (n) => `$${Number(n || 0).toFixed(2)}`;

const TABS = [
  { key: 'home', label: 'HOME', Icon: Home },
  { key: 'search', label: 'SEARCH', Icon: Search },
  { key: 'orders', label: 'ORDERS', Icon: Receipt },
  { key: 'rewards', label: 'REWARDS', Icon: Star },
  { key: 'bag', label: 'BAG', Icon: ShoppingBag },
];

function LiveCircle() {
  return <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ backgroundColor: ORANGE }} />;
}

function Stars({ n }) {
  return (
    <span className="flex items-center gap-1">
      <Star size={9} className="fill-current" style={{ color: '#F5A623' }} />
      <span className="text-[10px] font-semibold" style={{ color: NAVY }}>{n || 4.8}</span>
    </span>
  );
}

export default function AppPhoneMockup() {
  const [tab, setTab] = useState('home');
  const [craving, setCraving] = useState('Burgers');
  const [bag, setBag] = useState([]);
  const [items, setItems] = useState(SAMPLE_ITEMS);
  const [orderReady, setOrderReady] = useState(false);

  // Same Fan Favorites list the homepage rail uses.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const rows = await base44.entities.MenuItem.filter({ is_fan_favorite: true }, 'fan_favorite_rank', 10);
        const visible = (rows || []).filter((i) => !i.is_hidden && i.price != null);
        if (active && visible.length) {
          setItems(visible.map((i, idx) => ({
            id: i.id || `f${idx}`,
            name: i.name,
            category: i.category || 'Burgers',
            price: i.price,
            rating: i.rating || 4.8,
            desc: i.description || '',
            image_url: i.image_url_opt || i.image_url,
          })));
        }
      } catch (error) {
        // Preview stays on the sample list; never blank.
        console.error('App preview fan favorites load failed:', error);
      }
    })();
    return () => { active = false; };
  }, []);

  // The tracker runs while the Orders tab is open.
  useEffect(() => {
    if (tab !== 'orders') { setOrderReady(false); return undefined; }
    const t = setTimeout(() => setOrderReady(true), 2600);
    return () => clearTimeout(t);
  }, [tab]);

  const shown = useMemo(() => {
    const list = items.filter((i) => (i.category || '').toLowerCase() === craving.toLowerCase());
    return list.length ? list.slice(0, 4) : items.slice(0, 4);
  }, [items, craving]);

  const catCount = (cat) => items.filter((i) => (i.category || '').toLowerCase() === cat.toLowerCase()).length;

  const addToBag = (item) => {
    setBag((prev) => {
      const hit = prev.find((p) => p.id === item.id);
      if (hit) return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + 1 } : p));
      return [...prev, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });
  };

  const bagCount = bag.reduce((n, p) => n + p.qty, 0);
  const subtotal = bag.reduce((n, p) => n + p.price * p.qty, 0);
  const tax = subtotal * 0.06;

  return (
    <div className="relative mx-auto" style={{ width: 300, maxWidth: '90vw' }}>
      <div
        className="absolute -left-3 bottom-24 z-10 w-11 h-11 rounded-full flex items-center justify-center shadow-float-lg"
        style={{ backgroundColor: '#C23126' }}
        aria-hidden
      >
        <ChevronLeft size={22} className="text-white" />
      </div>

      <div
        className="rounded-[2.5rem] border-[10px] shadow-float-lg overflow-hidden relative"
        style={{ borderColor: NAVY, backgroundColor: CREAM }}
      >
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 rounded-b-2xl z-20" style={{ backgroundColor: NAVY }} />

        <div className="flex items-center justify-between px-6 pt-2 pb-1 text-[11px] font-heading" style={{ color: NAVY }}>
          <span>9:41</span>
          <div className="flex items-center gap-1">
            <Wifi size={12} />
            <BatteryFull size={16} />
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2">
          <img src={LOGO} alt="Flavor Isle" className="w-8 h-8 rounded-lg object-contain bg-white p-0.5" />
          <div className="text-center leading-none">
            <div className="font-heading text-sm" style={{ color: NAVY }}>FLAVOR ISLE</div>
            <div className="text-[9px] tracking-widest" style={{ color: NAVY_SOFT }}>SMITHS GROVE, KY</div>
          </div>
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: NAVY }}>
            WB
          </div>
        </div>

        <div className="h-[520px] overflow-y-auto scrollbar-hide px-3 pb-3">

          {tab === 'home' && (
            <div>
              <div className="rounded-2xl overflow-hidden relative h-32 mb-2.5">
                <img src={optimizedImageUrl(HERO_BURGER, 500, 500)} alt="Flavor Isle double cheeseburger" width="500" height="500" className="w-full h-full object-cover" style={{ objectPosition: 'center 78%' }} />
                <div className="absolute inset-0 flex flex-col items-center justify-end pb-2" style={{ background: 'linear-gradient(to top, rgba(0,51,102,0.8) 0%, rgba(0,51,102,0) 55%)' }}>
                  <img src={LOGO} alt="" className="w-8 h-8 rounded-lg object-contain mb-0.5 bg-white/90 p-0.5" />
                  <div className="font-heading text-white text-sm leading-none">FLAVOR ISLE</div>
                  <div className="text-white/80 text-[8px] tracking-widest">SMITHS GROVE, KY</div>
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 mb-2.5" style={{ border: `1px solid ${LINE}` }}>
                <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#F5A623' }}>
                  <Star size={11} className="text-white fill-current" />
                </span>
                <div className="leading-tight">
                  <div className="text-[10px] font-bold" style={{ color: NAVY }}>120 Stars banked</div>
                  <div className="text-[9px]" style={{ color: '#6b7580' }}>50 bonus Stars on your 2nd online order</div>
                </div>
              </div>

              <p className="font-heading text-[10px] mb-1.5" style={{ color: NAVY }}>WHAT ARE YOU CRAVING?</p>
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-2.5">
                {CRAVINGS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCraving(c)}
                    aria-pressed={craving === c}
                    className="text-[10px] font-heading px-2.5 py-1.5 rounded-full whitespace-nowrap transition-colors"
                    style={craving === c
                      ? { backgroundColor: ORANGE, color: 'white', border: `1px solid ${ORANGE}` }
                      : { backgroundColor: 'white', color: NAVY, border: `1px solid ${LINE}` }}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <p className="font-heading text-[10px] mb-1.5" style={{ color: NAVY }}>{craving.toUpperCase()} WE LOVE</p>
              <div className="grid grid-cols-2 gap-2">
                {shown.map((item) => (
                  <div key={item.id} className="rounded-2xl bg-white overflow-hidden shadow-sm">
                    <div className="h-16 w-full overflow-hidden bg-white">
                      {item.image_url && <img src={item.image_url} alt={item.name} width="200" height="200" className="w-full h-full object-cover" loading="lazy" />}
                    </div>
                    <div className="p-2">
                      <div className="mb-0.5"><Stars n={item.rating} /></div>
                      <div className="font-heading text-[10px] leading-tight" style={{ color: NAVY }}>{item.name}</div>
                      <div className="text-[9px] leading-tight mb-1.5" style={{ color: '#5d6670', minHeight: 22 }}>{item.desc}</div>
                      <div className="flex items-center justify-between">
                        <span className="font-heading text-[10px]" style={{ color: NAVY }}>{money(item.price)}</span>
                        <button
                          type="button"
                          onClick={() => addToBag(item)}
                          className="text-[10px] font-heading text-white px-2 py-1 rounded-full active:scale-90 transition-transform"
                          style={{ backgroundColor: ORANGE }}
                        >
                          ADD +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'search' && (
            <div>
              <div className="flex items-center gap-2 rounded-xl bg-white px-2.5 py-2 mb-3" style={{ border: `1px solid ${LINE}` }}>
                <Search size={12} style={{ color: '#8a929b' }} />
                <span className="text-[10px]" style={{ color: '#8a929b' }}>Search the menu…</span>
              </div>
              <p className="font-heading text-[10px] mb-1.5" style={{ color: NAVY }}>JUMP TO</p>
              {CRAVINGS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => { setCraving(c); setTab('home'); }}
                  className="w-full flex items-center justify-between rounded-xl bg-white px-2.5 py-2 mb-1.5 text-left"
                  style={{ border: `1px solid ${LINE}` }}
                >
                  <span className="font-heading text-[10px]" style={{ color: NAVY }}>{c === 'Burgers' ? 'Burgers & Melts' : c}</span>
                  <span className="text-[9px]" style={{ color: '#8a929b' }}>{catCount(c)} items</span>
                </button>
              ))}
              <p className="font-heading text-[10px] mt-3 mb-1.5" style={{ color: NAVY }}>FAN FAVORITES</p>
              {items.slice(0, 3).map((item) => (
                <div key={item.id} className="flex items-center gap-2 rounded-xl bg-white p-1.5 mb-1.5" style={{ border: `1px solid ${LINE}` }}>
                  <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white">
                    {item.image_url && <img src={item.image_url} alt="" className="w-full h-full object-cover" loading="lazy" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-heading text-[10px] truncate" style={{ color: NAVY }}>{item.name}</div>
                    <div className="text-[9px]" style={{ color: '#7b848d' }}>{money(item.price)} · {(item.category || '').toLowerCase()}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'orders' && (
            <div>
              <div className="rounded-xl px-2.5 py-2 mb-3 text-white" style={{ backgroundColor: NAVY }}>
                <div className="font-heading text-[10px]">ORDER #900812 · PICKUP</div>
                <div className="text-[9px]" style={{ color: 'rgba(255,255,255,.75)' }}>
                  {orderReady ? 'Ready for pickup' : 'Ready in about 8 minutes'}
                </div>
              </div>

              <div className="relative pl-5 mb-2">
                <div className="absolute left-1.5 top-2 bottom-3 w-0.5" style={{ backgroundColor: LINE }} />
                <div className="relative mb-3.5">
                  <span className="absolute -left-[18px] top-0.5 w-3.5 h-3.5 rounded-full" style={{ backgroundColor: NAVY, border: `2px solid ${NAVY}` }} />
                  <div className="font-heading text-[10px]" style={{ color: NAVY }}>Order received</div>
                  <div className="text-[9px]" style={{ color: '#7b848d' }}>6:42 PM · paid</div>
                </div>
                <div className="relative mb-3.5">
                  <span className="absolute -left-[18px] top-0.5 w-3.5 h-3.5 rounded-full animate-pulse" style={{ backgroundColor: ORANGE, border: `2px solid ${ORANGE}` }} />
                  <div className="font-heading text-[10px]" style={{ color: NAVY }}>{orderReady ? 'Off the flat top' : 'Cooking now'}</div>
                  <div className="text-[9px]" style={{ color: '#7b848d' }}>{orderReady ? 'Bagged and waiting' : 'On the flat top'}</div>
                </div>
                <div className="relative">
                  <span
                    className="absolute -left-[18px] top-0.5 w-3.5 h-3.5 rounded-full transition-colors duration-300"
                    style={{ backgroundColor: orderReady ? NAVY : 'white', border: `2px solid ${orderReady ? NAVY : LINE}` }}
                  />
                  <div className="font-heading text-[10px] transition-colors" style={{ color: orderReady ? NAVY : NAVY_SOFT }}>Ready for pickup</div>
                  <div className="text-[9px]" style={{ color: '#7b848d' }}>We text you the second it's up</div>
                </div>
              </div>

              {orderReady && (
                <div className="flex items-center gap-2 rounded-xl px-2.5 py-2 text-[9px] font-bold" style={{ backgroundColor: 'rgba(245,166,35,.16)', border: '1px solid rgba(245,166,35,.5)', color: '#7a4b00' }}>
                  <Bell size={11} /> Order ready alert sent to your phone
                </div>
              )}

              <p className="font-heading text-[10px] mt-3 mb-1.5" style={{ color: NAVY }}>IN THIS ORDER</p>
              {(bag.length ? bag : [
                { id: 'o1', name: 'Bacon Cheeseburger', price: 6.25, qty: 1 },
                { id: 'o2', name: 'French Fries', price: 3.25, qty: 1 },
              ]).map((line) => (
                <div key={line.id} className="flex items-center justify-between rounded-xl bg-white px-2.5 py-2 mb-1.5" style={{ border: `1px solid ${LINE}` }}>
                  <span className="font-heading text-[10px]" style={{ color: NAVY }}>{line.qty}× {line.name}</span>
                  <span className="font-heading text-[10px]" style={{ color: NAVY }}>{money(line.price * line.qty)}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'rewards' && (
            <div>
              <div className="rounded-2xl px-3 py-3 mb-3 text-center text-white" style={{ background: 'linear-gradient(135deg,#003366,#004a94)' }}>
                <div className="font-heading text-2xl leading-none">120 ★</div>
                <div className="text-[8px] tracking-widest font-bold" style={{ color: 'rgba(255,255,255,.75)' }}>STAR REWARDS</div>
                <div className="h-1.5 rounded-full mt-2 mb-1 overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,.25)' }}>
                  <div className="h-full rounded-full" style={{ width: '72%', backgroundColor: '#F5A623' }} />
                </div>
                <div className="text-[8px] font-bold" style={{ color: 'rgba(255,255,255,.85)' }}>30 more Stars to a free fries</div>
              </div>
              <p className="font-heading text-[10px] mb-1.5" style={{ color: NAVY }}>RECENT STARS</p>
              {[
                ['Bacon Cheeseburger', '+6'],
                ['French Fries', '+3'],
                ['2nd online order bonus', '+50'],
                ['Walk-up window visit', '+5'],
              ].map(([label, pts]) => (
                <div key={label} className="flex items-center justify-between rounded-xl bg-white px-2.5 py-2 mb-1.5" style={{ border: `1px solid ${LINE}` }}>
                  <span className="text-[9.5px]" style={{ color: NAVY }}>{label}</span>
                  <span className="text-[9px] font-heading" style={{ color: ORANGE }}>{pts}</span>
                </div>
              ))}
            </div>
          )}

          {tab === 'bag' && (
            <div>
              <p className="font-heading text-[10px] mb-1.5" style={{ color: NAVY }}>YOUR BAG</p>
              {(bag.length ? bag : [
                { id: 'b1', name: 'Bacon Cheeseburger', price: 6.25, qty: 1 },
                { id: 'b2', name: 'French Fries', price: 3.25, qty: 1 },
                { id: 'b3', name: 'Classic Drinks', price: 1.98, qty: 1 },
              ]).map((line) => (
                <div key={line.id} className="flex items-center justify-between rounded-xl bg-white px-2.5 py-2 mb-1.5" style={{ border: `1px solid ${LINE}` }}>
                  <span className="font-heading text-[10px]" style={{ color: NAVY }}>{line.qty}× {line.name}</span>
                  <span className="font-heading text-[10px]" style={{ color: NAVY }}>{money(line.price * line.qty)}</span>
                </div>
              ))}
              <div className="rounded-xl bg-white px-2.5 py-2 mt-2" style={{ border: `1px solid ${LINE}` }}>
                <div className="flex justify-between text-[9.5px] mb-1" style={{ color: '#5d6670' }}>
                  <span>Subtotal</span><span>{money(subtotal)}</span>
                </div>
                <div className="flex justify-between text-[9.5px] mb-1" style={{ color: '#5d6670' }}>
                  <span>Tax (6%)</span><span>{money(tax)}</span>
                </div>
                <div className="flex justify-between font-heading text-[11px] pt-1" style={{ color: NAVY, borderTop: `1px solid ${LINE}` }}>
                  <span>Total</span><span>{money(subtotal + tax)}</span>
                </div>
              </div>
              <div className="text-center text-white rounded-xl py-2 mt-2 font-heading text-[10px]" style={{ backgroundColor: ORANGE }}>
                CHECKOUT · PICKUP
              </div>
              <p className="text-[8px] text-center mt-1.5" style={{ color: '#8a929b' }}>Preview only, nothing is ordered.</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-around py-2 border-t" style={{ backgroundColor: 'white', borderColor: LINE }}>
          {TABS.map(({ key, label, Icon }) => {
            const active = tab === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                aria-current={active ? 'page' : undefined}
                className="relative flex flex-col items-center gap-0.5 px-1.5 py-0.5"
                style={{ color: active ? NAVY : NAVY_SOFT }}
              >
                <Icon size={16} />
                <span className="text-[8px] font-heading" style={{ color: active ? NAVY : NAVY_SOFT }}>{label}</span>
                {key === 'bag' && bagCount > 0 && (
                  <span className="absolute -top-1 right-0 min-w-3.5 h-3.5 px-0.5 rounded-full text-[8px] text-white flex items-center justify-center" style={{ backgroundColor: '#C23126' }}>
                    {bagCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-center text-[11px] text-muted-foreground mt-3">
        <LiveCircle /> Tap it: the tabs and craving pills work.
      </p>
    </div>
  );
}
