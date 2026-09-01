import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Megaphone } from 'lucide-react';

const ACTION_LABELS = {
  view: 'Pop-up shown',
  shirt_click: 'Shirt clicked',
  shop_all: 'Shop All clicked',
  dismiss: 'Dismissed',
};

// Group events into per-day rows (store local time), newest first.
function buildDaily(events) {
  const byDay = {};
  events.forEach((e) => {
    const day = new Date(e.created_date).toLocaleDateString('en-US', {
      timeZone: 'America/Chicago', year: 'numeric', month: 'short', day: 'numeric',
    });
    const d = (byDay[day] ||= { day, sort: new Date(e.created_date).getTime(), views: 0, clicks: 0, dismisses: 0 });
    d.sort = Math.max(d.sort, new Date(e.created_date).getTime());
    if (e.action === 'view') d.views += 1;
    else if (e.action === 'shirt_click' || e.action === 'shop_all') d.clicks += 1;
    else if (e.action === 'dismiss') d.dismisses += 1;
  });
  return Object.values(byDay).sort((a, b) => b.sort - a.sort).slice(0, 14);
}

export default function PopupClickStats() {
  const [rows, setRows] = useState([]);
  const [daily, setDaily] = useState([]);
  const [ctr, setCtr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const events = await base44.entities.PopupClick.list('-created_date', 1000);
        setDaily(buildDaily(events || []));
        const counts = {};
        (events || []).forEach((e) => {
          counts[e.action] = (counts[e.action] || 0) + 1;
        });
        const views = counts.view || 0;
        const clicks = (counts.shirt_click || 0) + (counts.shop_all || 0);
        setCtr(views > 0 ? Math.round((clicks / views) * 100) : null);
        setRows(
          ['view', 'shirt_click', 'shop_all', 'dismiss']
            .filter((a) => counts[a])
            .map((a) => ({ action: a, label: ACTION_LABELS[a], count: counts[a] }))
        );
      } catch (e) {
        console.error('PopupClick fetch failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const max = rows.reduce((m, r) => Math.max(m, r.count), 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-1">
        <Megaphone size={20} className="text-midnight-cherry" />
        <h2 className="font-heading text-xl text-obsidian-roast">Promo Pop-Up Clicks</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">How visitors interact with the Tasty Threads pop-up.</p>
      <div className="card-diner p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pop-up activity tracked yet.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.action} className="flex items-center justify-between gap-4">
                <span className="text-sm font-body text-obsidian-roast">{r.label}</span>
                <div className="flex items-center gap-3 flex-1 max-w-xs">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-midnight-cherry rounded-full"
                      style={{ width: `${max ? Math.round((r.count / max) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-heading text-obsidian-roast w-10 text-right">{r.count}</span>
                </div>
              </div>
            ))}
            {ctr !== null && (
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-sm font-heading text-obsidian-roast">CLICK-THROUGH RATE</span>
                <span className="text-sm font-heading text-midnight-cherry">{ctr}%</span>
              </div>
            )}

            {/* Per-day breakdown — last 14 days with activity */}
            {daily.length > 0 && (
              <div className="pt-4 border-t border-border">
                <p className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">By Day</p>
                <div className="grid grid-cols-4 gap-2 text-xs font-heading uppercase tracking-wider text-muted-foreground pb-1">
                  <span>Date</span>
                  <span className="text-right">Shown</span>
                  <span className="text-right">Clicks</span>
                  <span className="text-right">Dismissed</span>
                </div>
                {daily.map((d) => (
                  <div key={d.day} className="grid grid-cols-4 gap-2 text-sm py-1 border-t border-border/50">
                    <span className="font-body text-obsidian-roast">{d.day}</span>
                    <span className="text-right font-heading text-obsidian-roast">{d.views}</span>
                    <span className="text-right font-heading text-midnight-cherry">{d.clicks}</span>
                    <span className="text-right font-heading text-obsidian-roast">{d.dismisses}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}