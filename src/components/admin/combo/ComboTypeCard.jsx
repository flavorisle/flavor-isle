import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Copy, Eye, EyeOff, Trash2 } from 'lucide-react';
import CategoryChips from './CategoryChips';
import { isDuplicateTypeName } from '@/lib/comboIsle';

// One combo type on /admin/combo-isle: its name, the main categories it offers,
// and the buttons that reorder, duplicate, hide or delete it.
export default function ComboTypeCard({
  type,
  index,
  total,
  options,
  allTypes,
  mainCount,
  onChange,
  onMove,
  onDuplicate,
  onDelete,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const hidden = type.enabled === false;
  const blankName = !String(type.name || '').trim();
  const duplicateName = isDuplicateTypeName(allTypes, type.name, type.id);

  return (
    <div className={`bg-white rounded-2xl border border-border p-4 ${hidden ? 'opacity-60' : ''}`}>
      <div className="flex flex-wrap items-start gap-2">
        <div className="flex-1 min-w-[160px]">
          <div className="flex items-center gap-2">
            <input
              value={type.name || ''}
              maxLength={24}
              onChange={(e) => onChange({ name: e.target.value })}
              placeholder="Combo name"
              className="w-full rounded-xl border border-border px-3 py-2 font-heading text-sm text-obsidian-roast"
            />
            {hidden && (
              <span className="text-[10px] font-heading uppercase tracking-widest bg-muted text-muted-foreground px-2 py-1 rounded-full whitespace-nowrap">
                Hidden
              </span>
            )}
          </div>
          {blankName && <p className="text-[11px] text-midnight-cherry mt-1">Name is required</p>}
          {!blankName && duplicateName && (
            <p className="text-[11px] text-smashie-yellow mt-1">Another combo already uses this name</p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onMove(-1)}
            disabled={index === 0}
            aria-label="Move up"
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-obsidian-roast disabled:opacity-30"
          >
            <ArrowUp size={14} />
          </button>
          <button
            onClick={() => onMove(1)}
            disabled={index === total - 1}
            aria-label="Move down"
            className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-obsidian-roast disabled:opacity-30"
          >
            <ArrowDown size={14} />
          </button>
          <button
            onClick={onDuplicate}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full border border-border text-[11px] font-heading text-muted-foreground hover:text-obsidian-roast"
          >
            <Copy size={12} /> Duplicate
          </button>
          <button
            onClick={() => onChange({ enabled: hidden })}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full border border-border text-[11px] font-heading text-muted-foreground hover:text-obsidian-roast"
          >
            {hidden ? <Eye size={12} /> : <EyeOff size={12} />} {hidden ? 'Show' : 'Hide'}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            className="inline-flex items-center gap-1 h-8 px-2.5 rounded-full border border-midnight-cherry/40 text-[11px] font-heading text-midnight-cherry hover:bg-midnight-cherry/10"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </div>

      <div className="mt-3">
        <CategoryChips
          label="Main categories"
          hint="Only these fill this combo's Step 1."
          categories={type.main_categories || []}
          options={options}
          onChange={(next) => onChange({ main_categories: next })}
        />
      </div>

      <p className="text-[11px] text-muted-foreground mt-2">{mainCount} mains</p>

      {confirmDelete && (
        <div className="mt-3 rounded-xl bg-midnight-cherry/5 border border-midnight-cherry/30 p-3">
          <p className="text-xs text-obsidian-roast">
            Delete {type.name || 'this combo'}? Boxes already in a customer's cart keep their items and price.
            This only removes the combo from /combos.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() => { onDelete(); setConfirmDelete(false); }}
              className="px-3 py-1.5 rounded-full bg-midnight-cherry text-white text-[11px] font-heading"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="px-3 py-1.5 rounded-full border border-border text-[11px] font-heading text-muted-foreground"
            >
              Keep
            </button>
          </div>
        </div>
      )}
    </div>
  );
}