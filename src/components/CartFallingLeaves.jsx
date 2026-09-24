// Falling autumn leaves animation for the cart drawer.
// Presentational only — no cart logic. Scoped class names (fall26-leaf-*).
import React, { useMemo } from 'react';
import { FallLeaf } from '@/components/RetroFallTheme';

const COLORS = ['#B5461A', '#C8862E', '#6B1F1A', '#8a2a22'];

export default function CartFallingLeaves() {
  // Deterministic-ish random set so leaves don't reshuffle every render.
  const leaves = useMemo(
    () =>
      Array.from({ length: 9 }).map((_, i) => ({
        id: i,
        left: Math.round((i * 11 + 7) % 100),
        size: 14 + ((i * 5) % 16),
        delay: (i * 0.9) % 6,
        duration: 7 + ((i * 1.3) % 5),
        color: COLORS[i % COLORS.length],
        drift: (i % 2 === 0 ? 1 : -1) * (16 + (i % 3) * 10),
        rotate: (i % 2 === 0 ? 1 : -1) * (180 + (i % 4) * 60),
      })),
    []
  );

  return (
    <div className="fall26-leaf-rain" aria-hidden="true">
      <style>{`
        .fall26-leaf-rain {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
        .fall26-leaf-rain .fall26-leaf-drop {
          position: absolute;
          top: -40px;
          opacity: 0;
          animation-name: fall26-fall;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }
        @keyframes fall26-fall {
          0% { transform: translate3d(0, -10px, 0) rotate(0deg); opacity: 0; }
          8% { opacity: 0.55; }
          50% { transform: translate3d(var(--drift), 50vh, 0) rotate(calc(var(--rot) * 0.5)); opacity: 0.6; }
          90% { opacity: 0.4; }
          100% { transform: translate3d(calc(var(--drift) * 1.4), 105%, 0) rotate(var(--rot)); opacity: 0; }
        }
      `}</style>
      {leaves.map((l) => (
        <div
          key={l.id}
          className="fall26-leaf-drop"
          style={{
            left: `${l.left}%`,
            animationDelay: `${l.delay}s`,
            animationDuration: `${l.duration}s`,
            ['--drift']: `${l.drift}px`,
            ['--rot']: `${l.rotate}deg`,
          }}
        >
          <FallLeaf size={l.size} style={{ color: l.color }} />
        </div>
      ))}
    </div>
  );
}