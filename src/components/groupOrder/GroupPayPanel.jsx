import React from 'react';
import { Lock, Clock, CreditCard } from 'lucide-react';

// Everyone's running subtotal and the one payment for the whole ticket (issue
// #356). One person pays for the group; nothing here names how the card is taken
// — the button says "pay now" and the page says "secure payment page".
export default function GroupPayPanel({
  participants = [],
  total = 0,
  payerName,
  onPayerName,
  onPay,
  busy,
  error,
  canPay,
  lockedReason,
}) {
  return (
    <div className="card-diner p-5">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="font-heading text-lg text-obsidian-roast">Everyone's total</h3>
        <span className="ml-auto font-heading text-xl text-midnight-cherry">${Number(total || 0).toFixed(2)}</span>
      </div>

      {participants.length === 0 ? (
        <p className="text-sm text-muted-foreground mb-4">No items yet.</p>
      ) : (
        <ul className="space-y-1.5 mb-4 text-sm">
          {participants.map((p) => (
            <li key={p.name} className="flex justify-between gap-3">
              <span className="text-obsidian-roast">
                {p.name} <span className="text-xs text-muted-foreground">({p.items} item{p.items === 1 ? '' : 's'})</span>
              </span>
              <span className="text-muted-foreground">${Number(p.subtotal).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="border-t border-border pt-4">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Who's paying?
        </label>
        <input
          type="text"
          value={payerName}
          onChange={(e) => onPayerName(e.target.value)}
          placeholder="Your first name"
          className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
        />
        <button
          type="button"
          onClick={onPay}
          disabled={busy || !canPay}
          className="btn-cherry chrome-hover w-full mt-3 py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <CreditCard size={16} /> Pay now · ${Number(total || 0).toFixed(2)}
            </>
          )}
        </button>
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        {lockedReason && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            {lockedReason.includes('closed') ? <Lock size={13} /> : <Clock size={13} />} {lockedReason}
          </p>
        )}
        <p className="text-xs text-muted-foreground mt-2">
          One person pays for the whole group on our secure payment page. The kitchen gets the ticket once it is paid in full.
        </p>
      </div>
    </div>
  );
}