import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Megaphone } from 'lucide-react';

const ACTION_LABELS = {
  view: 'Pop-up shown',
  shirt_click: 'Shirt clicked',
  shop_all: 'Shop All clicked',
  dismiss: 'Dismissed',
};

export default function PopupClickStats() {
  const [rows, setRows] = useState([]);
  const [ctr, setCtr] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const events = await base44.entities.PopupClick.list('-created_date', 1000);
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
          </div>
        )}
      </div>
    </div>
  );
}