import React, { useState } from 'react';
import { Copy, Check, Lock, ArrowRight } from 'lucide-react';

// One secure payment link per person when a split order is paid through the
// website's alternate secure payment page (issue #95). Each link pays exactly
// that person's share and comes straight back to our own confirmation screen;
// the order reaches the kitchen only once every share has been paid in full,
// which is the same rule the in-app split form enforces.
export default function SquareShareLinks({ shares, orderNumber, total }) {
  const [copied, setCopied] = useState(null);

  const copyLink = async (url, person) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(person);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="card-diner p-4">
      <h2 className="font-heading text-base text-obsidian-roast mb-1">Pay your share</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Each person pays their own share on a secure page — the order goes to the kitchen as soon as every share is paid.
      </p>

      <div className="space-y-3">
        {shares.map((share) => (
          <div key={share.person_name} className="rounded-2xl border-2 border-border bg-muted p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <span className="font-heading text-sm text-obsidian-roast">{share.person_name}</span>
              <span className="font-heading text-base text-midnight-cherry">${Number(share.amount).toFixed(2)}</span>
            </div>
            <div className="flex gap-2">
              <a
                href={share.payment_url}
                className="btn-cherry chrome-hover flex-1 min-h-[44px] px-4 text-sm font-heading inline-flex items-center justify-center gap-2"
              >
                Pay Now <ArrowRight size={15} />
              </a>
              <button
                type="button"
                onClick={() => copyLink(share.payment_url, share.person_name)}
                aria-label={`Copy ${share.person_name}'s payment link`}
                className="min-h-[44px] min-w-[44px] px-4 rounded-full bg-white border border-border text-obsidian-roast inline-flex items-center justify-center gap-2 font-heading text-sm hover:border-midnight-cherry/40 transition-colors"
              >
                {copied === share.person_name ? <Check size={15} /> : <Copy size={15} />}
                <span className="hidden sm:inline">{copied === share.person_name ? 'Copied' : 'Copy link'}</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
        <Lock size={14} className="mt-0.5 flex-shrink-0" />
        <span>
          Order {orderNumber} · ${Number(total || 0).toFixed(2)} total. Send each friend their own link — it pays only their share, and
          paying it again is impossible.
        </span>
      </div>
    </div>
  );
}