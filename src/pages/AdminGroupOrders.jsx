import React, { useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import AdminNav from '@/components/admin/AdminNav';
import Seo from '@/components/Seo';

// Admin view of group orders (issue #356): every open and closed group, who
// started it, when it closes, what each person added and their subtotal, and
// whether the one ticket has been paid online. No payment provider is named.
function closeLabel(iso) {
  if (!iso) return '—';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '—';
  return at.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

const STATUS_STYLE = {
  open: 'bg-green-100 text-green-800',
  closed: 'bg-yellow-100 text-yellow-900',
  paid: 'bg-blue-100 text-blue-900',
  cancelled: 'bg-gray-200 text-gray-700',
};

export default function AdminGroupOrders() {
  const [groups, setGroups] = useState([]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [g, l] = await Promise.all([
          base44.entities.GroupOrder.list('-created_date', 100),
          base44.entities.GroupOrderLine.list('-created_date', 500),
        ]);
        if (!active) return;
        setGroups(g || []);
        setLines(l || []);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const byGroup = useMemo(() => {
    const map = new Map();
    for (const line of lines) {
      if (!map.has(line.group_order_id)) map.set(line.group_order_id, []);
      map.get(line.group_order_id).push(line);
    }
    return map;
  }, [lines]);

  const open = groups.filter((g) => g.status === 'open');
  const closed = groups.filter((g) => g.status !== 'open');

  const renderGroup = (group) => {
    const groupLines = byGroup.get(group.id) || [];
    const byPerson = new Map();
    for (const line of groupLines) {
      const name = line.participant_name || 'Guest';
      if (!byPerson.has(name)) byPerson.set(name, []);
      byPerson.get(name).push(line);
    }
    const total = groupLines.reduce((sum, l) => sum + (Number(l.line_total) || 0), 0);

    return (
      <div key={group.id} className="card-diner p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-heading text-lg text-obsidian-roast">{group.title}</h3>
            <p className="text-xs text-muted-foreground">
              Host {group.host_name} · closes {closeLabel(group.closes_at)} · code {group.code}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-heading uppercase tracking-wider rounded-full px-2.5 py-1 ${STATUS_STYLE[group.status] || STATUS_STYLE.cancelled}`}>
              {group.status}
            </span>
            <span className="font-heading text-lg text-midnight-cherry">${total.toFixed(2)}</span>
          </div>
        </div>

        <p className="text-sm mt-2">
          {group.status === 'paid'
            ? `Paid online${group.paid_by_name ? ` by ${group.paid_by_name}` : ''} · ${closeLabel(group.paid_at)}`
            : 'Not paid'}
        </p>

        <div className="mt-3 space-y-3">
          {byPerson.size === 0 && <p className="text-sm text-muted-foreground">Nobody has added anything yet.</p>}
          {Array.from(byPerson.entries()).map(([name, personLines]) => {
            const subtotal = personLines.reduce((sum, l) => sum + (Number(l.line_total) || 0), 0);
            return (
              <div key={name} className="rounded-xl bg-muted/60 p-3">
                <div className="flex justify-between text-sm font-semibold text-obsidian-roast">
                  <span>{name}</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
                <ul className="mt-1 space-y-1 text-sm">
                  {personLines.map((line) => (
                    <li key={line.id}>
                      <span className="text-obsidian-roast">{line.item_name} × {line.quantity}</span>
                      {(line.selected_mods || []).length > 0 && (
                        <span className="block text-xs text-muted-foreground">
                          {(line.selected_mods || []).map((m) => m.name).join(', ')}
                        </span>
                      )}
                      {line.allergy_note && (
                        <span className="block text-xs text-destructive">Allergy: {line.allergy_note}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo title="Group Orders | Flavor Isle Admin" description="Group orders in progress and closed." />
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        <div>
          <h1 className="font-heading text-3xl text-obsidian-roast">Group Orders</h1>
          <p className="text-sm text-muted-foreground">
            Everyone's items collect on one pickup ticket. The kitchen ticket prints only after the whole ticket is paid.
          </p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">
            <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin mx-auto" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
            <p className="font-heading mt-3">Loading groups…</p>
          </div>
        ) : (
          <>
            <section>
              <h2 className="font-heading text-xl text-obsidian-roast mb-3">Open groups</h2>
              <div className="space-y-4">
                {open.length === 0 ? <p className="text-sm text-muted-foreground">No open groups right now.</p> : open.map(renderGroup)}
              </div>
            </section>

            <section>
              <h2 className="font-heading text-xl text-obsidian-roast mb-3">Closed and paid groups</h2>
              <div className="space-y-4">
                {closed.length === 0 ? <p className="text-sm text-muted-foreground">Nothing here yet.</p> : closed.map(renderGroup)}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}