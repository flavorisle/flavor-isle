import React from 'react';

// Issue #324 — one modifier option as a tile. Every option in every food
// modifier group renders as one of these, photo or not: the picture (or the
// option's first letter until Wesley adds the real shot) on top, the option
// name under it, and a Lite / Reg / Ex strip along the bottom.
//
// state is the option's current level ("lite" | "reg" | "extra"), or null when
// it isn't on the order. Tapping the photo or the name means Reg; tapping a
// segment sets that level; tapping the segment that is already active clears
// the option back to null. The tile is controlled — it holds no state of its
// own, so the cart, the price and the kitchen ticket always agree.
const SEGMENTS = [
  { key: 'lite', label: 'Lite', spoken: 'Lite' },
  { key: 'reg', label: 'Reg', spoken: 'Regular' },
  { key: 'extra', label: 'Ex', spoken: 'Extra' },
];

const FONT = 'Arial, Helvetica, sans-serif';

export default function ModifierTile({ name, price, state, photo, onSelect, disabled, size = 'md' }) {
  const active = state != null;
  const small = size === 'sm';
  const initial = String(name || '').trim().charAt(0).toUpperCase();

  const pick = (next) => {
    if (disabled) return;
    onSelect?.(next);
  };

  return (
    <div
      style={{
        width: '100%',
        background: '#ffffff',
        border: `2px solid ${active ? '#CC3300' : '#cfc9b8'}`,
        borderRadius: small ? 14 : 16,
        padding: small ? 7 : 9,
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
              borderRadius: 13,
              border: '1px solid #e2d6c0',
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
              borderRadius: 13,
              background: '#FBF4E4',
              border: '1px solid #ece1c9',
              fontFamily: 'Georgia, serif',
              fontWeight: 800,
              fontSize: small ? 20 : 26,
              color: '#c9b795',
            }}
          >
            {initial}
          </div>
        )}
        <span
          style={{
            display: 'block',
            marginTop: 7,
            fontFamily: FONT,
            fontWeight: 700,
            fontSize: small ? 10 : 11,
            lineHeight: 1.35,
            color: '#003366',
            textAlign: 'center',
            minHeight: small ? 28 : 30,
          }}
        >
          {name}
        </span>
        {Number(price) > 0 && (
          <span
            style={{
              display: 'block',
              fontFamily: FONT,
              fontWeight: 700,
              fontSize: 10,
              color: '#CC3300',
              textAlign: 'center',
            }}
          >
            +${Number(price).toFixed(2)}
          </span>
        )}
      </button>

      <div
        role="group"
        aria-label={`${name} amount`}
        style={{
          display: 'flex',
          width: '100%',
          marginTop: 7,
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
                padding: small ? '5px 0' : '6px 0',
                border: 'none',
                borderLeft: i > 0 ? '1px solid #f0c9b8' : 'none',
                background: on ? '#CC3300' : '#ffffff',
                color: on ? '#ffffff' : '#CC3300',
                fontFamily: FONT,
                fontWeight: 800,
                fontSize: 8,
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                lineHeight: 1,
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