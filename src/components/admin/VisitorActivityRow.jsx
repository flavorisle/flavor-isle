import React, { useState } from 'react';
import { ChevronDown, User, Globe } from 'lucide-react';
import moment from 'moment';

// One visitor — an account, or a guest address — with the page they are on now and
// the full trail of pages they opened, oldest first.
export default function VisitorActivityRow({ visitor }) {
  const [open, setOpen] = useState(false);

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
          {visitor.isAccount ? <User size={16} /> : <Globe size={16} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-heading text-sm text-obsidian-roast truncate">{visitor.label}</span>
            {visitor.isAccount ? (
              <span className="text-[10px] font-heading px-2 py-0.5 rounded-full bg-midnight-cherry text-white">Account</span>
            ) : (
              <span className="text-[10px] font-heading px-2 py-0.5 rounded-full bg-obsidian-roast/10 text-obsidian-roast">Guest</span>
            )}
            <span className="text-[11px] text-muted-foreground">{visitor.ip}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            Last page: <span className="font-mono text-obsidian-roast">{visitor.lastPath}</span> · {moment(visitor.lastAt).fromNow()}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-[11px] text-muted-foreground whitespace-nowrap">{visitor.views.length} pages</span>
          <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-border/60">
          <p className="text-[10px] font-heading uppercase tracking-wide text-muted-foreground py-2">Every page they were on</p>
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