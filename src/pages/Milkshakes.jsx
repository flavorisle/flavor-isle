import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowDown, Check, Plus, Minus, ShoppingBag, ChevronRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import { useCart } from '@/context/CartContext';
import { base44 } from '@/api/base44Client';

const BASE_OPTIONS = [
  { id: 'OA4CSYLKWX2OSAOQ7O32ISR4', name: 'Vanilla Ice Cream', price: 0, emoji: '🤍', color: 'from-amber-50 to-yellow-100', border: 'border-yellow-300' },
  { id: 'U6JB3OHHQ6S7JVSXSCNZANKP', name: 'Chocolate Ice Cream', price: 0, emoji: '🍫', color: 'from-amber-900/10 to-stone-200', border: 'border-amber-700' },
  { id: '5ZUG7P26ILVVC4Y5PJ3FC7HZ', name: 'Swirl Ice Cream', price: 0, emoji: '🌀', color: 'from-yellow-50 to-amber-200', border: 'border-orange-400' },
];

const FLAVOR_OPTIONS = [
  { id: 'XYPZBSDCXU2Y4EYATSMQPMQZ', name: 'Vanilla Syrup', price: 0.75, emoji: '🍦' },
  { id: '2765T2EK2M53XOZNFZF7VZCS', name: 'Cherry Syrup', price: 0.75, emoji: '🍒' },
  { id: 'BVTIWFPYZ5FH4UDLNTYPW2MD', name: 'Chocolate Syrup', price: 0.75, emoji: '🍫' },
  { id: '4DTD5UMBRABS3GN6SIXRS4OE', name: 'Strawberry Syrup', price: 0.75, emoji: '🍓' },
  { id: 'UDZBA6WXJEWLACC3Y2E7ZUQ5', name: 'Orange Syrup', price: 0.75, emoji: '🍊' },
  { id: '2KJFHKWBOAW25X2P7FHHNGYQ', name: 'Real Bananas', price: 0.75, emoji: '🍌' },
  { id: 'RHZJZ3DQRVV66WJP374E3GYB', name: 'Peanut Butter', price: 0.75, emoji: '🥜' },
  { id: 'YYN2LUOXY75OODDBUTUQOSTE', name: 'Caramel Sauce', price: 0.75, emoji: '🍯' },
  { id: 'ST36CGTUEJ27R6ZE5A3SHDHG', name: 'Cherry Sauce', price: 0.75, emoji: '🍒' },
  { id: 'AXAVKQDGGTXQS4OD7SXYTP3I', name: 'Hot Fudge Sauce', price: 0.75, emoji: '🔥' },
  { id: 'ZXUGHRNO7K6USPGGAHXFZD7S', name: 'Pineapple Sauce', price: 0.75, emoji: '🍍' },
  { id: 'ZA6WXV2M6V6NIPOGIYG73RCW', name: 'Strawberry Sauce', price: 0.75, emoji: '🍓' },
  { id: 'WARHR4DAXOSAL5MO3H47NQFB', name: 'Blueberry Sauce', price: 0.75, emoji: '🫐' },
  { id: 'YRYN47I4LLDXEFCNE3KZPULJ', name: 'Raspberry Sauce', price: 0.75, emoji: '🍇' },
  { id: 'G2KJEQLO5WRP65NHA3LDAY7S', name: 'Peach Sauce', price: 0.75, emoji: '🍑' },
];

const MIXIN_OPTIONS = [
  { id: 'KQCFHD42URDCIQLCBHYQFZDO', name: 'Rainbow Sprinkles', price: 0.4, emoji: '🌈' },
  { id: '6IH2RXI3CTRHDKR3R3SDTVPV', name: 'Chopped Nuts', price: 0.4, emoji: '🥜' },
  { id: 'L53NHSZP7MPQCDC4I6KWCRHK', name: 'Circus Animal Cookies', price: 0.4, emoji: '🍪' },
  { id: 'GQMTMFQNLKW27Y27XAMSDLHA', name: 'Oreo Cookies', price: 0.4, emoji: '⚫' },
  { id: 'OL4F7K5UDXCZYOAVBNVQJ2DS', name: 'Butterfinger Cookies', price: 0.4, emoji: '🍬' },
  { id: 'UQHGNPLSQ23GD5JZHET5OPK7', name: 'Graham Crackers', price: 0.4, emoji: '🍘' },
  { id: '5O5XRBDGJQRGPFUCV7IT7ZLC', name: 'Chocolate Chips', price: 0.4, emoji: '🍫' },
  { id: 'QCKMNMJUXQ7JRRXNBB36R3LM', name: 'Peanut Butter Chips', price: 0.4, emoji: '🥜' },
];

