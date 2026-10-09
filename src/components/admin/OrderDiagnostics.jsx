import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, RefreshCw, ArrowRight } from 'lucide-react';
import useOrderDiagnostics from '@/hooks/useOrderDiagnostics';

// Order pipeline diagnostics — every stage an online order passes through, with
// the count of orders currently stuck at it. The failed-order alert above shows
// only what needs action; this panel shows the whole pipeline, including the
// watch items that never raise the alert (abandoned checkouts, unaccrued points).
const STATUS = {
  critical: { pill: 'bg-red-100 text-red-700 border-red-200', label: 'Critical' },
  warning: { pill: 'bg-amber-100 text-amber-800 border-amber-200', label: 'Warning' },
  info: { pill: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Watch' },
  ok: { pill: 'bg-green-100 text-green-700 border-green-200', label: 'OK' },
};

const fmtTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('en-US', {
        timeZone: 'America/Chicago',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';

export default function OrderDiagnostics() {
  const { data, error, loading, reload } = useOrderDiagnostics();

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10">
        <div className="card-diner p-6 flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw size={14} className="animate-spin" /> Checking the order pipeline…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10">
        <div className="card-diner p-6">
          <p className="font-heading text-lg text-obsidian-roast">Order pipeline diagnostics</p>
          <p className="text-sm text-muted-foreground mt-1">Couldn't read order health. Reload to try again.</p>
        </div>
      </div>
    );
  }

  const failing = data.checks.filter((c) => c.count > 0);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-10">
      <div className="flex items-center gap-2 mb-1">
        <Activity size={20} className="text-midnight-cherry" />
        <h2 className="font-heading text-xl text-obsidian-roast">Order pipeline diagnostics</h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Checked {fmtTime(data.checkedAt)} · {failing.length ? `${failing.length} stage${failing.length !== 1 ? 's' : ''} reporting issues` : 'every stage clear'}
      </p>

      <div className="card-diner divide-y divide-border">
        {data.checks.map((check) => {
          const status = STATUS[check.severity] || STATUS.ok;
          return (
            <div key={check.key} className="p-4 flex items-start gap-3 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-heading text-sm text-obsidian-roast">{check.label}</p>
                  <span className={`text-[10px] font-heading px-2 py-0.5 rounded-full border uppercase tracking-wide ${status.pill}`}>
                    {status.label}
                  </span>
                  <span className="text-xs text-muted-foreground font-heading">
                    {check.count} order{check.count !== 1 ? 's' : ''}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{check.hint}</p>
                {check.count > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {check.items.slice(0, 4).map((i) => (
                      <span key={i.id} className="text-[11px] font-mono bg-muted text-obsidian-roast px-2 py-0.5 rounded-full">
                        #{i.order_number || '—'}
                      </span>
                    ))}
                    {check.count > 4 && <span className="text-[11px] text-muted-foreground">+{check.count - 4} more</span>}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {check.key === 'failed_square_push' || check.key === 'stuck_sync' ? (
                  <Link to="/admin/square-logs" className="text-xs font-heading text-patina-mint hover:text-midnight-cherry flex items-center gap-1">
                    Sync log <ArrowRight size={12} />
                  </Link>
                ) : null}
                <Link to="/admin/orders" className="text-xs font-heading text-patina-mint hover:text-midnight-cherry flex items-center gap-1">
                  Orders <ArrowRight size={12} />
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      <button onClick={reload} className="btn-mint px-4 py-2 text-xs flex items-center gap-2 mt-4">
        <RefreshCw size={14} /> Run checks again
      </button>
    </div>
  );
}