import React, { useMemo } from 'react';

// SVG bat silhouette — flaps wings via CSS animation
function Bat({ size, top, delay, duration, direction }) {
  return (
    <div
      className="halloween-bat"
      style={{
        position: 'fixed',
        top: `${top}%`,
        left: direction === 'ltr' ? '-60px' : 'auto',
        right: direction === 'rtl' ? '-60px' : 'auto',
        width: size,
        height: size,
        zIndex: 1,
        pointerEvents: 'none',
        opacity: 0.55,
        animation: `bat-fly-${direction} ${duration}s linear ${delay}s infinite`,
      }}
    >
      <svg viewBox="0 0 100 60" className="bat-flap" style={{ width: '100%', height: '100%' }}>
        <path
          fill="currentColor"
          d="M50 30 C45 20 38 18 30 22 C22 26 15 22 8 28 C14 28 16 30 18 34 C12 34 8 38 5 44 C12 40 18 40 24 42 C20 46 18 50 20 56 C26 48 32 46 40 46 C42 52 46 56 50 58 C54 56 58 52 60 46 C68 46 74 48 80 56 C82 50 80 46 76 42 C82 40 88 40 95 44 C92 38 88 34 82 34 C84 30 86 28 92 28 C85 22 78 26 70 22 C62 18 55 20 50 30 Z"
        />
      </svg>
    </div>
  );
}

export default function HalloweenBats() {
  // Generate a flock of bats with varied positions/speeds once
  const bats = useMemo(() => {
    const flock = [];
    const count = 9;
    for (let i = 0; i < count; i++) {
      flock.push({
        id: i,
        size: 24 + Math.round(Math.random() * 28),
        top: Math.round(Math.random() * 75),
        delay: Math.round(Math.random() * 12),
        duration: 14 + Math.round(Math.random() * 12),
        direction: i % 2 === 0 ? 'ltr' : 'rtl',
      });
    }
    return flock;
  }, []);

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 1 }}>
      {bats.map((b) => (
        <Bat key={b.id} {...b} />
      ))}
    </div>
  );
}