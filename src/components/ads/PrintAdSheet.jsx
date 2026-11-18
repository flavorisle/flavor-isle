import React from 'react';
import { MapPin, Phone, Clock, Globe, UtensilsCrossed, IceCream2, Flame } from 'lucide-react';
import { optimizedImageUrl } from '@/lib/utils';
import { galleryImage } from '@/lib/galleryPhotos';
import useBusinessHours from '@/hooks/useBusinessHours';
import useLiveStatus from '@/hooks/useLiveStatus';
import { hoursGroups } from '@/lib/businessHours';
import { themeOf, qrUrl, PRINT_CSS } from '@/lib/printAds';

const LOGO = 'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/acd2f8a2e_FlavorIsleLogosmaller.png';
const STOREFRONT = galleryImage('The sign at 1st and Main');

// NOTE: no quotes inside these CSS strings. The markup is escaped when React writes a
// style tag, so a quoted font name arrives as &#x27; and the rule dies.
const FONTS = `
#ad-sheet, #ad-sheet * { box-sizing: border-box; }
#ad-sheet :is(h1, h2, h3, h4, p, figure, blockquote, ul, ol) { margin: 0; padding: 0; }
#ad-sheet { font-family: Nunito, ui-sans-serif, system-ui, sans-serif; }
#ad-sheet .ad-bebas { font-family: Bebas Neue, ui-sans-serif, system-ui, sans-serif; }
`;

function HoursLines({ groups, size = 10.5 }) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.days} style={{ fontSize: `${size}px`, fontWeight: 800, lineHeight: 1.5, whiteSpace: 'nowrap' }}>
          {g.days} {g.label}
        </div>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ poster */

