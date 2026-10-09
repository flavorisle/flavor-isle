import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Trash2 } from 'lucide-react';

// One blocked entry: who it is, why, and the on/off switch that lifts or
// restores the block without deleting the record.
export default function BlockedContactRow({ block, onChanged, onRemoved }) {
  const [confirming, setConfirming] = useState(false);

  const toggle = async (isActive) => {
    await base44.entities.BlockedContact.update(block.id, { is_active: isActive });
    onChanged({ ...block, is_active: isActive });
  };

  const remove = async () => {
    await base44.entities.BlockedContact.delete(block.id);
    onRemoved(block.id);
  };

  return (
    <div className={`bg-white rounded-2xl border border-border p-4 flex items-start justify-between gap-3 ${block.is_active ? '' : 'opacity-60'}`}>
      <div className="min-w-0">
        <p className="font-heading text-obsidian-roast truncate">
          {block.phone || block.email}
        </p>
        <p className="text-sm text-muted-foreground break-words">
          {[block.customer_name, block.email && block.phone ? block.email : null].filter(Boolean).join(' · ') || 'No name saved'}
        </p>
        {block.reason && <p className="text-xs text-muted-foreground mt-1">Reason: {block.reason}</p>}
      </div>
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{block.is_active ? 'Blocked' : 'Lifted'}</span>
          <Switch checked={!!block.is_active} onCheckedChange={toggle} aria-label="Block active" />
        </div>
        {confirming ? (
          <div className="flex items-center gap-1">
            <Button size="sm" variant="destructive" onClick={remove}>Yes</Button>
            <Button size="sm" variant="outline" onClick={() => setConfirming(false)}>No</Button>
          </div>
        ) : (
          <Button size="sm" variant="ghost" onClick={() => setConfirming(true)} aria-label="Remove block">
            <Trash2 size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}