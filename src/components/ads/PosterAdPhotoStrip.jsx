import React from 'react';
import { themeOf } from '@/lib/printAds';

export default function PosterAdPhotoStrip({ ad }) {
  const t = themeOf(ad.theme);
  if (!ad.strip_headline && !ad.strip_photo_wide) return null;
  return (
    <div style={{ marginTop: 14, height: 146, minHeight: 146, flex: 'none', display: 'flex', background: t.ink, overflow: 'hidden' }}>
      <div style={{ flex: '0 0 46%', padding: '12px 18px 12px 30px', color: t.paper, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <div style={{ fontSize: 9, lineHeight: 1.5, fontWeight: 800, letterSpacing: '.2em', color: t.gold }}>{ad.strip_kicker || ''}</div>
        <div className="ad-bebas" style={{ fontSize: 25, lineHeight: 1.15, marginTop: 6 }}>{ad.strip_headline || ''}</div>
        <div style={{ fontSize: 9.5, lineHeight: 1.45, fontWeight: 800, marginTop: 8, whiteSpace: 'pre-line' }}>{ad.strip_note || ''}</div>
      </div>
      <div style={{ flex: '1 1 auto', display: 'flex', minWidth: 0, height: '100%' }}>
        <div style={{ flex: '1 1 auto', minWidth: 0, height: '100%', position: 'relative' }}>
          {ad.strip_photo_wide ? <img src={ad.strip_photo_wide} alt="" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : null}
        </div>
        <div style={{ flex: '0 0 136px', minWidth: 0, height: '100%', position: 'relative' }}>
          {ad.strip_photo_tall ? <img src={ad.strip_photo_tall} alt="" decoding="async" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 40%', display: 'block' }} /> : null}
        </div>
      </div>
    </div>
  );
}