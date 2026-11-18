import React, { useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import AdminNav from '@/components/admin/AdminNav';
import PrintAdSheet from '@/components/ads/PrintAdSheet';
import AdEditor from '@/components/ads/AdEditor';
import { blankPoster, SEED_ADS } from '@/lib/printAds';
import useAdOutput from '@/hooks/useAdOutput';
import { Printer, FileDown, Plus, Copy, Trash2, Save, Loader2, Megaphone } from 'lucide-react';

const btn = 'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-heading tracking-wide transition-colors';
const btnMain = `${btn} bg-midnight-cherry text-white hover:bg-midnight-cherry/90`;
const btnGhost = `${btn} border border-obsidian-roast/20 text-obsidian-roast hover:bg-obsidian-roast/5`;

export default function AdminAds() {
  const [ads, setAds] = useState([]);
  const [draft, setDraft] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState('');
  const seeded = useRef(false);
  const { outputBusy, pdfDownload, printAd, downloadPdf } = useAdOutput(draft, setNote);

  const load = async () => {
    const rows = await base44.entities.PrintAd.list('sort_order', 100);
    if (rows.length === 0 && !seeded.current) {
      seeded.current = true;
      const made = await Promise.all(SEED_ADS.map((a) => base44.entities.PrintAd.create(a)));
      setAds(made);
      setDraft(made[0]);
      return made;
    }
    setAds(rows);
    if (!draft && rows.length) setDraft(rows[0]);
    return rows;
  };

  useEffect(() => {
    (async () => {
      try {
        await load();
        const items = await base44.entities.MenuItem.list('name', 500);
        setMenuItems(items.filter((m) => !m.is_hidden));
      } catch (e) {
        setNote('Could not load the ads. Refresh and try again.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flash = (msg) => {
    setNote(msg);
    window.setTimeout(() => setNote(''), 4000);
  };

  const save = async () => {
    if (!draft) return;
    setBusy('save');
    try {
      const payload = { ...draft };
      delete payload.id;
      delete payload.created_date;
      delete payload.updated_date;
      delete payload.created_by;
      if (draft.id) {
        await base44.entities.PrintAd.update(draft.id, payload);
        flash('Saved.');
      } else {
        const created = await base44.entities.PrintAd.create(payload);
        setDraft(created);
        flash('Ad created.');
      }
      await load();
    } catch (e) {
      flash('Save failed. ' + (e?.message || ''));
    } finally {
      setBusy('');
    }
  };

  const newAd = () => setDraft(blankPoster());

  const duplicate = () => {
    if (!draft) return;
    const copy = { ...draft, name: `${draft.name || 'Ad'} (copy)`, sort_order: (draft.sort_order || 0) + 1 };
    delete copy.id;
    setDraft(copy);
    flash('Copy ready. Save it to keep it.');
  };

  const remove = async () => {
    if (!draft?.id) return;
    if (!window.confirm(`Delete ${draft.name}? This cannot be undone.`)) return;
    setBusy('delete');
    try {
      await base44.entities.PrintAd.delete(draft.id);
      const rows = await base44.entities.PrintAd.list('sort_order', 100);
      setAds(rows);
      setDraft(rows[0] || null);
      flash('Deleted.');
    } catch (e) {
      flash('Delete failed. ' + (e?.message || ''));
    } finally {
      setBusy('');
    }
  };

  const activeAds = useMemo(() => ads.filter((a) => a.is_active !== false), [ads]);

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <div className="ad-no-print">
        <Navbar />
        <CartDrawer />
        <AdminNav />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h1 className="font-heading text-3xl text-obsidian-roast flex items-center gap-2">
                <Megaphone size={24} className="text-midnight-cherry" /> Ads
              </h1>
              <p className="font-body text-sm text-obsidian-roast/60 mt-1">
                Printable letter-size ads. Pick one, change anything, print it or download the PDF.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={btnGhost} onClick={newAd}><Plus size={14} /> New ad</button>
              <button className={btnGhost} onClick={duplicate} disabled={!draft}><Copy size={14} /> Duplicate</button>
              <button className={btnGhost} onClick={remove} disabled={!draft?.id}>
                {busy === 'delete' ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Delete
              </button>
              <button className={btnMain} onClick={save} disabled={!draft || busy === 'save'}>
                {busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
              </button>
            </div>
          </div>

          {note ? (
            <div role="status" aria-live="polite" className="mb-4 rounded-xl border border-midnight-cherry/20 bg-white px-4 py-2 text-sm text-obsidian-roast">{note}</div>
          ) : null}

          {loading ? (
            <div className="flex items-center gap-2 text-obsidian-roast/60"><Loader2 className="animate-spin" size={16} /> Loading ads…</div>
          ) : (
            <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-6 items-start">
              <div className="rounded-2xl border border-obsidian-roast/10 bg-white p-2">
                {ads.length === 0 ? (
                  <p className="p-3 text-sm text-obsidian-roast/60">No ads yet. Hit New ad.</p>
                ) : (
                  ads.map((a) => {
                    const active = draft?.id === a.id || draft?.name === a.name;
                    return (
                      <button
                        key={a.id}
                        onClick={() => setDraft(a)}
                        className={`w-full text-left rounded-xl px-3 py-2 mb-1 transition-colors ${active ? 'bg-midnight-cherry/10' : 'hover:bg-obsidian-roast/5'}`}
                      >
                        <div className="font-heading text-base text-obsidian-roast leading-tight">{a.name}</div>
                        <div className="text-[11px] text-obsidian-roast/50">
                          {a.layout === 'classic' ? 'Classic flyer' : 'Poster'} · {a.is_active === false ? 'Hidden' : 'Active'}
                        </div>
                      </button>
                    );
                  })
                )}
                <div className="mt-2 border-t border-obsidian-roast/10 pt-2 px-3 text-[11px] text-obsidian-roast/50">
                  {activeAds.length} active of {ads.length}
                </div>
              </div>

              <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
                <div className="rounded-2xl border border-obsidian-roast/10 bg-white p-4">
                  {draft ? (
                    <>
                      <AdEditor draft={draft} setDraft={setDraft} menuItems={menuItems} />
                      <div className="mt-5 flex flex-wrap gap-2 border-t border-obsidian-roast/10 pt-4">
                        <button className={btnMain} onClick={save} disabled={busy === 'save'}>
                          {busy === 'save' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                        </button>
                        <button className={btnGhost} onClick={printAd} disabled={!!outputBusy}>
                          {outputBusy === 'print' ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                          {outputBusy === 'print' ? 'Preparing…' : 'Print'}
                        </button>
                        <button className={btnGhost} onClick={downloadPdf} disabled={!!outputBusy}>
                          {outputBusy === 'pdf' ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
                          {outputBusy === 'pdf' ? 'Preparing PDF…' : 'Download PDF'}
                        </button>
                        {pdfDownload ? (
                          <a className={btnMain} href={pdfDownload.url} download={pdfDownload.fileName} target="_blank" rel="noopener noreferrer">
                            <FileDown size={14} /> Save PDF
                          </a>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-obsidian-roast/60">Pick an ad on the left, or make a new one.</p>
                  )}
                </div>

                <div className="rounded-2xl border border-obsidian-roast/10 bg-obsidian-roast/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-obsidian-roast/50">Live preview</span>
                    <span className="text-[11px] text-obsidian-roast/40">8.5 &times; 11</span>
                  </div>
                  <div className="overflow-hidden rounded-xl bg-white shadow-sm">
                    <div
                      style={{
                        width: 816, height: 1056, transform: 'scale(0.44)', transformOrigin: 'top left',
                        marginRight: -816 * 0.56, marginBottom: -1056 * 0.56,
                      }}
                    >
                      <PrintAdSheet ad={draft} sheetId="ad-sheet-preview" />
                    </div>
                  </div>
                  <p className="mt-2 text-[11px] text-obsidian-roast/50">
                    Print opens the ad alone in a new tab. Download PDF makes a single letter-size page. On an iPhone, tap Share, then Save to Files.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden full-size sheet used for printing and for the PDF */}
      {draft ? (
        <div id="ad-wrap" className="ad-print-only" style={{ position: 'fixed', left: '-10000px', top: 0 }}>
          <PrintAdSheet ad={draft} />
        </div>
      ) : null}
    </div>
  );
}