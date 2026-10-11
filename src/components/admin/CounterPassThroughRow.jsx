import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Trash2 } from 'lucide-react';

// One pass-through entry: who it is, why, and the on/off switch that lifts or
// restores the skip-to-counter routing without deleting the record.
export default function CounterPassThroughRow({ entry, onChanged, onRemoved }) {
  const [confirming, setConfirming] = useState(false);

  const toggle = async (isActive) => {
    await base44.entities.CounterPassThrough.update(entry.id, { is_active: isActive });
    onChanged({ ...entry, is_active: isActive });
  };

  const remove = async () => {
    await base44.entities.CounterPassThrough.delete(entry.id);
    onRemoved(entry.id);
  };

  return (
    <div className={`bg-white rounded-2xl border border-border p-4 flex items-start justify-between gap-3 ${entry.is_active ? '' : 'opacity-60'}`}>
      <div className="min-w-0">
        <p className="font-heading text-obsidian-roast truncate">
          {entry.phone}
        </p>
        <p className="text-sm text-muted-foreground break-words">
          {entry.name || 'No name saved'}
        </p>
        {entry.note && <p className="text-xs text-muted-foreground mt-1">Note: {entry.note}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{entry.is_active ? 'Rings counter' : 'Off'}</span>
          <Switch checked={!!entry.is_active} onCheckedChange={toggle} aria-label="Pass-through active" />
        </div>
        {confirming ? (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="destructive" onClick={remove}>Yes</Button>
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>No</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} aria-label="Remove pass-through entry">
            <Trash2 size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}