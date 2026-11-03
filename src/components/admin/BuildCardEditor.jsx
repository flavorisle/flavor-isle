import React from 'react';
import { ChevronUp, ChevronDown, RefreshCw } from 'lucide-react';
import BuildCardSourceDetails from '@/components/admin/BuildCardSourceDetails';

export default function BuildCardEditor({ cards, selectedId, onSelect, setOverride, moveCard, onRefresh, refreshing, sourceDate, error }) {
  const card = cards.find(value => value.key === selectedId);
  return (
    <div className="space-y-6 force-light">
      <section className="card-diner p-5">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-heading text-lg">Cards</h3>
          <button onClick={onRefresh} disabled={refreshing} className="flex items-center gap-2 min-h-11 text-sm text-primary disabled:opacity-50">
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />{refreshing ? 'Refreshing…' : 'Refresh from Square'}
          </button>
        </div>
        {sourceDate && <p className="text-xs text-muted-foreground mb-3">Square pull: {new Date(sourceDate).toLocaleString()}</p>}
        {error && <p role="alert" className="text-sm text-destructive mb-3">{error} Refresh from Square to try again.</p>}
        <div className="space-y-2">
          {cards.map((value, index) => (
            <div key={value.key} className={`flex items-center gap-1 rounded-lg border p-2 ${value.key === selectedId ? 'border-primary' : 'border-border'}`}>
              <button onClick={() => onSelect(value.key)} className="min-h-11 flex-1 min-w-0 text-left" aria-pressed={value.key === selectedId}>
                <span className="block text-sm font-semibold break-words">{index + 1}. {value.name}</span>
                <span className="block text-xs text-muted-foreground">{value.modifier_groups.length} groups · {value.modifier_count} modifiers{value.on_sheet === false ? ' · off sheet' : ''}</span>
              </button>
              <div className="flex flex-col">
                <button onClick={() => moveCard(value.key, -1)} disabled={index === 0} aria-label={`Move ${value.name} up`} className="min-w-11 min-h-11 flex items-center justify-center disabled:opacity-30"><ChevronUp size={16} /></button>
                <button onClick={() => moveCard(value.key, 1)} disabled={index === cards.length - 1} aria-label={`Move ${value.name} down`} className="min-w-11 min-h-11 flex items-center justify-center disabled:opacity-30"><ChevronDown size={16} /></button>
              </div>
            </div>
          ))}
          {!cards.length && !refreshing && !error && <p className="text-sm text-muted-foreground">No Bliss cards in Square right now.</p>}
        </div>
      </section>
      {card && <BuildCardSourceDetails card={card} setOverride={setOverride} />}
    </div>
  );
}