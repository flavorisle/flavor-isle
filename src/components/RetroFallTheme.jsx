// ─────────────────────────────────────────────────────────────────────
// Retro Fall Diner Theme (Fall 2026) — ISOLATED SEASONAL STYLING
// ─────────────────────────────────────────────────────────────────────
// Everything in this file is presentational only. No functional, menu,
// pricing, discount, Happy Hour, rewards, checkout, cart, account,
// database, or backend logic lives here. To remove the fall theme later:
//   1. delete this file
//   2. remove its imports/usages from HeroSection.jsx, Home.jsx,
//      Navbar.jsx, and Footer.jsx
//
// Palette (complements existing brand, no tokens overwritten):
//   --fall26-burnt     #B5461A  burnt orange
//   --fall26-cream     #F5E9D0  warm cream
//   --fall26-burgundy  #6B1F1A  deep burgundy
//   --fall26-gold      #C8862E  warm gold
// ─────────────────────────────────────────────────────────────────────

import React from 'react';

// Injects all seasonal CSS once. Scoped class names are prefixed `fall26-`
// so they never collide with existing utilities and can be purged wholesale.
export function FallStyles() {
  return (
    <style>{`
      /* ── Seasonal eyebrow badge ── */
      .fall26-eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 0.6rem;
        font-family: var(--font-heading);
        letter-spacing: 0.32em;
        font-size: 0.78rem;
        text-transform: uppercase;
        color: #F5E9D0;
        background: linear-gradient(90deg, #6B1F1A 0%, #8a2a22 50%, #6B1F1A 100%);
        padding: 0.45rem 1.4rem;
        border-radius: 999px;
        border: 1px solid rgba(200, 134, 46, 0.55);
        box-shadow: 0 4px 18px rgba(107, 31, 26, 0.45), inset 0 1px 0 rgba(245,233,208,0.18);
        margin-bottom: 1.4rem;
      }
      .fall26-eyebrow::before,
      .fall26-eyebrow::after {
        content: '✦';
        color: #C8862E;
        font-size: 0.7rem;
        line-height: 1;
      }

      /* ── Retro sunburst ── rays behind the hero headline ── */
      .fall26-sunburst {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 1;
        opacity: 0.32;
        background: repeating-conic-gradient(
          from 0deg at 50% 34%,
          transparent 0deg,
          transparent 3.5deg,
          rgba(181, 70, 26, 0.7) 3.5deg,
          rgba(181, 70, 26, 0.7) 5.5deg
        );
        -webkit-mask-image: radial-gradient(circle at 50% 34%, #000 0%, rgba(0,0,0,0.5) 38%, transparent 66%);
        mask-image: radial-gradient(circle at 50% 34%, #000 0%, rgba(0,0,0,0.5) 38%, transparent 66%);
      }

      /* ── Restrained illustrated leaves in hero corners ── */
      .fall26-leaf-corner {
        position: absolute;
        pointer-events: none;
        z-index: 1;
        opacity: 0.42;
        filter: drop-shadow(0 2px 6px rgba(0,0,0,0.4));
      }
      .fall26-leaf-corner.tl { top: 9%; left: 5%; transform: rotate(-18deg); }
      .fall26-leaf-corner.br { bottom: 11%; right: 6%; transform: rotate(24deg); }

      /* ── Retro divider ── gradient rules + centered leaf + gold stars ── */
      .fall26-divider {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.9rem;
        padding: 0.6rem 1rem;
      }
      .fall26-divider::before,
      .fall26-divider::after {
        content: '';
        height: 2px;
        flex: 1;
        max-width: 280px;
        background: linear-gradient(90deg, transparent, #B5461A 50%, transparent);
      }
      .fall26-divider-leaf {
        color: #B5461A;
        flex-shrink: 0;
        filter: drop-shadow(0 1px 2px rgba(107, 31, 26, 0.3));
      }
      .fall26-divider-star {
        color: #C8862E;
        font-size: 0.7rem;
        line-height: 1;
      }

      /* ── Section accents ── visible warm top border + cream glow ── */
      .fall26-section {
        position: relative;
        border-top: 2px solid rgba(181, 70, 26, 0.5);
      }
      .fall26-section::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 110px;
        pointer-events: none;
        background: radial-gradient(ellipse at 50% 0%, rgba(245, 233, 208, 0.7), transparent 72%);
      }
      .fall26-section-dark {
        position: relative;
        border-top: 2px solid rgba(200, 134, 46, 0.55);
      }
      .fall26-section-dark::before {
        content: '';
        position: absolute;
        top: 0; left: 0; right: 0;
        height: 110px;
        pointer-events: none;
        background: radial-gradient(ellipse at 50% 0%, rgba(181, 70, 26, 0.32), transparent 72%);
      }

      /* ── Light shared-nav + footer accents (homepage only) ── */
      .fall26-nav-accent {
        background-image: linear-gradient(90deg, rgba(181,70,26,0) 0%, #B5461A 18%, #C8862E 50%, #B5461A 82%, rgba(181,70,26,0) 100%);
        background-repeat: no-repeat;
        background-size: 100% 3px;
        background-position: bottom;
      }
      .fall26-footer-accent {
        border-top: 3px solid transparent;
        border-image: linear-gradient(90deg, rgba(181,70,26,0) 0%, #B5461A 18%, #C8862E 50%, #B5461A 82%, rgba(181,70,26,0) 100%) 1;
      }
    `}</style>
  );
}

// Small inline maple-leaf glyph (restrained illustration, no emoji).
export function FallLeaf({ size = 18, className = '', style = {} }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      style={style}
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12 2c.4 1.1.5 2 .4 2.9 1-.7 2-1 3.1-1 .2 1.2-.2 2.3-1 3.2 1.3 0 2.5.4 3.6 1.2-.9 1-2 1.5-3.3 1.6 1 .8 1.7 1.9 2 3.3-1.3.2-2.5-.1-3.6-.8.3 1.3.1 2.6-.6 3.8-1.1-.7-1.9-1.7-2.3-3-.5 1.3-1.4 2.3-2.6 2.9-.6-1.2-.7-2.5-.3-3.8-1.1.6-2.3.9-3.6.7.4-1.4 1.1-2.5 2.1-3.3-1.3-.1-2.4-.6-3.3-1.6 1.1-.8 2.3-1.2 3.6-1.2-.8-.9-1.2-2-1-3.2 1.1 0 2.1.3 3.1 1-.1-.9 0-1.8.4-2.9z" />
    </svg>
  );
}

// Retro sunburst backdrop for the hero (rendered behind the headline).
export function FallSunburst() {
  return <div className="fall26-sunburst" aria-hidden="true" />;
}

// Corner leaves for the hero (subtle, low opacity).
export function FallHeroLeaves() {
  return (
    <>
      <div className="fall26-leaf-corner tl" aria-hidden="true">
        <FallLeaf size={52} style={{ color: '#C8862E' }} />
      </div>
      <div className="fall26-leaf-corner br" aria-hidden="true">
        <FallLeaf size={60} style={{ color: '#B5461A' }} />
      </div>
    </>
  );
}

// The approved seasonal eyebrow. Text is exact per approval.
export function FallEyebrow() {
  return (
    <div className="fall26-eyebrow">
      Fall in Smiths Grove
    </div>
  );
}

// Retro divider used between homepage sections.
export function FallDivider() {
  return (
    <div className="fall26-divider" aria-hidden="true">
      <span className="fall26-divider-star">✦</span>
      <FallLeaf size={20} className="fall26-divider-leaf" />
      <span className="fall26-divider-star">✦</span>
    </div>
  );
}

export default FallStyles;