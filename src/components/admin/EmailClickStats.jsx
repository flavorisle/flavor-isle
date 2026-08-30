import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { MousePointerClick } from 'lucide-react';

const LINK_LABELS = {
  merch_promo: 'Tasty Threads merch promo',
  review_request: 'Review request',
  what_to_expect: 'What to expect / live status',
};

export default function EmailClickStats() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const clicks = await base44.entities.EmailClick.list('-created_date', 1000);
        const counts = {};
        (clicks || []).forEach((c) => {
          const id = c.link_id || 'unknown';
          counts[id] = (counts[id] || 0) + 1;
        });
        const aggregated = Object.entries(counts)
          .map(([link_id, count]) => ({ link_id, label: LINK_LABELS[link_id] || link_id, count }))
          .sort((a, b) => b.count - a.count);
        setRows(aggregated);
      } catch (e) {
        console.error('EmailClick fetch failed', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const total = rows.reduce((s, r) => s + r.count, 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-2 mb-1">
        <MousePointerClick size={20} className="text-midnight-cherry" />
        <h2 className="font-heading text-xl text-obsidian-roast">Email Link Clicks</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-6">How often each link in customer emails is clicked.</p>
      <div className="card-diner p-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No clicks tracked yet.</p>
        ) : (
          <div className="space-y-3">
            {rows.map((r) => (
              <div key={r.link_id} className="flex items-center justify-between gap-4">
                <span className="text-sm font-body text-obsidian-roast">{r.label}</span>
                <div className="flex items-center gap-3 flex-1 max-w-xs">
                  <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-midnight-cherry rounded-full"
                      style={{ width: `${total ? Math.round((r.count / total) * 100) : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-heading text-obsidian-roast w-10 text-right">{r.count}</span>
                </div>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 border-t border-border">
              <span className="text-sm font-heading text-obsidian-roast">TOTAL CLICKS</span>
              <span className="text-sm font-heading text-midnight-cherry">{total}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}