function PosterSheet({ ad, sheetId }) {
  const t = themeOf(ad.theme);
  const businessHours = useBusinessHours();
  const groups = hoursGroups(businessHours);
  const items = (ad.items || []).slice(0, 3);
  const lines = (ad.one_liners || []).slice(0, 3);
  const chips = ad.chips || [];

  const sub = ad.subhead || '';
  const hi = ad.subhead_highlight || '';
  const hiAt = hi ? sub.indexOf(hi) : -1;

  return (
    <div
      id={sheetId}
      style={{
        width: '8.5in', height: '11in', overflow: 'hidden', background: t.paper, color: t.ink,
        display: 'flex', flexDirection: 'column', position: 'relative',
        WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact',
      }}
    >
      {/* top bar */}
      <div style={{ background: t.ink, color: t.paper, padding: '10px 30px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
          <span className="ad-bebas" style={{ fontSize: 30, letterSpacing: '.06em', lineHeight: 1 }}>FLAVOR ISLE</span>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.22em', color: t.gold }}>BURGERS &middot; FRIES &middot; SHAKES</span>
        </div>
        <div style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.24em', opacity: 0.82 }}>103 N MAIN ST &middot; SMITHS GROVE, KY &middot; EST. 1964</div>
      </div>

      {/* hero */}
      <div style={{ position: 'relative', padding: '14px 30px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: t.accent, fontSize: 10.5, fontWeight: 900, letterSpacing: '.26em' }}>
          <span style={{ height: 2, background: t.accent, flex: 1, opacity: 0.55 }} />
          <span style={{ whiteSpace: 'nowrap' }}>{ad.kicker || ''}</span>
          <span style={{ height: 2, background: t.accent, flex: 1, opacity: 0.55 }} />
        </div>
        <div style={{ marginTop: 6 }}>
          <div className="ad-bebas" style={{ fontSize: 172, lineHeight: 0.82, color: t.ink, letterSpacing: '.005em' }}>{ad.title || ''}</div>
          <div
            className="ad-bebas"
            style={{
              fontSize: 172, lineHeight: 0.82, color: t.accent, letterSpacing: '.005em',
              textShadow: `3px 3px 0 ${t.ink}`,
            }}
          >
            {ad.title_accent || ''}
          </div>
        </div>
        <p style={{ marginTop: 12, fontSize: 25, fontWeight: 900, lineHeight: 1.15, color: t.ink, maxWidth: '5.2in' }}>
          {hiAt >= 0 ? (
            <>
              {sub.slice(0, hiAt)}
              <span style={{ background: t.gold, padding: '0 6px' }}>{hi}</span>
              {sub.slice(hiAt + hi.length)}
            </>
          ) : sub}
        </p>

        {ad.badge_top || ad.badge_bottom ? (
          <div
            style={{
              position: 'absolute', right: 24, top: 26, width: '1.55in', height: '1.55in', borderRadius: '50%',
              border: `4px solid ${t.accent}`, color: t.accent, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', transform: 'rotate(-11deg)', background: t.paper,
            }}
          >
            <div style={{ position: 'absolute', inset: 7, border: `1.5px solid ${t.accent}`, borderRadius: '50%' }} />
            <div style={{ fontSize: 30, lineHeight: 1 }}>&#10052;</div>
            <div className="ad-bebas" style={{ fontSize: 26, lineHeight: 0.9, letterSpacing: '.04em', marginTop: 2 }}>{ad.badge_top || ''}</div>
            <div style={{ fontSize: 8, fontWeight: 900, letterSpacing: '.2em', marginTop: 3 }}>{ad.badge_bottom || ''}</div>
          </div>
        ) : null}
      </div>

      {/* flavors + price */}
      {(chips.length > 0 || ad.price_line) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 30px 0' }}>
          {chips.map((c, i) => (
            <div
              key={`${c}-${i}`}
              style={{
                border: `2px solid ${t.ink}`, borderRadius: 999, padding: '7px 16px', fontSize: 12,
                fontWeight: 900, letterSpacing: '.16em',
                background: i % 2 === 1 ? t.ink : 'transparent',
                color: i % 2 === 1 ? t.paper : t.ink,
              }}
            >
              {c}
            </div>
          ))}
          {ad.price_line ? (
            <div className="ad-bebas" style={{ marginLeft: 'auto', fontSize: 34, lineHeight: 1, color: t.ink }}>
              {ad.price_line}
              {ad.price_note ? (
                <small style={{ fontFamily: "'Nunito', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: '.12em', opacity: 0.7, marginLeft: 4 }}>
                  {ad.price_note}
                </small>
              ) : null}
            </div>
          ) : null}
        </div>
      )}

      {ad.body ? (
        <p style={{ padding: '8px 30px 0', fontSize: 14, fontWeight: 700, lineHeight: 1.4, color: t.ink }}>{ad.body}</p>
      ) : null}

      {/* three item cards */}
      {items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr 1fr', gap: 10, padding: '16px 30px 0' }}>
          {items.map((m, i) => (
            <div key={`${m.name}-${i}`} style={{ borderRadius: 12, overflow: 'hidden', background: '#ffffff', border: `1.5px solid ${t.ink}28`, display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: '1.15in', overflow: 'hidden' }}>
                {m.photo ? (
                  <img src={m.photo} alt={m.name} width="600" height="600" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : null}
              </div>
              <div style={{ padding: '7px 9px 8px', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 6 }}>
                <div className="ad-bebas" style={{ fontSize: (m.name || '').length > 14 ? 15 : 17, lineHeight: 1, letterSpacing: '.02em' }}>{m.name}</div>
                <div className="ad-bebas" style={{ fontSize: 17, lineHeight: 1, color: t.accent, whiteSpace: 'nowrap' }}>{m.price}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* three one-liners */}
      {lines.length > 0 && (
        <div style={{ margin: '14px 30px 0', background: t.ink, color: t.paper, borderRadius: 12, padding: '11px 18px', display: 'grid', gridTemplateColumns: `repeat(${lines.length}, 1fr)`, gap: 14 }}>
          {lines.map((l, i) => (
            <div key={i} style={{ fontSize: 12.5, fontWeight: 800, lineHeight: 1.25 }}>
              <span style={{ display: 'block', fontSize: 9, fontWeight: 900, letterSpacing: '.2em', color: t.gold, marginBottom: 4 }}>{l.label}</span>
              {l.text}
            </div>
          ))}
        </div>
      )}

      {/* bottom band */}
      {(ad.strip_headline || ad.strip_photo_wide) && (
        <div style={{ position: 'relative', marginTop: 14, height: '1.25in', flex: 'none', display: 'flex', background: t.ink, overflow: 'hidden' }}>
          <div style={{ flex: '0 0 46%', padding: '0 16px 0 30px', alignSelf: 'center', color: t.paper }}>
            <div style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.26em', color: t.gold }}>{ad.strip_kicker || ''}</div>
            <div className="ad-bebas" style={{ fontSize: 29, lineHeight: 0.95, marginTop: 4 }}>{ad.strip_headline || ''}</div>
            <div style={{ fontSize: 9.5, fontWeight: 800, marginTop: 7, opacity: 0.9, lineHeight: 1.4, whiteSpace: 'pre-line' }}>{ad.strip_note || ''}</div>
          </div>
          <div style={{ flex: '1 1 auto', display: 'flex', minWidth: 0 }}>
            <div style={{ flex: '1 1 60%', minWidth: 0 }}>
              {ad.strip_photo_wide ? <img src={ad.strip_photo_wide} alt="" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : null}
            </div>
            <div style={{ flex: '0 0 150px', minWidth: 0 }}>
              {ad.strip_photo_tall ? <img src={ad.strip_photo_tall} alt="" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 40%', display: 'block' }} /> : null}
            </div>
          </div>
        </div>
      )}

      {/* footer */}
      <div style={{ marginTop: 'auto', flex: 'none', background: t.accent, color: t.onAccent, padding: '16px 30px', display: 'flex', alignItems: 'center', gap: 18, overflow: 'hidden' }}>
        {ad.show_qr ? (
          <div style={{ background: '#ffffff', padding: 6, borderRadius: 8, width: '1.12in', height: '1.12in', flex: 'none' }}>
            <img src={qrUrl(ad.qr_target || ad.cta_url)} alt="QR code to order online" width="600" height="600" style={{ width: '100%', height: '100%', display: 'block' }} />
          </div>
        ) : null}
        <div style={{ flex: 1 }}>
          <div className="ad-bebas" style={{ fontSize: 40, lineHeight: 0.92, letterSpacing: '.02em' }}>
            {ad.footer_headline ? (
              <small style={{ fontFamily: "'Nunito', sans-serif", fontSize: 11, fontWeight: 900, letterSpacing: '.2em', display: 'block', marginBottom: 4, color: t.gold }}>
                {ad.footer_headline}
              </small>
            ) : null}
            {ad.cta_headline || ad.cta_url || ''}
          </div>
          <div style={{ fontSize: 15, fontWeight: 900, marginTop: 6, letterSpacing: '.04em' }}>{ad.footer_note || ''}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, letterSpacing: '.16em', color: t.gold, marginBottom: 2, fontWeight: 900 }}>OPEN</div>
          <HoursLines groups={groups} size={10.5} />
        </div>
      </div>
      <div style={{ height: 6, background: t.gold, flex: 'none' }} />
    </div>
  );
}

/* ----------------------------------------------------------------- classic */

function ClassicSheet({ ad, sheetId }) {
  const { deliveryEnabled } = useLiveStatus();
  const businessHours = useBusinessHours();
  const flyerHours = hoursGroups(businessHours);
  const items = (ad.items || []).slice(0, 3);
  const [headline] = (ad.title || '').split('|');
  const accent = ad.title_accent || '';

  return (
    <div
      id={sheetId}
      className="bg-white overflow-hidden flex flex-col"
      style={{ width: '8.5in', minHeight: '11in', height: '11in' }}
    >
      <div className="bg-patina-mint text-white px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={optimizedImageUrl(LOGO, 200, 200, 'fit')} alt="Flavor Isle logo" width="200" height="200" className="w-14 h-14 object-contain rounded-xl bg-white/95 p-1" />
          <div>
            <div className="font-heading text-3xl leading-none tracking-wide">FLAVOR ISLE</div>
            <div className="text-xs tracking-[0.3em] text-white/80 mt-1">BURGERS &middot; SHAKES &middot; SIDES</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-heading text-lg text-smashie-yellow leading-none">EST. 1964</div>
          <div className="text-[10px] tracking-widest text-white/80 mt-1">SMITHS GROVE, KY</div>
        </div>
      </div>

      <div className="bg-patina-mint/5 px-8 pt-8 pb-2 flex justify-center">
        <img
          src={optimizedImageUrl(STOREFRONT, 800, 600, 'fit')}
          alt="The Flavor Isle sign at 1st and Main in Smiths Grove"
          width="800" height="600"
          className="w-full max-w-[5.5in] max-h-[3.2in] object-cover rounded-2xl"
        />
      </div>

      <div className="px-8 pt-4 text-center">
        <h1 className="font-heading text-4xl text-obsidian-roast leading-tight">
          {headline} {accent ? <span className="text-midnight-cherry">{accent}</span> : null}
        </h1>
        {ad.subhead ? <p className="font-body text-base text-muted-foreground mt-2">{ad.subhead}</p> : null}
      </div>

      <div className="px-8 py-6 grid grid-cols-3 gap-4">
        {[
          { icon: Flame, title: 'Fresh Hand-Patted Burgers', sub: 'Hand-patted, never frozen, made to order' },
          { icon: UtensilsCrossed, title: 'Hot Sides', sub: 'Crispy fries, tots & more' },
          { icon: IceCream2, title: 'Thick Shakes', sub: 'Hand spun. Custom flavors' },
        ].map((f) => (
          <div key={f.title} className="text-center">
            <div className="w-12 h-12 rounded-full bg-midnight-cherry/10 flex items-center justify-center mx-auto mb-2">
              <f.icon size={22} className="text-midnight-cherry" />
            </div>
            <div className="font-heading text-lg text-obsidian-roast leading-none">{f.title}</div>
            <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{f.sub}</div>
          </div>
        ))}
      </div>

      <div className="px-8 pb-2">
        <div className="grid grid-cols-3 gap-4">
          {items.map((m, i) => (
            <div key={`${m.name}-${i}`} className="rounded-2xl overflow-hidden border border-patina-mint/15 bg-patina-mint/5">
              <div className="h-28 overflow-hidden">
                {m.photo ? (
                  <img src={m.photo} alt={m.name} width="500" height="500" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                ) : null}
              </div>
              <div className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-heading text-base text-obsidian-roast leading-none">{m.name}</div>
                  <div className="font-heading text-base text-midnight-cherry leading-none">{m.price}</div>
                </div>
                <p className="text-[10px] text-muted-foreground leading-snug">{m.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {ad.plus_line ? (
        <div className="px-8 pb-2 text-center">
          <p className="text-[11px] text-obsidian-roast leading-snug">
            <span className="font-heading tracking-wide">{(ad.plus_line || '').split(':')[0]}:</span>
            {(ad.plus_line || '').includes(':') ? (ad.plus_line || '').slice((ad.plus_line || '').indexOf(':') + 1) : ''}
          </p>
        </div>
      ) : null}

      <div className="mx-8 bg-midnight-cherry text-white rounded-2xl px-6 py-5 flex items-center justify-between">
        <div>
          <div className="font-heading text-2xl leading-none">{ad.cta_headline || 'ORDER ONLINE'}</div>
          <div className="text-sm text-white/90 mt-1">Pickup &middot; {deliveryEnabled ? 'Delivery' : 'Curbside'} &middot; Dine-In</div>
        </div>
        <div className="text-right">
          <div className="font-heading text-xl text-smashie-yellow leading-none">{ad.cta_url || 'flavor-isle.com'}</div>
          <div className="text-sm text-white/90 mt-1">(270) 563-4618</div>
        </div>
      </div>

      <div className="px-8 py-6 grid grid-cols-3 gap-4 text-obsidian-roast">
        <div className="flex items-start gap-2">
          <MapPin size={16} className="text-midnight-cherry flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-snug">
            <div className="font-heading text-sm">FIND US</div>
            103 N Main St<br />Smiths Grove, KY 42171
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Clock size={16} className="text-midnight-cherry flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-snug">
            <div className="font-heading text-sm">HOURS</div>
            {flyerHours.map((g) => (
              <React.Fragment key={g.days}>
                {g.days} {g.label}<br />
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="flex items-start gap-2">
          <Phone size={16} className="text-midnight-cherry flex-shrink-0 mt-0.5" />
          <div className="text-xs leading-snug">
            <div className="font-heading text-sm">CALL AHEAD</div>
            (270) 563-4618
          </div>
        </div>
      </div>

      <div className="mt-auto bg-obsidian-roast text-white px-8 py-4 text-center">
        <div className="font-heading text-lg tracking-wide text-smashie-yellow">{ad.footer_headline || 'SEE YOU AT THE ISLE!'}</div>
        <div className="text-[10px] tracking-widest text-white/70 mt-1 flex items-center justify-center gap-1">
          <Globe size={10} /> {ad.footer_note || 'flavor-isle.com \u00b7 @flavor_isle'}
        </div>
      </div>
    </div>
  );
}

export default function PrintAdSheet({ ad, sheetId = 'ad-sheet' }) {
  if (!ad) return null;
  return (
    <>
      <style>{PRINT_CSS}</style>
      <style>{FONTS}</style>
      {ad.layout === 'classic'
        ? <ClassicSheet ad={ad} sheetId={sheetId} />
        : <PosterSheet ad={ad} sheetId={sheetId} />}
    </>
  );
}