import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import ModifierOptionRow from './ModifierOptionRow';

// One modifier group in the admin Modifiers panel — a Square modifier list,
// either attached to items (parent) or revealed by a parent option (nested
// child). Child lists render inside the option that reveals them, so the admin
// sees the parent → child relationship they're controlling.
export default function ModifierGroupCard({
  group, byKey, depth = 0, overrides,
  onToggleGroupHidden, onToggleOptionHidden, onToggleSoldOut, onSetPrice,
}) {
  const [open, setOpen] = useState(depth > 0);
  const hidden = overrides.hidden_groups.includes(group.key);
  const hiddenOptions = group.options.filter((o) => o.id && overrides.hidden_options.includes(o.id)).length;
  const overridden = group.options.filter((o) => o.id && overrides.option_prices[o.id] != null).length;
  const childrenFor = (option) => (option.childKeys || []).map((k) => byKey.get(k)).filter(Boolean);

  return (
    <div className={`card-diner p-4 ${hidden ? 'opacity-70' : ''} ${depth > 0 ? 'bg-muted/30' : ''}`}>
      <div className="flex items-center gap-3">
        <button
          onClick={() => setOpen(!open)}
          aria-label={open ? `Collapse ${group.name}` : `Expand ${group.name}`}
          className="p-1.5 rounded-lg bg-muted hover:bg-gray-200 transition-colors flex-shrink-0"
        >
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </button>

        <div className="flex-1 min-w-0">
          <p className={`font-heading text-sm ${hidden ? 'text-muted-foreground line-through' : 'text-obsidian-roast'}`}>
            {group.name}
            {depth > 0 && (
              <span className="ml-2 text-xs font-body text-patina-mint bg-patina-mint/10 px-2 py-0.5 rounded-full">
                nested
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {group.selection_type === 'MULTIPLE' ? 'Choose any' : 'Choose one'}
            {' · '}{group.options.length} option{group.options.length === 1 ? '' : 's'}
            {group.items.length > 0 && ` · ${group.items.slice(0, 2).join(', ')}${group.items.length > 2 ? ` +${group.items.length - 2} more` : ''}`}
            {hiddenOptions > 0 && ` · ${hiddenOptions} hidden`}
            {overridden > 0 && ` · ${overridden} price override${overridden === 1 ? '' : 's'}`}
          </p>
        </div>

        {group.id ? (
          <button
            onClick={() => onToggleGroupHidden(group.key)}
            title={hidden ? 'Show this group to customers' : 'Hide this whole group from customers'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-heading transition-colors flex-shrink-0 ${
              hidden ? 'bg-gray-200 text-gray-600 hover:bg-gray-300' : 'bg-green-100 text-green-700 hover:bg-green-200'
            }`}
          >
            {hidden ? <EyeOff size={13} /> : <Eye size={13} />}
            {hidden ? 'Hidden' : 'Shown'}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">Item sizes</span>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-2">
          {group.options.map((option) => (
            <div key={option.key}>
              <ModifierOptionRow
                option={option}
                overrides={overrides}
                onToggleHidden={onToggleOptionHidden}
                onToggleSoldOut={onToggleSoldOut}
                onSetPrice={onSetPrice}
              />
              {childrenFor(option).map((child) => (
                <div key={child.key} className="mt-2 ml-4 pl-3 border-l-2 border-patina-mint/30">
                  <ModifierGroupCard
                    group={child}
                    byKey={byKey}
                    depth={depth + 1}
                    overrides={overrides}
                    onToggleGroupHidden={onToggleGroupHidden}
                    onToggleOptionHidden={onToggleOptionHidden}
                    onToggleSoldOut={onToggleSoldOut}
                    onSetPrice={onSetPrice}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}