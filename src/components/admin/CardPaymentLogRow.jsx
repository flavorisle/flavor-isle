import React from 'react';
import { AlertTriangle, ShieldAlert, XCircle } from 'lucide-react';

const OUTCOMES = {
  declined: { label: 'Declined', badge: 'bg-red-100 text-red-700', Icon: XCircle },
  unsettled: { label: 'Approved, not matched', badge: 'bg-yellow-100 text-yellow-700', Icon: AlertTriangle },
  error: { label: 'Error', badge: 'bg-orange-100 text-orange-700', Icon: ShieldAlert },
};

// One card attempt that did not go through. The card system's own message is given
// the most room on the row, because it is the whole reason this view exists.
export default function CardPaymentLogRow({ log }) {
  const style = OUTCOMES[log.outcome] || OUTCOMES.error;
  const Icon = style.Icon;
  const when = new Date(log.occurred_at || log.created_date);

  return (
    <div className="card-diner p-4">
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${style.badge}`}>
          <Icon size={16} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {log.order_number && <span className="font-heading text-sm text-obsidian-roast">#{log.order_number}</span>}
            <span className={`text-xs px-2 py-0.5 rounded-full font-heading ${style.badge}`}>{style.label}</span>
            {log.customer_name && <span className="text-xs text-muted-foreground">{log.customer_name}</span>}
            {log.amount > 0 && <span className="text-xs text-muted-foreground">${Number(log.amount).toFixed(2)}</span>}
          </div>

          {(log.response_message || log.detail) && (
            <div className="mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
              <p className="text-xs font-heading text-red-800 uppercase tracking-wider mb-1">
                {log.response_message ? 'What the card system reported' : 'What went wrong'}
              </p>
              {log.response_message && <p className="text-sm text-red-700 break-words">{log.response_message}</p>}
              {log.detail && <p className="text-xs text-red-700/80 mt-1 break-words">{log.detail}</p>}
            </div>
          )}

          {log.notice_message && (
            <p className="text-xs text-muted-foreground mt-2 break-words">Note: {log.notice_message}</p>
          )}

          <div className="flex items-center gap-x-3 gap-y-1 flex-wrap mt-2 text-xs text-muted-foreground">
            {log.response_code && <span>Code: {log.response_code}</span>}
            {log.card_type && <span>{log.card_type}</span>}
            {log.avs_response && <span>Address check: {log.avs_response}</span>}
            {log.cvv_response && <span>Security code: {log.cvv_response}</span>}
            {log.transaction_id && <span className="font-mono break-all">Txn {log.transaction_id}</span>}
          </div>

          <p className="text-xs text-muted-foreground/70 mt-1">
            {when.toLocaleString('en-US', {
              timeZone: 'America/Chicago',
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
            {log.source_path ? ` · ${log.source_path}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}