import React from 'react';

// Issue #324 — one modifier option as a photo tile: the picture on top, the
// option name under it, and a Lite / Reg / Ex strip along the bottom.
//
// state is the option's current level ("lite" | "reg" | "extra"), or null when
// it isn't on the order. Tapping the photo or the name means Reg; tapping a
// segment sets that level; tapping the segment that is already active clears
// the option back to null. The tiles are controlled — this component holds no
// state of its own, so the cart, the price and the ticket always agree.

const SEGMENTS = [
  { key: 'lite', label: 'Lite', spoken: 'Lite' },
  { key: 'reg', label: 'Reg', spoken: 'Regular' },
  { key: 'extra', label: 'Ex', spoken: 'Extra' },
];

export default function ModifierTile({ name, price, state, photo, onSelect, disabled, showSegments = true }) {
  const hasState = state != null;
  const extra = Number(price) > 0;

  const pick = (next) => {
    if (disabled) return;
    onSelect?.(next);
  };

  return (
    <div
      style={{
        width: 130,
        padding: 9,
        background: '#ffffff',
        borderRadius: 16,
        border: `2px solid ${hasState ? '#CC3300' : '#cfc9b8'}`,
        opacity: disabled ? 0.5 : 1,
      }}
      className={disabled ? 'cursor-not-allowed' : ''}
    >
      <button
        type="button"
        onClick={() => pick('reg')}
        disabled={disabled}
        aria-label={`${name} Regular`}
        aria-pressed={hasState}
        className="block w-full"
      >
        {photo?.url ? (
          <img
            src={photo.url}
            alt={photo.alt || name}
            width={86}
            height={86}
            loading="lazy"
            decoding="async"
            style={{ width: 86, height: 86, objectFit: 'cover', borderRadius: 14, display: 'block', margin: '0 auto' }}
          />
        ) : (
          <div style={{ width: 86, height: 86, borderRadius: 14, background: '#f5efe2', margin: '0 auto' }} />
        )}
        <span
          style={{
            display: 'block',
            marginTop: 6,
            fontSize: 11,
            fontWeight: 700,
            color: '#003366',
            textAlign: 'center',
            lineHeight: 1.3,
          }}
        >
          {name}
        </span>
        {extra && (
          <span style={{ display: 'block', fontSize: 10, fontWeight: 700, color: '#003366', textAlign: 'center' }}>
            +${Number(price).toFixed(2)}
          </span>
        )}
      </button>

      {showSegments && (
      <div
        style={{
          display: 'flex',
          width: '100%',
          marginTop: 6,
          border: '1px solid #CC3300',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        {SEGMENTS.map((segment, i) => {
          const active = state === segment.key;
          return (
            <button
              key={segment.key}
              type="button"
              onClick={() => pick(active ? null : segment.key)}
              disabled={disabled}
              aria-label={`${name} ${segment.spoken}`}
              aria-pressed={active}
              style={{
                flex: 1,
                padding: '6px 0',
                fontSize: 8,
                fontWeight: 800,
                letterSpacing: '.04em',
                textTransform: 'uppercase',
                lineHeight: 1,
                background: active ? '#CC3300' : '#ffffff',
                color: active ? '#ffffff' : '#CC3300',
                borderLeft: i > 0 ? '1px solid #f0c9b8' : 'none',
              }}
            >
              {segment.label}
            </button>
          );
        })}
      </div>
      )}
    </div>
  );
}