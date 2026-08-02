import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ArrowDown, Check, Plus, ShoppingBag, ChevronRight } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import GroupOrderBar from '@/components/GroupOrderBar';
import { useCart } from '@/context/CartContext';
import { base44 } from '@/api/base44Client';

// The "Build a Shake" product lives in Square (synced into our MenuItem by
// syncSquareCatalog). The builder reads its modifier lists straight from that
// record so prices, names, and availability stay in sync with Square — when
// something changes in Square, re-syncing the catalog updates the builder too.
const BUILD_A_SHAKE_ID = '6a3e3807a18b44ca4d34f85b';
const SHAKE_SQUARE_ID = 'ZKOAZRA72U6BAH6FEL6YX4GG';
const FALLBACK_BASE_PRICE = 4.79;

const CONSISTENCY_OPTIONS = [
  { id: 'thin', name: 'Thin', price: 0, emoji: '💧', desc: 'Sippable & smooth' },
  { id: 'regular', name: 'Regular', price: 0, emoji: '🥤', desc: 'The classic' },
  { id: 'thick', name: 'Thick', price: 0.50, emoji: '🥄', desc: 'Extra-rich & spoonable' },
];

// Square doesn't ship emojis or gradient styles, so keep a stable per-id map
// for the options we already know, plus a per-group fallback.
const EMOJI_BY_ID = {
  'OA4CSYLKWX2OSAOQ7O32ISR4': '🤍', 'U6JB3OHHQ6S7JVSXSCNZANKP': '🍫', '5ZUG7P26ILVVC4Y5PJ3FC7HZ': '🌀',
  'XYPZBSDCXU2Y4EYATSMQPMQZ': '🍦', '2765T2EK2M53XOZNFZF7VZCS': '🍒', 'BVTIWFPYZ5FH4UDLNTYPW2MD': '🍫',
  '4DTD5UMBRABS3GN6SIXRS4OE': '🍓', 'UDZBA6WXJEWLACC3Y2E7ZUQ5': '🍊', '2KJFHKWBOAW25X2P7FHHNGYQ': '🍌',
  'RHZJZ3DQRVV66WJP374E3GYB': '🥜', 'YYN2LUOXY75OODDBUTUQOSTE': '🍯', 'ST36CGTUEJ27R6ZE5A3SHDHG': '🍒',
  'AXAVKQDGGTXQS4OD7SXYTP3I': '🔥', 'ZXUGHRNO7K6USPGGAHXFZD7S': '🍍', 'ZA6WXV2M6V6NIPOGIYG73RCW': '🍓',
  'WARHR4DAXOSAL5MO3H47NQFB': '🫐', 'YRYN47I4LLDXEFCNE3KZPULJ': '🍇', 'G2KJEQLO5WRP65NHA3LDAY7S': '🍑',
  'KQCFHD42URDCIQLCBHYQFZDO': '🌈', '6IH2RXI3CTRHDKR3R3SDTVPV': '🥜', 'L53NHSZP7MPQCDC4I6KWCRHK': '🍪',
  'GQMTMFQNLKW27Y27XAMSDLHA': '⚫', 'OL4F7K5UDXCZYOAVBNVQJ2DS': '🍬', 'UQHGNPLSQ23GD5JZHET5OPK7': '🍘',
  '5O5XRBDGJQRGPFUCV7IT7ZLC': '🍫', 'QCKMNMJUXQ7JRRXNBB36R3LM': '🥜',
  '6SRGB4BVFVP5CVGN4RLCTKDY': '☁️', 'KR7G2IIKBEA4FAMQF6JRTD7Y': '🍯', 'X3LQNLZKFJB7ICJ62K5AU4DB': '🍫',
};

const BASE_STYLE_BY_ID = {
  'OA4CSYLKWX2OSAOQ7O32ISR4': { color: 'from-amber-50 to-yellow-100', border: 'border-yellow-300' },
  'U6JB3OHHQ6S7JVSXSCNZANKP': { color: 'from-amber-900/10 to-stone-200', border: 'border-amber-700' },
  '5ZUG7P26ILVVC4Y5PJ3FC7HZ': { color: 'from-yellow-50 to-amber-200', border: 'border-orange-400' },
};
const DEFAULT_BASE_STYLE = { color: 'from-amber-50 to-yellow-100', border: 'border-amber-300' };

const STEPS = [
  { num: '01', label: 'BASE', sub: 'Choose your ice cream' },
  { num: '02', label: 'CONSISTENCY', sub: 'Thin, regular, or thick' },
  { num: '03', label: 'FLAVOR', sub: '+$0.75 each' },
  { num: '04', label: 'THROW-INS', sub: '+$0.40 each' },
  { num: '05', label: 'CROWN IT', sub: 'The finishing touch' },
];

