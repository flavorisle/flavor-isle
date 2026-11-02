// Left-column editor for the Build Cards sheet (issue #148 section 4): the card
// list, per-card copy, sizes, the two ingredient repeaters and the serve-it-bare
// switch. Print-only — nothing here touches the live menu.
import React from 'react';
import { ChevronUp, ChevronDown, Trash2, Plus, RotateCcw } from 'lucide-react';

const inputCls = 'w-full px-3 py-2 rounded-lg border border-border bg-white text-sm';
const labelCls = 'block text-[11px] uppercase tracking-[.08em] text-muted-foreground mb-1';
const linkCls = 'flex items-center gap-1 text-[11px] text-patina-mint hover:text-midnight-cherry';
const ACCENTS = ['#D2691E', '#4A2E1B', '#8A4B2A', '#CC3300', '#4E8B3E', '#B5305A'];

function Field({ label, children }) {
  return (
    <label className="block mb-3">
      <span className={labelCls}>{label}</span>
      {children}
    </label>
  );
}

// One ingredient repeater. The text input is full width; the controls sit under
// it so a long line stays readable in the 22rem column.
function LineRepeater({ lines, optionalLabel, disabled, onText, onToggleOptional, onMove, onRemove, onAdd, addLabel }) {
  return (
    <div className="space-y-2">
      {lines.map((line, i) => (
        <div
          key={i}
          className={`rounded-lg border border-border p-2 space-y-1.5 ${disabled ? 'opacity-50 pointer-events-none' : ''}`}
        >
          <input
            className={inputCls}
            value={line.text}
            disabled={disabled}
            placeholder="Ingredient…"
            onChange={e => onText(i, e.target.value)}
          />
          <div className="flex items-center gap-1">
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground mr-auto">
              <input
                type="checkbox"
                checked={line.optional}
                disabled={disabled}
                onChange={e => onToggleOptional(i, e.target.checked)}
                style={{ width: 14, height: 14 }}
              />
              {optionalLabel}
            </label>
            <button
              onClick={() => onMove(i, -1)}
              disabled={disabled || i === 0}
              aria-label="Move line up"
              className="p-1 text-muted-foreground hover:text-midnight-cherry disabled:opacity-30"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={() => onMove(i, 1)}
              disabled={disabled || i === lines.length - 1}
              aria-label="Move line down"
              className="p-1 text-muted-foreground hover:text-midnight-cherry disabled:opacity-30"
            >
              <ChevronDown size={14} />
            </button>
            <button
              onClick={() => onRemove(i)}
              disabled={disabled}
              aria-label="Remove line"
              className="p-1 text-muted-foreground hover:text-destructive"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ))}
      <button onClick={onAdd} disabled={disabled} className={linkCls}>
        <Plus size={10} /> {addLabel}
      </button>
    </div>
  );
}

