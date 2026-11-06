import React, { useState } from 'react';
import { ChevronDown, User, Globe, Bot, Shield } from 'lucide-react';
import moment from 'moment';

// Badge per bucket. Classes are literal so Tailwind keeps them (issue #161).
const KIND_BADGE = {
  account: { label: 'Account', className: 'bg-midnight-cherry text-white' },
  guest: { label: 'Guest', className: 'bg-obsidian-roast/10 text-obsidian-roast' },
  human: { label: 'Guest', className: 'bg-obsidian-roast/10 text-obsidian-roast' },
  bot: { label: 'Bot', className: 'bg-smashie-yellow/25 text-obsidian-roast' },
  staff: { label: 'Staff', className: 'bg-patina-mint text-white' },
  legacy: { label: 'Unclassified', className: 'bg-muted text-muted-foreground' },
};

// One visitor — an account, a guest visit, a bot, a staff member, or a row written
// before classification existed — with the page they are on now and the full trail
// of pages they opened, oldest first.
export default function VisitorActivityRow({ visitor }) {
  const [open, setOpen] = useState(false);

  const kind = visitor.kind || (visitor.isAccount ? 'account' : 'guest');
  const badge = KIND_BADGE[kind] || KIND_BADGE.guest;
  const isBot = kind === 'bot';
  const Icon = isBot ? Bot : kind === 'staff' ? Shield : visitor.isAccount ? User : Globe;

  return (
    <div className="bg-white border border-border rounded-2xl overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-midnight-cherry/5 transition-colors select-none"
      >
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
            visitor.isAccount ? 'bg-midnight-cherry/10 text-midnight-cherry' : 'bg-obsidian-roast/10 text-obsidian-roast'
          }`}
        >
          <Icon size={16} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-heading text-sm text-obsidian-roast truncate">{visitor.label}</span>
            <span className={`text-[10px] font-heading px-2 py-0.5 rounded-full ${badge.className}`}>{badge.label}</span>
            {visitor.botReason && (
              <span className="text-[10px] font-heading px-2 py-0.5 rounded-full bg-midnight-cherry/10 text-midnight-cherry">
                {visitor.botReason}
              </span>
            )}
            <span className="text-[11px] text-muted-foreground">{visitor.ip}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            Last page: <span className="font-mono text-obsidian-roast">{visitor.lastPath}</span> · {moment(visitor.lastAt).fromNow()}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
            {visitor.views.length} {isBot ? 'requests' : 'pages'}
          </span>
          <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border/60">
          <p className="text-[10px] font-heading uppercase tracking-wide text-muted-foreground py-2">
            {isBot ? 'Every request' : 'Every page they were on'}
          </p>
          <ol className="space-y-1.5">
            {visitor.trail.map((view) => (
              <li key={view.id} className="flex items-baseline gap-3 text-xs">
                <span className="text-muted-foreground font-mono whitespace-nowrap w-32 flex-shrink-0">
                  {moment(view.created_date).format('MMM D, h:mm A')}
                </span>
                <span className="font-mono text-obsidian-roast break-all">{view.path}</span>
                {view.referrer && (
                  <span className="text-[10px] text-muted-foreground/70 truncate hidden sm:inline">from {view.referrer}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}