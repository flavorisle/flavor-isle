import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// The lines one participant has put on the group's ticket (issue #356), with the
// running subtotal for their own items. Removing is allowed only while the group
// is open; the server enforces that too.
export default function GroupLinesPanel({ code, participantName, lines = [], locked, onUpdated }) {
  const [busyId, setBusyId] = useState('');
  const mine = lines.filter((l) => l.participant_name === participantName);
  const mineTotal = mine.reduce((sum, l) => sum + (Number(l.line_total) || 0), 0);

  const remove = async (lineId) => {
    setBusyId(lineId);
    try {
      const res = await base44.functions.invoke('removeGroupOrderLine', { code, line_id: lineId });
      const data = res?.data || res;
      if (data?.ok) onUpdated?.(data);
    } finally {
      setBusyId('');
    }
  };

  return (
    <div className="card-diner p-5">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h3 className="font-heading text-lg text-obsidian-roast">Your items</h3>
        <span className="text-sm text-muted-foreground">
          Your subtotal <span className="font-heading text-midnight-cherry">${mineTotal.toFixed(2)}</span>
        </span>
      </div>

      {mine.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing from you yet. Your items show here as soon as you add them to the group.
        </p>
      ) : (
        <ul className="space-y-2">
          {mine.map((line) => (
            <li key={line.id} className="flex items-start justify-between gap-3 text-sm">
              <div className="min-w-0">
                <p className="text-obsidian-roast">
                  {line.item_name} <span className="text-muted-foreground">× {line.quantity}</span>
                </p>
                {(line.mods || []).length > 0 && (
                  <p className="text-xs text-muted-foreground">{line.mods.join(', ')}</p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-midnight-cherry font-semibold">${Number(line.line_total).toFixed(2)}</span>
                {!locked && (
                  <button
                    type="button"
                    onClick={() => remove(line.id)}
                    disabled={busyId === line.id}
                    aria-label={`Remove ${line.item_name}`}
                    className="tap-44 flex items-center justify-center text-muted-foreground hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}