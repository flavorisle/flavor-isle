import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const ROSE = '#d85573';
const ROSE_BG = '#fce4e4';
const ROSE_TEXT = '#8e3a4e';

const SECTIONS = [
  {
    title: 'Sugar Free Flavors',
    items: [
      { name: 'Watermelon', emoji: '🍉' },
      { name: 'Strawberry', emoji: '🍓' },
      { name: 'Raspberry', emoji: '🫐' },
    ],
  },
  {
    title: 'Regular Flavors',
    items: [
      { name: 'Blackberry', emoji: '🫐' },
      { name: 'Rocket-Pop Vanilla', emoji: '🚀' },
      { name: 'Coconut', emoji: '🥥' },
      { name: 'Blue Raspberry', emoji: '🔷' },
      { name: 'Peach', emoji: '🍑' },
    ],
  },
  {
    title: 'Boba Flavors',
    items: [
      { name: 'Strawberry', emoji: '🧋' },
      { name: 'Peach', emoji: '🧋' },
      { name: 'Watermelon', emoji: '🧋' },
    ],
  },
];

export default function FlavorMenuAccordion() {
  const [open, setOpen] = useState(0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-10" style={{ backgroundColor: ROSE_BG }}>
      {/* Header band */}
      <div className="flex flex-col items-center text-center mb-8">
        <img src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/b8ded99b5_IMG_0733.jpeg" alt="The Sip Shack drinks" className="w-full max-w-md rounded-2xl mb-5 shadow-float" />
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-3" style={{ backgroundColor: 'white', border: `1.5px solid ${ROSE}` }}>
          <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#27ae60' }} />
          <span className="font-heading text-xs uppercase tracking-widest" style={{ color: ROSE_TEXT }}>Available Now</span>
        </div>
        <h1 className="font-heading text-4xl uppercase tracking-wider mb-3" style={{ color: ROSE_TEXT }}>The Sip Shack</h1>
        <span className="font-heading text-sm uppercase tracking-widest px-4 py-2 rounded-full mb-2" style={{ color: 'white', backgroundColor: ROSE }}>
          Lemonades · $5 · 32 oz
        </span>
        <span className="font-heading text-xs uppercase tracking-widest px-3 py-1.5 rounded-full" style={{ color: ROSE_TEXT, backgroundColor: 'white', border: `1.5px solid ${ROSE}` }}>
          All Flavors · $1
        </span>
      </div>

      {/* Accordion */}
      <div className="space-y-4">
        {SECTIONS.map((section, i) => {
          const isOpen = open === i;
          return (
            <div
              key={section.title}
              className="overflow-hidden rounded-3xl"
              style={{ backgroundColor: 'white', border: `1.5px solid ${ROSE}` }}
            >
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="w-full flex items-center justify-between px-5 py-4 transition-colors"
                style={{ backgroundColor: ROSE }}
              >
                <span className="font-heading text-white uppercase tracking-wider text-sm">{section.title}</span>
                <ChevronDown
                  size={18}
                  className="text-white transition-transform"
                  style={{ transform: isOpen ? 'rotate(180deg)' : 'none' }}
                />
              </button>
              {isOpen && (
                <div className="p-4 space-y-2">
                  {section.items.map(item => (
                    <div
                      key={item.name}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-2xl"
                      style={{ backgroundColor: ROSE_BG }}
                    >
                      <span className="text-2xl leading-none">{item.emoji}</span>
                      <span className="font-heading uppercase tracking-wide text-sm" style={{ color: ROSE_TEXT }}>
                        {item.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}