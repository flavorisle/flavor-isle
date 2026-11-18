import React from 'react';
import { GALLERY_PHOTOS } from '@/lib/galleryPhotos';
import { THEMES } from '@/lib/printAds';

const label = 'block text-[11px] font-bold uppercase tracking-[0.14em] text-obsidian-roast/60 mb-1';
const input = 'w-full rounded-xl border border-obsidian-roast/15 bg-white px-3 py-2 text-sm text-obsidian-roast focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30';

function Field({ title, hint, children }) {
  return (
    <label className="block">
      <span className={label}>{title}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-obsidian-roast/50">{hint}</span> : null}
    </label>
  );
}

function PhotoPicker({ value, onChange, menuItems }) {
  const galleryOpts = GALLERY_PHOTOS.map((p) => ({ key: `g:${p.url}`, label: `Gallery: ${p.caption}`, url: p.url }));
  const menuOpts = menuItems
    .filter((m) => m.image_url)
    .map((m) => ({ key: `m:${m.image_url}`, label: `Menu: ${m.name}`, url: m.image_url }));
  const all = [...menuOpts, ...galleryOpts];
  const known = all.some((o) => o.url === value);
  return (
    <div className="space-y-1">
      <select
        className={input}
        value={known ? value : ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">{value ? 'Custom photo below' : 'Pick a photo'}</option>
        {all.map((o) => (
          <option key={o.key} value={o.url}>{o.label}</option>
        ))}
      </select>
      <input className={input} value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder="Photo URL" />
    </div>
  );
}

export default function AdEditor({ draft, setDraft, menuItems }) {
  const set = (patch) => setDraft({ ...draft, ...patch });
  const setItem = (i, patch) => {
    const items = [...(draft.items || [])];
    items[i] = { ...(items[i] || {}), ...patch };
    set({ items });
  };
  const setLine = (i, patch) => {
    const one_liners = [...(draft.one_liners || [])];
    one_liners[i] = { ...(one_liners[i] || {}), ...patch };
    set({ one_liners });
  };
  const poster = draft.layout === 'poster';

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Field title="Ad name">
          <input className={input} value={draft.name || ''} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field title="Layout">
          <select className={input} value={draft.layout || 'poster'} onChange={(e) => set({ layout: e.target.value })}>
            <option value="poster">Poster</option>
            <option value="classic">Classic flyer</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field title="Color way">
          <select className={input} value={draft.theme || 'cherry'} onChange={(e) => set({ theme: e.target.value })}>
            {Object.entries(THEMES).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </Field>
        <Field title="On the list">
          <label className="flex items-center gap-2 pt-2 text-sm text-obsidian-roast">
            <input type="checkbox" checked={draft.is_active !== false} onChange={(e) => set({ is_active: e.target.checked })} />
            Active
          </label>
        </Field>
      </div>

      <Field title="Kicker" hint="The small line above the headline.">
        <input className={input} value={draft.kicker || ''} onChange={(e) => set({ kicker: e.target.value })} />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field title="Headline, line 1">
          <input className={input} value={draft.title || ''} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field title="Headline, line 2">
          <input className={input} value={draft.title_accent || ''} onChange={(e) => set({ title_accent: e.target.value })} />
        </Field>
      </div>

      <Field title="Subhead">
        <input className={input} value={draft.subhead || ''} onChange={(e) => set({ subhead: e.target.value })} />
      </Field>

      {poster ? (
        <>
          <Field title="Highlight inside the subhead" hint="This exact phrase prints on a gold block. Leave blank for none.">
            <input className={input} value={draft.subhead_highlight || ''} onChange={(e) => set({ subhead_highlight: e.target.value })} />
          </Field>
          <Field title="Paragraph">
            <textarea className={input} rows={3} value={draft.body || ''} onChange={(e) => set({ body: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field title="Flavor pills" hint="Comma separated.">
              <input
                className={input}
                value={(draft.chips || []).join(', ')}
                onChange={(e) => set({ chips: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              />
            </Field>
            <Field title="Price">
              <input className={input} value={draft.price_line || ''} onChange={(e) => set({ price_line: e.target.value })} />
            </Field>
          </div>
          <Field title="Price note">
            <input className={input} value={draft.price_note || ''} onChange={(e) => set({ price_note: e.target.value })} />
          </Field>
        </>
      ) : null}

      <div className="space-y-3">
        <span className={label}>Photo cards</span>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-xl border border-obsidian-roast/10 p-3 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input className={input} placeholder="Item name" value={(draft.items?.[i]?.name) || ''} onChange={(e) => setItem(i, { name: e.target.value })} />
              <input className={input} placeholder="Price" value={(draft.items?.[i]?.price) || ''} onChange={(e) => setItem(i, { price: e.target.value })} />
            </div>
            <PhotoPicker value={draft.items?.[i]?.photo} onChange={(v) => setItem(i, { photo: v })} menuItems={menuItems} />
            {!poster ? (
              <textarea className={input} rows={2} placeholder="Description" value={(draft.items?.[i]?.note) || ''} onChange={(e) => setItem(i, { note: e.target.value })} />
            ) : null}
          </div>
        ))}
      </div>

      {poster ? (
        <>
          <div className="space-y-3">
            <span className={label}>One-liners</span>
            {[0, 1, 2].map((i) => (
              <div key={i} className="grid grid-cols-[110px_1fr] gap-2">
                <input className={input} placeholder="Label" value={(draft.one_liners?.[i]?.label) || ''} onChange={(e) => setLine(i, { label: e.target.value })} />
                <input className={input} placeholder="Line" value={(draft.one_liners?.[i]?.text) || ''} onChange={(e) => setLine(i, { text: e.target.value })} />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field title="Stamp, top line">
              <input className={input} value={draft.badge_top || ''} onChange={(e) => set({ badge_top: e.target.value })} />
            </Field>
            <Field title="Stamp, bottom line">
              <input className={input} value={draft.badge_bottom || ''} onChange={(e) => set({ badge_bottom: e.target.value })} />
            </Field>
          </div>

          <Field title="Bottom band kicker">
            <input className={input} value={draft.strip_kicker || ''} onChange={(e) => set({ strip_kicker: e.target.value })} />
          </Field>
          <Field title="Bottom band headline">
            <input className={input} value={draft.strip_headline || ''} onChange={(e) => set({ strip_headline: e.target.value })} />
          </Field>
          <Field title="Bottom band address" hint="One line per row.">
            <textarea className={input} rows={2} value={draft.strip_note || ''} onChange={(e) => set({ strip_note: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field title="Bottom photo, wide">
              <PhotoPicker value={draft.strip_photo_wide} onChange={(v) => set({ strip_photo_wide: v })} menuItems={menuItems} />
            </Field>
            <Field title="Bottom photo, tall">
              <PhotoPicker value={draft.strip_photo_tall} onChange={(v) => set({ strip_photo_tall: v })} menuItems={menuItems} />
            </Field>
          </div>
        </>
      ) : (
        <Field title="Plus line" hint="Prints as PLUS: followed by this text.">
          <textarea className={input} rows={3} value={draft.plus_line || ''} onChange={(e) => set({ plus_line: e.target.value })} />
        </Field>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field title="Order line">
          <input className={input} value={draft.cta_headline || ''} onChange={(e) => set({ cta_headline: e.target.value })} />
        </Field>
        <Field title="Website">
          <input className={input} value={draft.cta_url || ''} onChange={(e) => set({ cta_url: e.target.value })} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field title="Footer band line">
          <input className={input} value={draft.footer_headline || ''} onChange={(e) => set({ footer_headline: e.target.value })} />
        </Field>
        <Field title="Footer note">
          <input className={input} value={draft.footer_note || ''} onChange={(e) => set({ footer_note: e.target.value })} />
        </Field>
      </div>

      {poster ? (
        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <Field title="QR code opens">
            <input className={input} value={draft.qr_target || ''} onChange={(e) => set({ qr_target: e.target.value })} placeholder="https://flavor-isle.com/milkshakes" />
          </Field>
          <label className="flex items-center gap-2 pb-2 text-sm text-obsidian-roast">
            <input type="checkbox" checked={draft.show_qr !== false} onChange={(e) => set({ show_qr: e.target.checked })} />
            Show QR
          </label>
        </div>
      ) : null}
    </div>
  );
}