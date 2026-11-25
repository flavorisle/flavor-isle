import React from 'react';
import { ChevronDown, X } from 'lucide-react';
import MenuItemCard from '@/components/MenuItemCard';

// One slot of the Date Night ticket (issue #357). The list is the menu's own card,
// the /menu ticket row, and the sheet behind Customize & Add is the menu's own
// sheet. This component only decides which slot the finished pick lands in.
export default function DateNightSlotPicker({
  heading,
  note,
  items = [],
  picked,
  open,
  onToggle,
  onPick,
  onClear,
  optional,
  agree,
}) {
  return (
    <section className="dn-slot">
      <div className="dn-slot-head">
        <h3 className="dn-slot-title">{heading}</h3>
        {!picked && (
          <button
            type="button"
            className="dn-btn dn-btn-small dn-btn-ghost"
            onClick={() => onToggle(!open)}
            aria-expanded={open}
          >
            {open ? 'Hide' : optional ? 'Add one' : 'Choose'}
            <ChevronDown size={14} className={open ? 'dn-chev is-open' : 'dn-chev'} />
          </button>
        )}
      </div>

      {note && <p className="dn-slot-note">{note}</p>}

      {agree && !picked && !open && (
        <div className="dn-agree">
          <div>
            <p className="dn-agree-label">The suggested side</p>
            <p className="dn-agree-name">
              {agree.item.name} <span className="dn-pick-price">${Number(agree.item.price || 0).toFixed(2)}</span>
            </p>
          </div>
          <div className="dn-agree-actions">
            <button type="button" className="dn-btn dn-btn-small" onClick={agree.onAgree}>
              Agree to the side
            </button>
            <button type="button" className="dn-btn dn-btn-small dn-btn-ghost" onClick={() => onToggle(true)}>
              Pick a different side
            </button>
          </div>
        </div>
      )}

      {picked && (
        <div className="dn-pick">
          <div>
            <p className="dn-pick-name">{picked.name}</p>
            {(picked.selectedModifiers || []).length > 0 && (
              <p className="dn-pick-mods">
                {picked.selectedModifiers.map((mod) => mod.name).filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          <span className="dn-pick-price">${Number(picked.price || 0).toFixed(2)}</span>
          <button type="button" className="dn-btn dn-btn-small dn-btn-ghost" onClick={() => onToggle(!open)}>
            {open ? 'Hide' : 'Change'}
          </button>
          <button
            type="button"
            className="dn-icon-btn"
            onClick={onClear}
            aria-label={`Take off ${picked.name}`}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {open && (
        <div className="dn-cards">
          {items.map((item) => (
            <MenuItemCard
              key={item.id}
              item={item}
              variant="ticket"
              onPicked={(line) => { onPick(line); onToggle(false); }}
            />
          ))}
          {items.length === 0 && (
            <p className="dn-slot-note">Nothing from this part of the menu is available right now.</p>
          )}
        </div>
      )}
    </section>
  );
}