export default function BuildCardEditor({
  cards, selectedId, onSelect,
  updateCard, moveCardInShake, moveCardTopping, addCardLine, removeCardLine,
  addCardSize, removeCardSize, addCard, moveCard, resetCards,
}) {
  const index = cards.findIndex(c => c.id === selectedId);
  const card = index === -1 ? null : cards[index];

  const setLines = (kind, lines) => updateCard(card.id, { [kind]: lines });

  return (
    <div className="space-y-6">
      <div className="card-diner p-5">
        <h3 className="font-heading text-lg text-obsidian-roast mb-3">Cards</h3>
        <div className="space-y-2">
          {cards.map(c => {
            const selected = c.id === selectedId;
            return (
              <button
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`relative w-full h-11 rounded-[10px] px-3 text-left bg-white border ${selected ? 'border-[#E5E7EB]' : 'border-border'}`}
              >
                {selected && (
                  <span
                    className="absolute left-0 top-0 bottom-0 rounded-l-[10px]"
                    style={{ width: 3, backgroundColor: c.accent_color }}
                  />
                )}
                <span className="block text-[13px] font-semibold text-obsidian-roast truncate">{c.name}</span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {c.not_topped ? 'NOT TOPPED' : `${c.in_shake.length} in the shake · ${c.toppings.length} on top`}
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={addCard}
          className="w-full mt-3 flex items-center justify-center gap-1 py-1.5 text-xs font-heading text-patina-mint border border-dashed border-patina-mint/40 rounded-lg hover:bg-patina-mint/5 transition-colors"
        >
          <Plus size={12} /> Add card
        </button>
      </div>

      {!card ? (
        <div className="card-diner p-5">
          <p className="text-sm text-muted-foreground">Pick a card above to edit it.</p>
        </div>
      ) : (
        <div className="card-diner p-5 space-y-5">
          <div>
            <Field label="Name">
              <input className={inputCls} value={card.name} onChange={e => updateCard(card.id, { name: e.target.value })} />
            </Field>
            <Field label="Kicker">
              <input className={inputCls} value={card.kicker} onChange={e => updateCard(card.id, { kicker: e.target.value })} />
            </Field>
            <Field label="Tagline">
              <textarea
                rows={2}
                className={inputCls}
                value={card.tagline}
                onChange={e => updateCard(card.id, { tagline: e.target.value })}
              />
            </Field>
            <Field label="Price">
              <input
                type="number"
                step="0.01"
                className={inputCls}
                value={card.price}
                onChange={e => updateCard(card.id, { price: e.target.value })}
              />
            </Field>
            <div>
              <span className={labelCls}>Accent color</span>
              <div className="flex flex-wrap gap-2">
                {ACCENTS.map(color => (
                  <button
                    key={color}
                    onClick={() => updateCard(card.id, { accent_color: color })}
                    aria-label={`Accent ${color}`}
                    className={`h-7 w-7 rounded-full border border-black/10 ${card.accent_color === color ? 'ring-2 ring-offset-2 ring-obsidian-roast' : ''}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div>
            <span className={labelCls}>Sizes</span>
            <div className="space-y-1.5">
              {card.sizes.map((size, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className="px-2 py-1 text-xs rounded border border-border"
                    style={{ width: 90 }}
                    placeholder="14 oz"
                    value={size.label}
                    onChange={e => {
                      const next = [...card.sizes];
                      next[i] = { ...next[i], label: e.target.value };
                      updateCard(card.id, { sizes: next });
                    }}
                  />
                  <div className="flex items-center rounded border border-border bg-white" style={{ width: 90 }}>
                    <span className="pl-2 text-xs text-muted-foreground">$</span>
                    <input
                      type="number"
                      step="0.01"
                      className="w-full px-1 py-1 text-xs bg-transparent"
                      value={size.upcharge}
                      onChange={e => {
                        const next = [...card.sizes];
                        next[i] = { ...next[i], upcharge: e.target.value };
                        updateCard(card.id, { sizes: next });
                      }}
                    />
                  </div>
                  <button
                    onClick={() => removeCardSize(card.id, i)}
                    aria-label="Remove size"
                    className="p-1 text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <button onClick={() => addCardSize(card.id)} className={linkCls}>
                <Plus size={10} /> Add size
              </button>
            </div>
          </div>

          <div>
            <span className={labelCls}>In the shake</span>
            <LineRepeater
              lines={card.in_shake}
              optionalLabel="Optional add"
              disabled={false}
              addLabel="Add ingredient line"
              onText={(i, text) => {
                const next = [...card.in_shake];
                next[i] = { ...next[i], text };
                setLines('in_shake', next);
              }}
              onToggleOptional={(i, optional) => {
                const next = [...card.in_shake];
                next[i] = { ...next[i], optional };
                setLines('in_shake', next);
              }}
              onMove={(i, dir) => moveCardInShake(card.id, i, dir)}
              onRemove={i => removeCardLine(card.id, 'in_shake', i)}
              onAdd={() => addCardLine(card.id, 'in_shake')}
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className={`${labelCls} mb-0`}>On top</span>
              <button
                role="switch"
                aria-checked={card.not_topped}
                aria-label="Serve it bare, no toppings"
                onClick={() => updateCard(card.id, { not_topped: !card.not_topped })}
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
            <LineRepeater
              lines={card.toppings}
              optionalLabel="Only if asked"
              disabled={card.not_topped}
              addLabel="Add topping line"
              onText={(i, text) => {
                const next = [...card.toppings];
                next[i] = { ...next[i], text };
                setLines('toppings', next);
              }}
              onToggleOptional={(i, optional) => {
                const next = [...card.toppings];
                next[i] = { ...next[i], optional };
                setLines('toppings', next);
              }}
              onMove={(i, dir) => moveCardTopping(card.id, i, dir)}
              onRemove={i => removeCardLine(card.id, 'toppings', i)}
              onAdd={() => addCardLine(card.id, 'toppings')}
            />
          </div>

          <div>
            <Field label="House portions">
              <textarea
                rows={3}
                className={inputCls}
                placeholder="14 oz: ___ · 20 oz: ___ · topping: ___"
                value={card.house_portions}
                onChange={e => updateCard(card.id, { house_portions: e.target.value })}
              />
            </Field>
            <div className="flex items-center gap-3">
              <button
                onClick={() => moveCard(card.id, -1)}
                disabled={index === 0}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-obsidian-roast disabled:opacity-30"
              >
                <ChevronUp size={12} /> Move card up
              </button>
              <button
                onClick={() => moveCard(card.id, 1)}
                disabled={index === cards.length - 1}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-obsidian-roast disabled:opacity-30"
              >
                <ChevronDown size={12} /> Move card down
              </button>
              <button
                onClick={resetCards}
                className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-midnight-cherry ml-auto"
              >
                <RotateCcw size={12} /> Reset to the three fall builds
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}