const CROWN_OPTIONS = [
  { id: '6SRGB4BVFVP5CVGN4RLCTKDY', name: 'Whipped Cream', price: 0, emoji: '☁️' },
  { id: 'KR7G2IIKBEA4FAMQF6JRTD7Y', name: 'Caramel Drizzle', price: 0, emoji: '🍯' },
  { id: 'X3LQNLZKFJB7ICJ62K5AU4DB', name: 'Chocolate Drizzle', price: 0, emoji: '🍫' },
];

const CONSISTENCY_OPTIONS = [
  { id: 'thin', name: 'Thin', price: 0, emoji: '💧', desc: 'Sippable & smooth' },
  { id: 'regular', name: 'Regular', price: 0, emoji: '🥤', desc: 'The classic' },
  { id: 'thick', name: 'Thick', price: 0.50, emoji: '🥄', desc: 'Extra-rich & spoonable' },
];

const BUILD_A_SHAKE_ID = '6a3e3807a18b44ca4d34f85b';
const BASE_PRICE = 4.79;

const STEPS = [
  { num: '01', label: 'BASE', sub: 'Choose your ice cream' },
  { num: '02', label: 'CONSISTENCY', sub: 'Thin, regular, or thick' },
  { num: '03', label: 'FLAVOR', sub: '+$0.75 each' },
  { num: '04', label: 'THROW-INS', sub: '+$0.40 each' },
  { num: '05', label: 'CROWN IT', sub: 'The finishing touch' },
];

function OptionChip({ option, selected, onToggle, single }) {
  const isSelected = single ? selected?.id === option.id : selected?.some(s => s.id === option.id);
  return (
    <button
      onClick={() => onToggle(option)}
      className={`flex items-center gap-2 px-4 py-3 rounded-2xl border-2 transition-all font-body text-sm font-semibold
        ${isSelected
          ? 'border-midnight-cherry bg-midnight-cherry text-white shadow-float'
          : 'border-border bg-white text-obsidian-roast hover:border-midnight-cherry/50'
        }`}
    >
      <span className="text-lg leading-none">{option.emoji}</span>
      <span className="leading-snug">{option.name}</span>
      {option.price > 0 && (
        <span className={`text-xs ml-auto ${isSelected ? 'text-red-200' : 'text-muted-foreground'}`}>
          +${option.price.toFixed(2)}
        </span>
      )}
      {isSelected && <Check size={14} className="ml-1 flex-shrink-0" />}
    </button>
  );
}

