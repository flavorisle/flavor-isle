import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertOctagon, AlertTriangle, CheckCircle2, RefreshCw, ArrowRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import useOrderDiagnostics from '@/hooks/useOrderDiagnostics';

// Failed-order alert for the top of the admin dashboard: paid orders that never
// reached Square, failed payments, and paid orders whose customer/staff emails
// never went out — newest first, with one-tap retry for the failures a retry can
// actually fix (confirmOnlinePayment re-verifies the payment, then re-pushes).
const TONES = {
  critical: { border: 'border-red-300', bg: 'bg-red-50', heading: 'text-red-700', icon: 'text-red-600', pill: 'bg-red-600 text-white' },
  warning: { border: 'border-amber-300', bg: 'bg-amber-50', heading: 'text-amber-800', icon: 'text-amber-600', pill: 'bg-amber-500 text-white' },
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

export default function FailedOrderAlert() {
  const { data, loading, reload } = useOrderDiagnostics();
  const [retrying, setRetrying] = useState(null);
  const [notice, setNotice] = useState('');
  const [showAll, setShowAll] = useState(false);

  if (loading || !data) return null;

  const retry = async (orderNumber) => {
    if (!orderNumber) return;
    setRetrying(orderNumber);
    setNotice('');
    try {
      await base44.functions.invoke('confirmOnlinePayment', { orderNumber: String(orderNumber) });
      await reload();
    } catch (err) {
      setNotice(`Retry could not finish for #${orderNumber}. Check the sync log for the reason.`);
    } finally {
      setRetrying(null);
    }
  };

  if (data.alerts.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <div className="flex items-center gap-2 rounded-2xl border border-green-200 bg-green-50 px-4 py-3">
          <CheckCircle2 size={16} className="text-green-600 flex-shrink-0" />
          <p className="text-sm text-green-800">No failed orders — every paid order reached Square and the customer and staff emails went out.</p>
          <button onClick={reload} className="ml-auto text-xs font-heading text-green-800 hover:underline flex-shrink-0">
            Re-check
          </button>
        </div>
      </div>
    );
  }

  // One row per order: an order can trip several checks (failed push, stuck, no
  // staff alert) and repeating it would bury the other failures. Critical reasons
  // rank ahead of warnings, newest first within each.
  const seen = new Set();
  const items = data.alerts
    .flatMap((a) => a.items.map((i) => ({ ...i, severity: a.severity, checkLabel: a.label })))
    .sort((a, b) => {
      if (a.severity !== b.severity) return a.severity === 'critical' ? -1 : 1;
      return new Date(b.at || 0).getTime() - new Date(a.at || 0).getTime();
    })
    .filter((i) => {
      const key = i.order_number || i.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const visible = showAll ? items : items.slice(0, 5);
  const tone = data.criticalCount > 0 ? TONES.critical : TONES.warning;
  const Icon = data.criticalCount > 0 ? AlertOctagon : AlertTriangle;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
      <div className={`rounded-2xl border-2 ${tone.border} ${tone.bg} p-5`}>
        <div className="flex items-start gap-3 flex-wrap">
          <Icon size={20} className={`${tone.icon} flex-shrink-0 mt-0.5`} />
          <div className="min-w-0 flex-1">
            <h2 className={`font-heading text-lg ${tone.heading}`}>
              Failed order alert — {data.openIssues} order{data.openIssues !== 1 ? 's' : ''} need attention
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Newest failure {fmtTime(data.lastFailureAt)} · checked {fmtTime(data.checkedAt)}
            </p>
          </div>
          <button onClick={reload} className="btn-mint px-3 py-1.5 text-xs flex items-center gap-1.5 flex-shrink-0">
            <RefreshCw size={12} /> Re-check
          </button>
          <Link to="/admin/square-logs" className="text-xs font-heading text-patina-mint hover:text-midnight-cherry flex items-center gap-1 flex-shrink-0 py-1.5">
            Full sync log <ArrowRight size={12} />
          </Link>
        </div>

        <div className="mt-4 space-y-2">
          {visible.map((item) => (
            <div key={`${item.checkLabel}-${item.id}`} className="bg-white rounded-xl p-3 flex items-center gap-3 flex-wrap">
              <span className={`text-[10px] font-heading px-2 py-0.5 rounded-full ${tone.pill} flex-shrink-0 uppercase tracking-wide`}>
                {item.severity === 'critical' ? 'Failed' : 'Check'}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm text-obsidian-roast truncate">
                  #{item.order_number || '—'} · {item.customer_name || 'Guest'}
                  {item.total != null && <span className="text-muted-foreground font-body"> · ${Number(item.total).toFixed(2)}</span>}
                </p>
                <p className="text-xs text-red-600 break-words">{item.reason}</p>
                <p className="text-[11px] text-muted-foreground">{item.checkLabel} · {fmtTime(item.at)}</p>
              </div>
              {item.retryable && item.order_number ? (
                <button
                  onClick={() => retry(item.order_number)}
                  disabled={retrying === item.order_number}
                  className="btn-cherry px-3 py-1.5 text-xs flex items-center gap-1.5 flex-shrink-0"
                >
                  <RefreshCw size={12} className={retrying === item.order_number ? 'animate-spin' : ''} />
                  {retrying === item.order_number ? 'Retrying…' : 'Retry push'}
                </button>
              ) : (
                <Link to="/admin/orders" className="text-xs font-heading text-patina-mint hover:text-midnight-cherry flex-shrink-0">
                  View order
                </Link>
              )}
            </div>
          ))}
        </div>

        {items.length > 5 && (
          <button onClick={() => setShowAll(!showAll)} className="mt-3 text-xs font-heading text-patina-mint hover:text-midnight-cherry">
            {showAll ? 'Show fewer' : `Show all ${items.length} items`}
          </button>
        )}

        {notice && <p className="text-xs text-red-700 mt-3">{notice}</p>}
      </div>
    </div>
  );
}