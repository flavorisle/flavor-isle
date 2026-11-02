// Left-column editor for the Build Cards sheet (issue #148, addendum v2).
// Square owns the cards — membership, name, price, sizes and every ingredient and
// topping line. This panel edits the crew's print copy and the order/visibility of
// the Square lines only. Print-only: nothing here touches the live menu.
import React from 'react';
import { ChevronUp, ChevronDown, RotateCcw, RefreshCw } from 'lucide-react';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-white text-sm';
const labelCls = 'block text-[11px] uppercase tracking-[.08em] text-muted-foreground mb-1';
const ACCENTS = ['#D2691E', '#4A2E1B', '#8A4B2A', '#CC3300', '#4E8B3E', '#B5305A'];

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

// The Square lines for one group: the printed label, a print checkbox and the
// two order arrows. Text itself is never edited here — it comes from Square.
function LineRows({ lines, group, cardKey, dimmed, onMove, onToggle }) {
  if (!lines.length) {
    return <p className="text-[11px] text-muted-foreground py-1">Not set up in Square yet</p>;
  }
  return (
    <div className={`space-y-1.5 ${dimmed ? 'opacity-50' : ''}`}>
      {lines.map((line, i) => (
        <div key={line.id} className="flex items-center gap-1.5 rounded-lg border border-border px-2 py-1.5">
          <label className="flex items-center gap-1.5 flex-1 min-w-0">
            <input
              type="checkbox"
              checked={!line.hidden}
              onChange={() => onToggle(cardKey, group, line.id)}
              aria-label={`Print ${line.text}`}
              style={{ width: 14, height: 14 }}
            />
            <span className={`text-xs truncate ${line.hidden ? 'text-muted-foreground line-through' : 'text-obsidian-roast'}`}>
              {line.text}
            </span>
          </label>
          <button
            onClick={() => onMove(cardKey, group, i, -1)}
            disabled={i === 0}
            aria-label="Move line up"
            className="p-1 text-muted-foreground hover:text-midnight-cherry disabled:opacity-30"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => onMove(cardKey, group, i, 1)}
            disabled={i === lines.length - 1}
            aria-label="Move line down"
            className="p-1 text-muted-foreground hover:text-midnight-cherry disabled:opacity-30"
          >
            <ChevronDown size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export default function BuildCardEditor({
  cards, selectedId, onSelect,
  setOverride, moveLine, toggleLine, resetCardCopy, onRefresh, refreshing,
}) {
  const card = cards.find(c => c.key === selectedId) || null;

  return (
    <div className="space-y-6">
      <div className="card-diner p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-heading text-lg text-obsidian-roast">Cards</h3>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1 text-[11px] text-patina-mint hover:text-midnight-cherry disabled:opacity-50"
          >
            <RefreshCw size={11} /> {refreshing ? 'Refreshing…' : 'Refresh from Square'}
          </button>
        </div>
        <div className="space-y-2">
          {cards.map(c => {
            const selected = c.key === selectedId;
            const inShake = c.in_shake.filter(l => !l.hidden).length;
            const onTop = c.toppings.filter(l => !l.hidden).length;
            return (
              <button
                key={c.key}
                onClick={() => onSelect(c.key)}
                className={`relative w-full h-11 rounded-[10px] px-3 text-left bg-white border ${selected ? 'border-[#E5E7EB]' : 'border-border'}`}
              >
                {selected && (
                  <span
                    className="absolute left-0 top-0 bottom-0 rounded-l-[10px]"
                    style={{ width: 3, backgroundColor: c.accent_color }}
                  />
                )}
                <span className="block text-[13px] font-semibold text-obsidian-roast truncate">{c.print_name}</span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {c.on_sheet === false
                    ? 'OFF THE SHEET'
                    : c.not_topped
                      ? 'NOT TOPPED'
                      : `${inShake} in the shake · ${onTop} on top`}
                </span>
              </button>
            );
          })}
          {!cards.length && (
            <p className="text-xs text-muted-foreground">
              No Blend &amp; Bliss items found. Hit Refresh from Square.
            </p>
          )}
        </div>
      </div>

      {!card ? (
        <div className="card-diner p-5">
          <p className="text-sm text-muted-foreground">Pick a card above to edit it.</p>
        </div>
      ) : (
        <div className="card-diner p-5 space-y-5">
          <div>
            <Field label="Name">
              <input
                className={inputCls}
                value={card.print_name}
                placeholder={card.name}
                onChange={e => setOverride(card.key, 'print_name', e.target.value || undefined)}
              />
            </Field>
            <Field label="Kicker">
              <input className={inputCls} value={card.kicker} onChange={e => setOverride(card.key, 'kicker', e.target.value)} />
            </Field>
            <Field label="Tagline">
              <textarea
                rows={2}
                className={inputCls}
                value={card.tagline}
                onChange={e => setOverride(card.key, 'tagline', e.target.value)}
              />
            </Field>
            <div className="mb-3">
              <span className={labelCls}>Price · from Square</span>
              <div className="px-3 py-2 rounded-lg border border-border bg-muted/40 text-sm text-muted-foreground">
                ${Number(card.price || 0).toFixed(2)}
                {card.sizes.length > 0 && ` · ${card.sizes.map(s => `${s.label}${Number(s.upcharge) > 0 ? ` +$${Number(s.upcharge).toFixed(2)}` : ''}`).join(' · ')}`}
              </div>
            </div>
            <div>
              <span className={labelCls}>Accent color</span>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map(color => (
                  <button
                    key={color}
                    onClick={() => setOverride(card.key, 'accent_color', color)}
                    aria-label={`Accent ${color}`}
                    className={`h-7 w-7 rounded-full border border-black/10 ${card.accent_color === color ? 'ring-2 ring-offset-2 ring-obsidian-roast' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <span className={labelCls}>In the shake</span>
            <LineRows
              lines={card.in_shake}
              group="in_shake"
              cardKey={card.key}
              onMove={moveLine}
              onToggle={toggleLine}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`${labelCls} mb-0`}>On top</span>
              <button
                role="switch"
                aria-checked={card.not_topped}
                aria-label="Serve it bare, no toppings"
                onClick={() => setOverride(card.key, 'force_bare', !card.not_topped || undefined)}
                className={`relative inline-flex items-center rounded-full transition-colors flex-shrink-0 ${card.not_topped ? 'bg-midnight-cherry' : 'bg-muted-foreground/30'}`}
                style={{ width: 44, height: 24 }}
              >
                <span
                  className="inline-block rounded-full bg-white shadow transition-transform"
                  style={{ width: 20, height: 20, transform: `translateX(${card.not_topped ? 22 : 2}px)` }}
                />
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2">Serve it bare · no toppings</p>
            <LineRows
              lines={card.toppings}
              group="toppings"
              cardKey={card.key}
              dimmed={card.not_topped}
              onMove={moveLine}
              onToggle={toggleLine}
            />
          </div>

          <div>
            <Field label="House portions">
              <textarea
                rows={3}
                className={inputCls}
                placeholder="14 oz: ___ · 20 oz: ___ · topping: ___"
                value={card.house_portions}
                onChange={e => setOverride(card.key, 'house_portions', e.target.value)}
              />
            </Field>

            <label className="flex items-center gap-2 text-[11px] text-muted-foreground mb-3">
              <input
                type="checkbox"
                checked={card.on_sheet === false}
                onChange={e => setOverride(card.key, 'off_sheet', e.target.checked ? true : undefined)}
                style={{ width: 14, height: 14 }}
              />
              Off the sheet · don't print
            </label>

            <div className="flex items-center justify-between">
              <button
                onClick={() => resetCardCopy(card.key)}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-midnight-cherry"
              >
                <RotateCcw size={12} /> Reset card copy
              </button>
              <span className="text-[11px] text-muted-foreground">Square item {card.key}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}