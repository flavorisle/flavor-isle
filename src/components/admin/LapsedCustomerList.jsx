import React from 'react';
import { Download } from 'lucide-react';

// Issue #325 Part 2: the customers behind one lapse segment, with last purchase,
// channel and lifetime total — and a CSV of exactly those rows.
function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export default function LapsedCustomerList({ label, customers }) {
  const rows = customers || [];

  const exportCsv = () => {
    const header = ['Name', 'Email', 'Phone', 'Last Purchase', 'Days Since', 'Channel', 'Lifetime Total', 'Orders'];
    const body = rows.map((c) => [
      c.name,
      c.email,
      c.phone,
      c.last_purchase,
      c.days_since,
      c.channel,
      Number(c.lifetime_total || 0).toFixed(2),
      c.orders,
    ]);
    const csv = [header, ...body].map((line) => line.map(csvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `flavor-isle-lapsed-${label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        No customers in this group right now.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="font-heading text-base text-obsidian-roast">
          {label} · {rows.length} customer{rows.length === 1 ? '' : 's'}
        </h3>
        <button
          onClick={exportCsv}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-sm font-heading text-patina-mint hover:bg-muted transition-colors"
        >
          <Download size={14} /> Export CSV
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground border-b border-border">
              <th className="py-2 pr-3 font-semibold">Customer</th>
              <th className="py-2 pr-3 font-semibold">Last Purchase</th>
              <th className="py-2 pr-3 font-semibold">Channel</th>
              <th className="py-2 pr-3 font-semibold text-right">Lifetime</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-border/60 last:border-0">
                <td className="py-2 pr-3">
                  <p className="text-obsidian-roast font-semibold">{c.name || '—'}</p>
                  <p className="text-xs text-muted-foreground">{c.email || c.phone || '—'}</p>
                </td>
                <td className="py-2 pr-3 text-obsidian-roast whitespace-nowrap">
                  {c.last_purchase}
                  <span className="text-xs text-muted-foreground"> · {c.days_since}d</span>
                </td>
                <td className="py-2 pr-3 text-muted-foreground whitespace-nowrap">{c.channel}</td>
                <td className="py-2 pr-3 text-right text-midnight-cherry font-semibold whitespace-nowrap">
                  ${Number(c.lifetime_total || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}