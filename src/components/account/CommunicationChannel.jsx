import React from 'react';

export default function CommunicationChannel({ title, detail, status, active, pending, busy, onChange, disabled }) {
  return (
    <div className="border-t border-border py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h4 className="font-heading text-lg text-obsidian-roast">{title}</h4>
        <p className="text-sm text-muted-foreground">{detail}</p>
        <p className="text-sm font-semibold text-patina-mint" aria-live="polite">{status}</p>
      </div>
      <button type="button" onClick={onChange} disabled={disabled || busy}
        className="tap-44 rounded-full border border-patina-mint text-patina-mint font-heading px-5 py-2.5 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
        {busy ? 'Updating…' : pending ? 'Cancel request' : active ? 'Unsubscribe' : 'Subscribe'}
      </button>
    </div>
  );
}