import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

const WITCH_PHRASES = [
  'Boo! 👻',
  'Happy Halloween! 🎃',
  'Wicked choice! 🧙',
  'Hee hee hee! 🦇',
  'Spooky! 🕸️',
  'Double double toil and trouble! 🧪',
];

// A witch that pops up briefly when the user clicks certain buttons.
// Listens globally for clicks on [data-witch] elements, or any .btn-cherry /
// .btn-mint / .btn-yellow / shadcn Button, then shows a witch emoji + phrase.
export default function WitchPopup() {
  const [active, setActive] = useState(false);
  const [phrase, setPhrase] = useState(WITCH_PHRASES[0]);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  const handleClick = useCallback((e) => {
    const target = e.target.closest('[data-witch], button, a[role="button"], .btn-cherry, .btn-mint, .btn-yellow');
    if (!target) return;
    // Skip nav/toolbar chrome so it stays fun, not noisy
    if (target.closest('[data-no-witch]')) return;

    setPhrase(WITCH_PHRASES[Math.floor(Math.random() * WITCH_PHRASES.length)]);
    const rect = target.getBoundingClientRect();
    setPos({
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    });
    setActive(true);
  }, []);

  useEffect(() => {
    let timer;
    const onDown = (e) => {
      handleClick(e);
    };
    document.addEventListener('click', onDown, true);
    return () => {
      document.removeEventListener('click', onDown, true);
      clearTimeout(timer);
    };
  }, [handleClick]);

  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => setActive(false), 1600);
    return () => clearTimeout(t);
  }, [active]);

  if (!active) return null;

  return createPortal(
    <div
      aria-hidden
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        transform: 'translate(-50%, -50%)',
        zIndex: 9999,
        pointerEvents: 'none',
      }}
    >
      <div className="witch-pop flex flex-col items-center gap-1 select-none">
        <span style={{ fontSize: '3.5rem', lineHeight: 1 }}>🧙‍♀️</span>
        <span
          className="font-heading"
          style={{
            background: 'linear-gradient(135deg, #7a1fa2, #ff7518)',
            color: 'white',
            padding: '0.25rem 0.75rem',
            borderRadius: '999px',
            fontSize: '0.85rem',
            letterSpacing: '0.05em',
            boxShadow: '0 6px 20px rgba(122,31,162,0.4)',
            whiteSpace: 'nowrap',
          }}
        >
          {phrase}
        </span>
      </div>
    </div>,
    document.body
  );
}