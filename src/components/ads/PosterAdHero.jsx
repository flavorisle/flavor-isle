import React from 'react';
import { themeOf } from '@/lib/printAds';

export default function PosterAdHero({ ad }) {
  const t = themeOf(ad.theme);
  const sub = ad.subhead || '';
  const hi = ad.subhead_highlight || '';
  const at = hi ? sub.indexOf(hi) : -1;
  const badge = ad.badge_top || ad.badge_bottom;
  return (
    <div style={{ padding: '14px 30px 0', flexShrink: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: t.accent, fontSize: 10.5, lineHeight: 1.5, fontWeight: 800, letterSpacing: '.2em', marginBottom: 12 }}>
        <span style={{ height: 2, background: t.accent, flex: 1, minWidth: 16, opacity: 0.55 }} />
        <span style={{ textAlign: 'center' }}>{ad.kicker || ''}</span>
        <span style={{ height: 2, background: t.accent, flex: 1, minWidth: 16, opacity: 0.55 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: badge ? 'minmax(0, 1fr) 144px' : '1fr', gap: 16, alignItems: 'start' }}>
        <div className="ad-bebas" style={{ fontSize: 132, lineHeight: 1.02, letterSpacing: '.005em', overflowWrap: 'anywhere' }}>
          {ad.title ? <div style={{ color: t.ink }}>{ad.title}</div> : null}
          {ad.title_accent ? <div style={{ color: t.accent, textShadow: `2px 2px 0 ${t.ink}` }}>{ad.title_accent}</div> : null}
        </div>
        {badge ? (
          <div style={{ position: 'relative', width: 138, height: 138, marginTop: 6, borderRadius: '50%', border: `3px solid ${t.accent}`, color: t.accent, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', transform: 'rotate(-11deg)', background: t.paper, textAlign: 'center' }}>
            <div style={{ position: 'absolute', inset: 7, border: `1px solid ${t.accent}`, borderRadius: '50%' }} />
            <div style={{ fontSize: 26, lineHeight: 1.2 }}>&#10052;</div>
            <div className="ad-bebas" style={{ fontSize: 25, lineHeight: 1.2, letterSpacing: '.02em', marginTop: 3 }}>{(ad.badge_top || '').trim()}</div>
            <div style={{ fontSize: 8, lineHeight: 1.5, fontWeight: 800, letterSpacing: '.16em', marginTop: 2 }}>{ad.badge_bottom || ''}</div>
          </div>
        ) : null}
      </div>
      {sub ? (
        <p style={{ margin: '10px 0 0', padding: '0 0 3px', fontSize: 25, fontWeight: 800, lineHeight: 1.35, color: t.ink }}>
          {at >= 0 ? <>{sub.slice(0, at)}<span style={{ background: t.gold, padding: '0 5px', boxDecorationBreak: 'clone' }}>{hi}</span>{sub.slice(at + hi.length)}</> : sub}
        </p>
      ) : null}
    </div>
  );
}