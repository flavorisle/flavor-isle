import React from 'react';

// Issue #324 (v9) — one modifier option as a tile: 148px wide, photo on top,
// the name (with its price on the same line) under it, and a Lite / Reg / Ex
// strip along the bottom.
//
// Height never changes: the photo block is square, the name box is exactly 24px
// (two lines at 12px, always reserved whether the name is long or short, with or
// without a price), and the footer is exactly 22px. A long name or a price can
// therefore never push a tile taller than its neighbour.
//
// state is the option's current level ("lite" | "reg" | "extra"), or null when
// it isn't on the order. Tapping the photo or the name means Reg; tapping a
// segment sets that level; tapping the segment that is already active clears the
// option back to null. The tile is controlled — it holds no state of its own, so
// the cart, the price and the kitchen ticket always agree.
const SEGMENTS = [
  { key: 'lite', label: 'Lite', spoken: 'Lite' },
  { key: 'reg', label: 'Reg', spoken: 'Regular' },
  { key: 'extra', label: 'Ex', spoken: 'Extra' },
];

const FONT = 'Arial, Helvetica, sans-serif';
const TILE_WIDTH = 148;
const NAME_BOX = 24;
const FOOTER = 22;

export default function ModifierTile({ name, price, state, photo, onSelect, disabled }) {
  const active = state != null;
  const initial = String(name || '').trim().charAt(0).toUpperCase();
  const hasPrice = Number(price) > 0;

  const pick = (next) => {
    if (disabled) return;
    onSelect?.(next);
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: TILE_WIDTH,
        boxSizing: 'border-box',
        background: '#ffffff',
        border: `2px solid ${active ? '#CC3300' : '#cfc9b8'}`,
        borderRadius: 16,
        padding: 6,
        opacity: disabled ? 0.55 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <button
        type="button"
        onClick={() => pick('reg')}
        disabled={disabled}
        aria-label={`${name} Regular`}
        aria-pressed={active}
        style={{
          display: 'block',
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {photo?.url ? (
          <img
            src={photo.url}
            alt={photo.alt || name}
            loading="lazy"
            decoding="async"
            style={{
              display: 'block',
              width: '100%',
              aspectRatio: '1 / 1',
              objectFit: 'cover',
              borderRadius: 11,
              border: '1px solid #e2d6c0',
              background: '#ffffff',
            }}
          />
        ) : (
          <div
            aria-hidden="true"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              aspectRatio: '1 / 1',
              borderRadius: 11,
              background: '#FBF4E4',
              border: '1px solid #ece1c9',
              fontFamily: 'Georgia, serif',
              fontWeight: 800,
              fontSize: 22,
              color: '#c9b795',
            }}
          >
            {initial}
          </div>
        )}

        {/* Name box: exactly 24px, two lines of 12px always reserved. The price
            rides on the name line in the same span — no second line, no gap. */}
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: NAME_BOX,
            lineHeight: '12px',
            overflow: 'hidden',
            textAlign: 'center',
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: 9,
            color: '#003366',
          }}
        >
          <span>
            {name}
            {hasPrice && ' '}
            {hasPrice && (
              <span style={{ color: '#CC3300', fontWeight: 800 }}>
                +${Number(price).toFixed(2)}
              </span>
            )}
          </span>
        </span>
      </button>

      <div
        role="group"
        aria-label={`${name} amount`}
        style={{
          display: 'flex',
          width: '100%',
          height: FOOTER,
          boxSizing: 'border-box',
          border: '1px solid #CC3300',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        {SEGMENTS.map((segment, i) => {
          const on = state === segment.key;
          return (
            <button
              key={segment.key}
              type="button"
              onClick={() => pick(on ? null : segment.key)}
              disabled={disabled}
              aria-label={`${name} ${segment.spoken}`}
              aria-pressed={on}
              style={{
                flex: 1,
                padding: 0,
                border: 'none',
                borderLeft: i > 0 ? '1px solid #f0c9b8' : 'none',
                background: on ? '#CC3300' : '#ffffff',
                color: on ? '#ffffff' : '#CC3300',
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: 6.5,
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                lineHeight: 1,
                height: '100%',
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {segment.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}