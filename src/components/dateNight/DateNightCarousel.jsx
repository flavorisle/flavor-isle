import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import ModifierModal from '@/components/ModifierModal';
import { withShakeFlavorLevel } from '@/components/ShakeFlavorControl';
import { saltNoteText } from '@/lib/sideSalt';
import { optimizedImageUrl } from '@/lib/utils';

const money = (value) => `$${(Number(value) || 0).toFixed(2)}`;

// One section of the Date Night ticket (issue #358) as a horizontal carousel.
// Each card is a photo tile, the item name, its live price and the state label;
// tapping it opens the real ModifierModal unchanged — the same groups, photo
// tiles, Lite/Reg/Extra strips, live prices and required/min/max rules the menu
// uses. The row snaps, never autoplays, never loops, and leaves vertical page
// scrolling alone.
export default function DateNightCarousel({
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
  const [modalItem, setModalItem] = useState(null);
  const [active, setActive] = useState(0);
  const scroller = useRef(null);

  // The picked card moves to the front of its row.
  const ordered = useMemo(() => {
    if (!pickedId) return items;
    const picked = items.find((item) => item.id === pickedId);
    if (!picked) return items;
    return [picked, ...items.filter((item) => item.id !== pickedId)];
  }, [items, pickedId]);

  const stepWidth = () => {
    const el = scroller.current;
    const first = el?.firstElementChild;
    if (!el || !first) return 282;
    const gap = parseFloat(window.getComputedStyle(el).columnGap) || 14;
    return first.getBoundingClientRect().width + gap;
  };

  const goTo = (index) => {
    const el = scroller.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(ordered.length - 1, index));
    el.scrollTo({ left: clamped * stepWidth(), behavior: 'smooth' });
  };

  const onScroll = () => {
    const el = scroller.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / stepWidth());
    setActive(Math.max(0, Math.min(ordered.length - 1, index)));
  };

  // Coming back to the section after a pick: the chosen card is now first, so
  // the row starts there.
  useEffect(() => {
    if (!pickedId) return;
    const el = scroller.current;
    if (el) el.scrollTo({ left: 0 });
    setActive(0);
  }, [pickedId]);

  const confirm = (selectedMods, extraCost, deluxeLabel, deluxeToppings, _comboItems, allergyNote, coreLevel, saltNote) => {
    if (!modalItem) return;
    onPicked({
      ...modalItem,
      name: withShakeFlavorLevel(modalItem.name, coreLevel),
      flavorLevel: coreLevel || undefined,
      price: Number(modalItem.price || 0) + extraCost,
      selectedModifiers: selectedMods,
      deluxeLabel: deluxeLabel || undefined,
      deluxeToppings: deluxeToppings || [],
      allergyNote: allergyNote || undefined,
      saltNote: saltNoteText(saltNote) || undefined,
    });
    setModalItem(null);
  };

  return (
    <section className="dn2-block" id={id}>
      <div className="dn2-block-head">
        <h2 className="dn2-h">
          {heading}
          {optional && <span className="dn2-optional"> Optional</span>}
        </h2>

        <div className="dn2-head-actions">
          {pickedId && (
            <button type="button" className="dn2-clear" onClick={onClear}>
              Clear
            </button>
          )}
          {ordered.length > 1 && (
            <div className="dn2-arrows">
              <button
                type="button"
                className="dn2-arrow"
                onClick={() => goTo(active - 1)}
                disabled={active <= 0}
                aria-label="Previous item"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                type="button"
                className="dn2-arrow"
                onClick={() => goTo(active + 1)}
                disabled={active >= ordered.length - 1}
                aria-label="Next item"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
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

      {ordered.length === 0 ? (
        <p className="dn2-note">{emptyText}</p>
      ) : (
        <>
          <div
            className="dn2-scroller"
            ref={scroller}
            onScroll={onScroll}
            role="group"
            aria-label={heading}
          >
            {ordered.map((item) => {
              const picked = pickedId === item.id;
              const suggested = !picked && suggestedId === item.id;
              const photo = item.image_url_opt || item.image_url;

              return (
                <div key={item.id} className="dn2-slide">
                  <button
                    type="button"
                    className={`dn2-item${picked ? ' is-picked' : ''}${suggested ? ' is-suggested' : ''}`}
                    onClick={() => setModalItem(item)}
                    aria-label={`${picked ? 'Edit' : 'Pick'} ${item.name}`}
                  >
                    {photo ? (
                      <img
                        className="dn2-item-photo"
                        src={optimizedImageUrl(photo, 400, 300)}
                        alt=""
                        width="400"
                        height="300"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <span className="dn2-item-photo dn2-item-glyph" aria-hidden="true">
                        {String(item.name || '·').slice(0, 1)}
                      </span>
                    )}

                    <span className="dn2-item-body">
                      <span className="dn2-state">
                        {picked ? 'Picked · Edit' : suggested ? 'Suggested' : 'Tap to pick'}
                      </span>
                      <span className="dn2-item-name">{item.name}</span>
                      <span className="dn2-item-price">{money(item.price)}</span>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {ordered.length > 1 && (
            <div className="dn2-dots">
              {ordered.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  className={`dn2-dot${index === active ? ' is-on' : ''}`}
                  onClick={() => goTo(index)}
                  aria-label={`Go to ${item.name}`}
                  aria-current={index === active}
                />
              ))}
            </div>
          )}
        </>
      )}

      {modalItem && (
        <ModifierModal
          item={modalItem}
          autoCombo={false}
          onClose={() => setModalItem(null)}
          onConfirm={confirm}
        />
      )}
    </section>
  );
}