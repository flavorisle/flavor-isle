import React, { useState } from 'react';
import { MapPin, Pencil } from 'lucide-react';

// Shows a saved address as a one-tap confirmation for returning customers,
// and a single plain address input for everyone else.
export default function SavedAddressField({ value, onChange, saved }) {
  const [editing, setEditing] = useState(false);

  if (saved && value && !editing) {
    return (
      <div className="mt-4">
        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Delivering To</label>
        <div className="flex items-center gap-3 bg-muted border border-border rounded-2xl px-4 py-3">
          <MapPin size={16} className="text-patina-mint flex-shrink-0" />
          <span className="text-sm text-obsidian-roast flex-1 truncate">{value}</span>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="inline-flex items-center gap-1 text-xs font-heading text-midnight-cherry hover:underline tap-44 justify-end"
          >
            <Pencil size={12} /> Change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Delivery Address *</label>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete="street-address"
        placeholder="Street address, city"
        className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
      />
      <p className="text-xs text-muted-foreground mt-1.5">Smiths Grove area only — apartment or gate notes go in Special Instructions.</p>
    </div>
  );
}