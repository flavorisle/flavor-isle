// One collapsible "super link" row in the header dropdown: a top-level section
// that expands to reveal its child links. Keeps the menu short by default.
import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown } from 'lucide-react';

export default function NavSuperLink({ group, pathname, open, onToggle, onClose }) {
  const Icon = group.icon;

  // Direct link: same row styling as a super link, but navigates instead of expanding.
  if (group.to) {
    const active = pathname === group.to;
    return (
      <Link
        to={group.to}
        onClick={onClose}
        className={`flex items-center gap-3 w-full px-3 py-3 rounded-xl text-sm font-heading tracking-wider uppercase transition-colors tap-44 ${
          active ? 'bg-midnight-cherry text-white' : 'text-obsidian-roast hover:bg-muted'
        }`}
      >
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          active ? 'bg-white/20 text-white' : 'bg-muted text-midnight-cherry'
        }`}>
          <Icon size={16} />
        </span>
        <span className="flex-1 text-left">{group.title}</span>
      </Link>
    );
  }

  const hasActive = group.links.some(l => l.to === pathname);

  return (
    <div className={`rounded-xl overflow-hidden ${open ? 'bg-muted/50' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className={`flex items-center gap-3 w-full px-3 py-3 text-sm font-heading tracking-wider transition-colors tap-44 ${
          hasActive && !open ? 'text-midnight-cherry' : 'text-obsidian-roast'
        } hover:bg-muted`}
      >
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          hasActive ? 'bg-midnight-cherry text-white' : 'bg-muted text-midnight-cherry'
        }`}>
          <Icon size={16} />
        </span>
        <span className="flex-1 text-left uppercase">{group.title}</span>
        <ChevronDown size={16} className={`text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="pb-2 pl-4 pr-2 space-y-0.5">
          {group.links.map(link => {
            const active = pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                onClick={onClose}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-body font-semibold transition-colors ${
                  active ? 'bg-midnight-cherry text-white' : 'text-obsidian-roast hover:bg-white'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-white' : 'bg-midnight-cherry/60'}`} />
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}