const toOption = (m, fallbackEmoji) => ({
  id: m.id,
  name: m.name,
  price: m.price || 0,
  emoji: EMOJI_BY_ID[m.id] || fallbackEmoji,
  sold_out: m.sold_out === true,
});

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
  const [shakeItem, setShakeItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedBase, setSelectedBase] = useState(null);
  const [selectedConsistency, setSelectedConsistency] = useState(CONSISTENCY_OPTIONS.find(o => o.id === 'regular'));
  const [selectedFlavors, setSelectedFlavors] = useState([]);
  const [selectedMixins, setSelectedMixins] = useState([]);
  const [selectedCrown, setSelectedCrown] = useState([]);
  const [added, setAdded] = useState(false);
  const builderRef = useRef(null);

  useEffect(() => {
    base44.entities.MenuItem.get(BUILD_A_SHAKE_ID)
      .then(it => { setShakeItem(it); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const groups = shakeItem?.modifiers || [];
  const findGroup = (kw) => groups.find(g => (g.name || '').toLowerCase().includes(kw));
  const baseOpts = (findGroup('base')?.modifiers || []).map(m => toOption(m, '🍦')).filter(m => !m.sold_out);
  const flavorOpts = (findGroup('flavor')?.modifiers || []).map(m => toOption(m, '🍒')).filter(m => !m.sold_out);
  const mixinOpts = (findGroup('mixin')?.modifiers || []).map(m => toOption(m, '🍪')).filter(m => !m.sold_out);
  const crownOpts = (findGroup('crown')?.modifiers || []).map(m => toOption(m, '☁️')).filter(m => !m.sold_out);

  const basePrice = shakeItem?.price ?? FALLBACK_BASE_PRICE;

  const toggleMulti = (setList, option) => {
    setList(prev => prev.some(s => s.id === option.id) ? prev.filter(s => s.id !== option.id) : [...prev, option]);
  };

  const totalPrice = basePrice
    + (selectedConsistency?.price || 0)
    + selectedFlavors.reduce((s, f) => s + f.price, 0)
    + selectedMixins.reduce((s, m) => s + m.price, 0)
    + selectedCrown.reduce((s, c) => s + c.price, 0);

  // Carry the Square modifier id through the cart so createSquareOrder can
  // emit these as real Square modifier lines on the POS ticket.
  const allModifiers = [
    ...(selectedBase ? [{ id: selectedBase.id, name: selectedBase.name, price: 0 }] : []),
    ...(selectedConsistency ? [{ name: `${selectedConsistency.name} Shake`, price: selectedConsistency.price }] : []),
    ...selectedFlavors.map(f => ({ id: f.id, name: f.name, price: f.price })),
    ...selectedMixins.map(m => ({ id: m.id, name: m.name, price: m.price })),
    ...selectedCrown.map(c => ({ id: c.id, name: c.name, price: c.price })),
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
      catalog_object_id: SHAKE_SQUARE_ID,
      isBuildShake: true,
      name: `Build a Shake — ${nameLabel}`,
      price: totalPrice,
      category: 'Shakes',
      selectedModifiers: allModifiers,
    });
    setAdded(true);
    setIsCartOpen(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const scrollToBuilder = () => builderRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

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
            {loading ? (
              <div className="text-center py-16 text-muted-foreground">
                <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
                <p className="font-heading">Loading ingredients…</p>
              </div>
            ) : (
              <>
                {/* Step 1: Base */}
                {step === 0 && (
                  <div>
                    <h3 className="font-heading text-2xl text-obsidian-roast mb-2">Choose Your Base</h3>
                    <p className="text-muted-foreground text-sm mb-8">Start with the foundation of your masterpiece.</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {baseOpts.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic col-span-full">No bases available right now.</p>
                      ) : baseOpts.map(opt => {
                        const style = BASE_STYLE_BY_ID[opt.id] || DEFAULT_BASE_STYLE;
                        return (
                          <button
                            key={opt.id}
                            onClick={() => setSelectedBase(opt)}
                            className={`relative p-6 rounded-2xl border-2 transition-all text-center bg-gradient-to-br ${style.color}
                              ${selectedBase?.id === opt.id ? `border-midnight-cherry shadow-float` : `${style.border} hover:shadow-float`}`}
                          >
                            <div className="text-5xl mb-3">{opt.emoji}</div>
                            <p className="font-heading text-obsidian-roast text-sm">{opt.name}</p>
                            {selectedBase?.id === opt.id && (
                              <div className="absolute top-3 right-3 w-6 h-6 bg-midnight-cherry rounded-full flex items-center justify-center">
                                <Check size={12} className="text-white" />
                              </div>
                            )}
                          </button>
                        );
                      })}
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
                    <p className="text-muted-foreground text-sm mb-8">Inject your shake with signature flavors. Each one unlocks a new dimension.</p>
                    <div className="flex flex-wrap gap-3">
                      {flavorOpts.map(opt => (
                        <OptionChip key={opt.id} option={opt} selected={selectedFlavors} onToggle={(o) => toggleMulti(setSelectedFlavors, o)} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 4: Mixins */}
                {step === 3 && (
                  <div>
                    <h3 className="font-heading text-2xl text-obsidian-roast mb-2">Throw-Ins</h3>
                    <p className="text-muted-foreground text-sm mb-8">Add texture and crunch with premium mix-ins.</p>
                    <div className="flex flex-wrap gap-3">
                      {mixinOpts.map(opt => (
                        <OptionChip key={opt.id} option={opt} selected={selectedMixins} onToggle={(o) => toggleMulti(setSelectedMixins, o)} />
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
                      {crownOpts.map(opt => (
                        <OptionChip key={opt.id} option={opt} selected={selectedCrown} onToggle={(o) => toggleMulti(setSelectedCrown, o)} />
                      ))}
                    </div>

                    {/* Order summary */}
                    <div className="border-t border-border pt-8">
                      <h4 className="font-heading text-obsidian-roast text-lg mb-4">Your Shake</h4>
                      <div className="space-y-2 mb-6">
                        {selectedBase && (
                          <div className="flex justify-between text-sm">
                            <span className="text-obsidian-roast font-semibold">{selectedBase.emoji} {selectedBase.name}</span>
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
                            <span className={c.price > 0 ? 'text-midnight-cherry' : 'text-muted-foreground'}>
                              {c.price > 0 ? `+$${c.price.toFixed(2)}` : 'Included'}
                            </span>
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
              </>
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