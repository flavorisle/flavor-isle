import React from 'react';
import MenuItemCard from '@/components/MenuItemCard';

// One section of the Date Night ticket (issue #358). Every row IS the menu's own
// card in its /menu ticket layout, so tapping it opens the real ModifierModal
// with the same groups, minimums, hidden-online flags, 120px tiles,
// Lite/Reg/Extra and live prices. This component only adds the state label
// above each row and the agree/swap block for the suggested side.
export default function DateNightRows({
  id,
  heading,
  optional = false,
  note,
  items = [],
  pickedId,
  suggestedId,
  onPicked,
  onClear,
  emptyText = 'Nothing from this part of the menu is available right now.',
  agree,
}) {
  return (
    <section className="dn2-block" id={id}>
      <div className="dn2-block-head">
        <h2 className="dn2-h">
          {heading}
          {optional && <span className="dn2-optional"> Optional</span>}
        </h2>
        {pickedId && (
          <button type="button" className="dn2-clear" onClick={onClear}>
            Clear
          </button>
        )}
      </div>

      {note && <p className="dn2-note">{note}</p>}

      {agree && !pickedId && (
        <div className="dn2-agree">
          <p className="dn2-agree-copy">
            <strong>{agree.hostName}</strong> suggested <strong>{agree.item.name}</strong>.
          </p>
          <div className="dn2-agree-actions">
            <button type="button" className="dn-btn dn-btn-small" onClick={agree.onAgree}>
              Agree to the side
            </button>
            <button type="button" className="dn-btn dn-btn-small dn-btn-ghost" onClick={agree.onSwap}>
              Pick a different side
            </button>
          </div>
        </div>
      )}

      <div className="dn2-rows">
        {items.map((item) => {
          const picked = pickedId === item.id;
          const suggested = !picked && suggestedId === item.id;
          return (
            <div
              key={item.id}
              className={`dn2-row${picked ? ' is-picked' : ''}${suggested ? ' is-suggested' : ''}`}
            >
              <span className="dn2-state">
                {picked ? 'Picked · Edit' : suggested ? 'Suggested' : 'Tap to pick'}
              </span>
              <MenuItemCard item={item} variant="ticket" onPicked={onPicked} />
            </div>
          );
        })}
        {items.length === 0 && <p className="dn2-note">{emptyText}</p>}
      </div>
    </section>
  );
}