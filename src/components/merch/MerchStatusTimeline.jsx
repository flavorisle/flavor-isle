import React from 'react';
import { CheckCircle2, Printer, Package, Truck, Send, XCircle } from 'lucide-react';

export const MERCH_STAGES = [
  { key: 'paid', label: 'Order confirmed', Icon: CheckCircle2 },
  { key: 'placed', label: 'Sent to the print shop', Icon: Send },
  { key: 'in_production', label: 'In production', Icon: Printer },
  { key: 'fulfilled', label: 'Printed & packing', Icon: Package },
  { key: 'shipped', label: 'Shipped', Icon: Truck },
];

const TERMINAL = { canceled: 'Order canceled', failed: 'Fulfillment failed' };

export const formatChicago = (iso) =>
  iso ? new Date(iso).toLocaleString('en-US', {
    timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }) : null;

// Vertical stepper shared by the admin merch list and the customer order-status
// page. Completed stages are filled in brand cherry, pending stages muted.
export default function MerchStatusTimeline({ order }) {
  const history = order.status_history || [];
  const stampFor = (key) => {
    const hit = history.find(h => h.status === key);
    if (hit) return hit.timestamp;
    return key === 'paid' ? order.created_date : null;
  };
  const current = order.fulfillment_status || 'pending';
  const terminal = TERMINAL[current];
  const currentIdx = MERCH_STAGES.findIndex(s => s.key === current);
  const activeIdx = terminal ? MERCH_STAGES.findIndex(s => s.key === history.filter(h => !TERMINAL[h.status]).at(-1)?.status) : currentIdx;

  return (
    <ol className="relative ml-1">
      {MERCH_STAGES.map((s, i) => {
        const done = i <= activeIdx;
        const isCurrent = i === activeIdx && !terminal;
        const stamp = formatChicago(stampFor(s.key));
        return (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0">
            {i < MERCH_STAGES.length - 1 && (
              <span className={`absolute left-[11px] top-6 bottom-0 w-0.5 ${i < activeIdx ? 'bg-midnight-cherry' : 'bg-border'}`} />
            )}
            <span className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
              done ? 'bg-midnight-cherry text-white' : 'bg-muted text-muted-foreground'
            } ${isCurrent ? 'ring-4 ring-midnight-cherry/20' : ''}`}>
              <s.Icon size={12} />
            </span>
            <div className="min-w-0 -mt-0.5">
              <p className={`text-sm font-heading tracking-wide ${done ? 'text-obsidian-roast' : 'text-muted-foreground'}`}>{s.label}</p>
              <p className="text-xs text-muted-foreground">{stamp || (done ? '—' : 'Pending')}</p>
            </div>
          </li>
        );
      })}
      {terminal && (
        <li className="relative flex gap-3 pt-1">
          <span className="w-6 h-6 rounded-full bg-destructive text-white flex items-center justify-center flex-shrink-0"><XCircle size={12} /></span>
          <div className="-mt-0.5">
            <p className="text-sm font-heading tracking-wide text-destructive">{terminal}</p>
            <p className="text-xs text-muted-foreground">{formatChicago(stampFor(current)) || '—'}</p>
          </div>
        </li>
      )}
    </ol>
  );
}