export default function Milkshakes() {
  const { addItem, setIsCartOpen } = useCart();
  const [step, setStep] = useState(0);
  const [selectedBase, setSelectedBase] = useState(null);
  const [selectedConsistency, setSelectedConsistency] = useState(CONSISTENCY_OPTIONS.find(o => o.id === 'regular'));
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedMixins, setSelectedMixins] = useState([]);
  const [selectedCrown, setSelectedCrown] = useState([]);
  const [added, setAdded] = useState(false);
  const builderRef = useRef(null);

  const toggleMulti = (list, setList, option) => {
    setList(prev => prev.some(s => s.id === option.id) ? prev.filter(s => s.id !== option.id) : [...prev, option]);
  };

  const totalPrice = BASE_PRICE
    + (selectedConsistency?.price || 0)
    + selectedFlavors.reduce((s, f) => s + f.price, 0)
    + selectedMixins.reduce((s, m) => s + m.price, 0)
    + selectedCrown.reduce((s, c) => s + c.price, 0);

  const allModifiers = [
    ...(selectedBase ? [{ name: selectedBase.name, price: 0 }] : []),
    ...(selectedConsistency ? [{ name: `${selectedConsistency.name} Shake`, price: selectedConsistency.price }] : []),
    ...selectedFlavors.map(f => ({ name: f.name, price: f.price })),
    ...selectedMixins.map(m => ({ name: m.name, price: m.price })),
    ...selectedCrown.map(c => ({ name: c.name, price: c.price })),
  ];

  const nameLabel = [
    selectedBase ? selectedBase.name.split(' ')[0] : '',
    selectedConsistency ? selectedConsistency.name : '',
    ...selectedFlavors.slice(0, 2).map(f => f.name.split(' ')[0]),
  ].filter(Boolean).join(' + ') || 'Build a Shake';

  const handleAddToCart = () => {
    if (!selectedBase) return;
    addItem({
      id: BUILD_A_SHAKE_ID,
      name: `Build a Shake — ${nameLabel}`,
      price: totalPrice,
      category: 'Shakes',
      selectedModifiers: allModifiers,
    });
    setAdded(true);
    setIsCartOpen(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const scrollToBuilder = () => {
    builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const canProceed = step === 0 ? !!selectedBase : true;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      {/* Hero */}
      <section className="relative overflow-hidden bg-obsidian-roast min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 text-center">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 15% 50%, rgba(192,57,43,0.3) 0%, transparent 50%), radial-gradient(circle at 85% 30%, rgba(26,58,92,0.4) 0%, transparent 50%)`
        }} />
        {/* Subtle swirl bg pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Ccircle cx='30' cy='30' r='4'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />

        <div className="relative z-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-midnight-cherry/20 border border-midnight-cherry/40 text-red-300 px-4 py-2 rounded-full text-xs font-heading uppercase tracking-widest mb-8">
            "They Not Like Us"
          </div>

          <h1 className="font-heading leading-none mb-4">
            <span className="block text-7xl sm:text-9xl text-white">SHAKE</span>
            <span className="block text-7xl sm:text-9xl" style={{ color: '#4EE3C8' }}>ISLE</span>
          </h1>

          <p className="text-gray-300 text-lg mb-3 leading-relaxed">
            Introducing the <span className="text-white font-semibold">Build Your Own Shake</span> experience.
          </p>
          <p className="text-gray-400 text-base mb-12">
            Your rules. Your flavors. Your masterpiece.
          </p>

          <button
            onClick={scrollToBuilder}
            className="btn-cherry chrome-hover inline-flex items-center gap-3 px-10 py-5 font-heading text-base"
          >
            Build Yours Now <ArrowDown size={18} />
          </button>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-gray-500 text-xs font-heading uppercase tracking-widest flex flex-col items-center gap-2">
          <span>Scroll to explore</span>
          <ArrowDown size={14} className="animate-bounce" />
        </div>
      </section>

      {/* Process overview */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-patina-mint font-heading text-xs uppercase tracking-widest mb-3">The Process</p>
            <h2 className="font-heading text-4xl sm:text-5xl text-obsidian-roast">BUILD YOUR OWN SHAKE</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.num} className="text-center">
                <div className="w-14 h-14 rounded-full bg-obsidian-roast text-white font-heading text-xl flex items-center justify-center mx-auto mb-4">
                  {String(i + 1).padStart(2, '0')}
                </div>
                <h3 className="font-heading text-obsidian-roast text-lg mb-1">{s.label}</h3>
                <p className="text-muted-foreground text-sm">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Builder */}
      <section ref={builderRef} className="py-20 px-4 sm:px-6" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-patina-mint font-heading text-xs uppercase tracking-widest mb-3">Mix It Your Way</p>
            <h2 className="font-heading text-4xl sm:text-5xl text-obsidian-roast">OVER 25+ INGREDIENTS</h2>
          </div>

          {/* Step tabs */}
          <div className="flex items-center gap-2 mb-10 overflow-x-auto pb-2 scrollbar-hide">
            {STEPS.map((s, i) => (
              <button
                key={s.num}
                onClick={() => i <= step || (i === step + 1 && canProceed) ? setStep(i) : null}
                className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl font-heading text-sm transition-all
                  ${step === i ? 'bg-obsidian-roast text-white shadow-float' :
                    i < step ? 'bg-midnight-cherry/10 text-midnight-cherry border border-midnight-cherry/30' :
                    'bg-white/60 text-muted-foreground'}`}
              >
                <span className="opacity-60 text-xs">{s.num}</span>
                {s.label}
                {i < step && <Check size={12} />}
              </button>
            ))}
          </div>

          {/* Step panels */}
          <div className="card-diner p-8 mb-8">
            {/* Step 1: Base */}
            {step === 0 && (
              <div>
                <h3 className="font-heading text-2xl text-obsidian-roast mb-2">Choose Your Base</h3>
                <p className="text-muted-foreground text-sm mb-8">Start with the foundation of your masterpiece.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {BASE_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedBase(opt)}
                      className={`relative p-6 rounded-2xl border-2 transition-all text-center bg-gradient-to-br ${opt.color}
                        ${selectedBase?.id === opt.id ? `border-midnight-cherry shadow-float` : `${opt.border} hover:shadow-float`}`}
                    >
                      <div className="text-5xl mb-3">{opt.emoji}</div>
                      <p className="font-heading text-obsidian-roast text-sm">{opt.name}</p>
                      {selectedBase?.id === opt.id && (
                        <div className="absolute top-3 right-3 w-6 h-6 bg-midnight-cherry rounded-full flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Consistency */}
            {step === 1 && (
              <div>
                <h3 className="font-heading text-2xl text-obsidian-roast mb-2">Pick Your Consistency</h3>
                <p className="text-muted-foreground text-sm mb-8">How thick do you want it? Choose your perfect shake texture.</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {CONSISTENCY_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setSelectedConsistency(opt)}
                      className={`relative p-6 rounded-2xl border-2 transition-all text-center
                        ${selectedConsistency?.id === opt.id ? 'border-midnight-cherry bg-midnight-cherry/5 shadow-float' : 'border-border bg-white hover:border-midnight-cherry/50'}`}
                    >
                      <div className="text-4xl mb-3">{opt.emoji}</div>
                      <p className="font-heading text-obsidian-roast text-base">{opt.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                      {opt.price > 0 && (
                        <p className="text-xs text-midnight-cherry font-semibold mt-2">+${opt.price.toFixed(2)}</p>
                      )}
                      {selectedConsistency?.id === opt.id && (
                        <div className="absolute top-3 right-3 w-6 h-6 bg-midnight-cherry rounded-full flex items-center justify-center">
                          <Check size={12} className="text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Flavors */}
            {step === 2 && (
              <div>
                <h3 className="font-heading text-2xl text-obsidian-roast mb-2">Add Flavors</h3>
                <p className="text-muted-foreground text-sm mb-8">Inject your shake with signature flavors. Each one unlocks a new dimension. <span className="text-midnight-cherry font-semibold">+$0.75 each</span></p>
                <div className="flex flex-wrap gap-3">
                  {FLAVOR_OPTIONS.map(opt => (
                    <OptionChip
                      key={opt.id}
                      option={opt}
                      selected={selectedFlavors}
                      onToggle={(o) => toggleMulti(selectedFlavors, setSelectedFlavors, o)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Mixins */}
            {step === 3 && (
              <div>
                <h3 className="font-heading text-2xl text-obsidian-roast mb-2">Throw-Ins</h3>
                <p className="text-muted-foreground text-sm mb-8">Add texture and crunch with premium mix-ins. <span className="text-midnight-cherry font-semibold">+$0.40 each</span></p>
                <div className="flex flex-wrap gap-3">
                  {MIXIN_OPTIONS.map(opt => (
                    <OptionChip
                      key={opt.id}
                      option={opt}
                      selected={selectedMixins}
                      onToggle={(o) => toggleMulti(selectedMixins, setSelectedMixins, o)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Crown */}
            {step === 4 && (
              <div>
                <h3 className="font-heading text-2xl text-obsidian-roast mb-2">Crown It</h3>
                <p className="text-muted-foreground text-sm mb-8">The grand finale. Top your creation to perfection.</p>
                <div className="flex flex-wrap gap-3 mb-10">
                  {CROWN_OPTIONS.map(opt => (
                    <OptionChip
                      key={opt.id}
                      option={opt}
                      selected={selectedCrown}
                      onToggle={(o) => toggleMulti(selectedCrown, setSelectedCrown, o)}
                    />
                  ))}
                </div>

                {/* Order summary */}
                <div className="border-t border-border pt-8">
                  <h4 className="font-heading text-obsidian-roast text-lg mb-4">Your Shake</h4>
                  <div className="space-y-2 mb-6">
                    {selectedBase && (
                      <div className="flex justify-between text-sm">
                        <span className="text-obsidian-roast font-semibold">🍦 {selectedBase.name}</span>
                        <span className="text-muted-foreground">Included</span>
                      </div>
                    )}
                    {selectedConsistency && (
                      <div className="flex justify-between text-sm">
                        <span className="text-obsidian-roast">{selectedConsistency.emoji} {selectedConsistency.name} Shake</span>
                        <span className={selectedConsistency.price > 0 ? 'text-midnight-cherry' : 'text-muted-foreground'}>
                          {selectedConsistency.price > 0 ? `+$${selectedConsistency.price.toFixed(2)}` : 'Included'}
                        </span>
                      </div>
                    )}
                    {selectedFlavors.map(f => (
                      <div key={f.id} className="flex justify-between text-sm">
                        <span className="text-obsidian-roast">{f.emoji} {f.name}</span>
                        <span className="text-midnight-cherry">+${f.price.toFixed(2)}</span>
                      </div>
                    ))}
                    {selectedMixins.map(m => (
                      <div key={m.id} className="flex justify-between text-sm">
                        <span className="text-obsidian-roast">{m.emoji} {m.name}</span>
                        <span className="text-midnight-cherry">+${m.price.toFixed(2)}</span>
                      </div>
                    ))}
                    {selectedCrown.map(c => (
                      <div key={c.id} className="flex justify-between text-sm">
                        <span className="text-obsidian-roast">{c.emoji} {c.name}</span>
                        <span className="text-muted-foreground">Included</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-4">
                    <div>
                      <p className="font-heading text-2xl text-obsidian-roast">${totalPrice.toFixed(2)}</p>
                      <p className="text-xs text-muted-foreground">Build a Shake</p>
                    </div>
                    <button
                      onClick={handleAddToCart}
                      disabled={!selectedBase}
                      className={`btn-cherry chrome-hover flex items-center gap-2 px-8 py-4 font-heading text-sm transition-all
                        ${!selectedBase ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {added ? <><Check size={16} /> Added!</> : <><ShoppingBag size={16} /> Add to Order</>}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(s => Math.max(0, s - 1))}
              className={`px-6 py-3 rounded-2xl border border-border font-heading text-sm text-obsidian-roast hover:bg-white transition-all
                ${step === 0 ? 'invisible' : ''}`}
            >
              ← Back
            </button>

            {step < 4 ? (
              <button
                onClick={() => { if (canProceed) setStep(s => s + 1); }}
                disabled={!canProceed}
                className={`btn-cherry chrome-hover flex items-center gap-2 px-8 py-3 font-heading text-sm
                  ${!canProceed ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {step === 0 ? 'Pick Consistency' : step === 1 ? 'Add Flavors' : step === 2 ? 'Add Throw-Ins' : 'Crown It'} <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleAddToCart}
                disabled={!selectedBase}
                className={`btn-cherry chrome-hover flex items-center gap-2 px-8 py-3 font-heading text-sm
                  ${!selectedBase ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                {added ? <><Check size={16} /> Added to Cart!</> : <><ShoppingBag size={16} /> Add to Cart — ${totalPrice.toFixed(2)}</>}
              </button>
            )}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 sm:px-6 bg-obsidian-roast">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-4xl sm:text-5xl text-white mb-4 leading-tight">
            Your Creation<br /><span style={{ color: '#4EE3C8' }}>Awaits.</span>
          </h2>
          <p className="text-gray-400 mb-8 leading-relaxed">
            Pick your base. Layer in flavors. Load up on throw-ins. Crown it all.<br />
            <span className="text-white font-semibold">Your shake. Your rules.</span>
          </p>
          <button
            onClick={scrollToBuilder}
            className="btn-cherry chrome-hover inline-flex items-center gap-2 px-10 py-5 font-heading text-base"
          >
            Build Yours Now <ArrowRight size={18} />
          </button>
        </div>
      </section>

      <Footer />
    </div>
  );
}