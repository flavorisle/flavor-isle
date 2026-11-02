// The printed Build Cards poster (issue #148 section 6): one card per page on an
// 11 × 17 sheet. Section 6 is measured at 150 px/in, while the browser lays out
// at 96 px/in, so every measured value is multiplied by PX before use.
import React from 'react';

const PX = 96 / 150;
const px = (value) => `${Math.round(value * PX * 100) / 100}px`;

const NAVY = '#12233D';
const CHERRY = '#CC3300';
const GOLD = '#E9A53F';
const GREEN = '#7FBF6A';
const CREAM = '#FDF6E3';

const BUILD_STEPS = [
  'Scoop the cream base',
  'Add the syrups',
  'Fold in the inclusions',
  'Blend it thick',
  'Finish the top',
  'Call the name',
];

// Same click-to-edit pattern as PrintableMenu.jsx. Commits on blur; plain text.
function Editable({ as: Tag = 'span', value, onCommit, className, placeholder, style }) {
  if (!onCommit) return <Tag className={className} style={style}>{value}</Tag>;
  return (
    <Tag
      className={`${className} outline-none rounded print:!bg-transparent hover:bg-yellow-50 focus:bg-yellow-50 cursor-text ${!value ? 'text-gray-400 print:hidden' : ''}`}
      style={style}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onBlur={e => {
        const text = e.currentTarget.textContent.trim();
        onCommit(text === placeholder ? '' : text);
      }}
      onFocus={e => { if (!value && placeholder) e.currentTarget.textContent = ''; }}
      onKeyDown={e => { if (e.key === 'Enter' && Tag !== 'p') { e.preventDefault(); e.currentTarget.blur(); } }}
    >
      {value || placeholder}
    </Tag>
  );
}

// A card holds 3.6in of master height. Step the name and line sizes down 4px at
// a time until the two panels fit, so a long build can never be clipped.
function fitCard(card) {
  const rows = Math.max(card.in_shake.length, card.not_topped ? 2 : card.toppings.length, 1);
  let line = 35;
  let heading = 28;
  let name = 78;
  const budget = 380;
  while ((rows + 1) * line * 1.3 > budget && line > 18) {
    line -= 4;
    heading = Math.max(16, heading - 4);
    name = Math.max(44, name - 4);
  }
  return { line, heading, name };
}

// Square owns every line: the crew can hide one, but the wording always comes from
// the item's modifier group, so nothing here is editable or invented.
function LineList({ lines, lineSize }) {
  return (
    <ul>
      {lines.map((line, i) => (
        <li key={line.id || i} className="flex items-start gap-2" style={{ fontSize: px(lineSize), lineHeight: 1.25 }}>
          <span
            className="flex-shrink-0"
            style={{ width: px(15), height: px(15), marginTop: px(7), backgroundColor: NAVY }}
          />
          <span className="flex-1 min-w-0">{line.text}</span>
        </li>
      ))}
    </ul>
  );
}

export default function PrintableBuildCards({ cards, onEditCard }) {
  return (
    <div id="print-sheet" className="bg-white text-black mx-auto print:shadow-none">
      <div className="overflow-x-auto print:overflow-visible">
        {cards.filter(card => card.on_sheet !== false).map(card => {
          // Hidden lines never print, and a card whose Square group is missing
          // prints nothing in that column — never a placeholder on paper.
          const inShake = card.in_shake.filter(line => !line.hidden);
          const toppings = card.toppings.filter(line => !line.hidden);
          const fit = fitCard({ ...card, in_shake: inShake, toppings });
          const sizes = card.sizes.filter(s => s.label || Number(s.upcharge) > 0);
          return (
            <section
              key={card.key}
              className="build-card-page bg-white text-black mx-auto mb-6 print:mb-0 shadow-float print:shadow-none"
              style={{ width: '11in' }}
            >
              {/* Header band */}
              <div
                className="relative flex flex-col justify-center px-10"
                style={{ height: px(330), backgroundColor: NAVY, WebkitTextFillColor: '#ffffff' }}
              >
                <span className="font-heading uppercase" style={{ fontSize: px(34), letterSpacing: px(11) }}>
                  Flavor Isle
                </span>
                <span className="font-heading uppercase" style={{ fontSize: px(118), lineHeight: 0.85 }}>
                  Build Cards
                </span>
                <span className="uppercase" style={{ fontSize: px(31), letterSpacing: px(2.4) }}>
                  Shake station · one card per build
                </span>
                <div className="absolute left-0 right-0 bottom-0" style={{ height: px(16), backgroundColor: CHERRY }}>
                  <span className="absolute left-0 top-0 bottom-0" style={{ width: '33%', backgroundColor: GOLD }} />
                  <span className="absolute top-0 bottom-0" style={{ left: '50%', width: '16%', backgroundColor: GREEN }} />
                </div>
              </div>

              {/* One card */}
              <div className="flex mx-auto mt-8" style={{ width: '10in', height: px(540) }}>
                <div
                  className="flex flex-1 min-w-0"
                  style={{ border: `${px(6)} solid ${NAVY}`, borderRadius: px(26), overflow: 'hidden', backgroundColor: '#ffffff' }}
                >
                  <div className="flex-shrink-0" style={{ width: px(30), backgroundColor: card.accent_color }} />
                  <div className="flex-1 min-w-0 flex flex-col px-8 py-6">
                    <div className="flex items-start justify-between gap-6">
                      <div className="min-w-0">
                        <div className="uppercase" style={{ fontSize: px(20), letterSpacing: px(3.6), color: '#6B7280' }}>
                          {card.kicker}
                        </div>
                        <Editable
                          as="h2"
                          className="font-heading uppercase leading-none"
                          style={{ fontSize: px(fit.name), color: NAVY }}
                          value={card.print_name}
                          onCommit={onEditCard && (v => onEditCard(card.key, 'print_name', v))}
                        />
                        <Editable
                          as="p"
                          style={{ fontSize: px(22), color: '#374151', marginTop: px(8) }}
                          value={card.tagline}
                          onCommit={onEditCard && (v => onEditCard(card.key, 'tagline', v))}
                        />
                      </div>
                      <div
                        className="flex-shrink-0 text-center"
                        style={{
                          backgroundColor: NAVY,
                          borderRadius: px(16),
                          padding: `${px(10)} ${px(20)}`,
                          WebkitTextFillColor: '#ffffff',
                        }}
                      >
                        <div className="font-heading" style={{ fontSize: px(52), lineHeight: 1 }}>
                          {`$${Number(card.price || 0).toFixed(2)}`}
                        </div>
                        {sizes.length > 0 && (
                          <div style={{ fontSize: px(18), marginTop: px(4) }}>
                            {sizes.map((s, i) => (
                              <span key={i}>
                                {i > 0 && ' · '}
                                {s.label}
                                {Number(s.upcharge) > 0 ? ` +$${Number(s.upcharge).toFixed(2)}` : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-6 flex-1 min-h-0 mt-4">
                      {/* IN THE SHAKE */}
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-heading uppercase"
                          style={{
                            fontSize: px(fit.heading),
                            letterSpacing: px(3.6),
                            color: NAVY,
                            borderBottom: `2px solid ${NAVY}`,
                            paddingBottom: px(4),
                            marginBottom: px(8),
                          }}
                        >
                          In the shake
                        </div>
                        <LineList lines={inShake} lineSize={fit.line} />
                      </div>

                      {/* ON TOP */}
                      <div className="flex-1 min-w-0">
                        <div
                          className="font-heading uppercase"
                          style={{
                            fontSize: px(fit.heading),
                            letterSpacing: px(3.6),
                            color: NAVY,
                            borderBottom: `2px solid ${NAVY}`,
                            paddingBottom: px(4),
                            marginBottom: px(8),
                          }}
                        >
                          On top
                        </div>
                        {card.not_topped ? (
                          <div style={{ backgroundColor: '#E5E7EB', borderRadius: px(14), padding: px(18) }}>
                            <div
                              className="font-heading uppercase"
                              style={{ fontSize: px(47), lineHeight: 1, color: '#374151' }}
                            >
                              Not topped
                            </div>
                            <div style={{ fontSize: px(26), color: '#4B5563', marginTop: px(6) }}>
                              Served bare, no toppings.
                            </div>
                          </div>
                        ) : (
                          <LineList lines={toppings} lineSize={fit.line} />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer band */}
              <div
                className="mt-8 flex flex-col"
                style={{ height: px(439.5), backgroundColor: NAVY, WebkitTextFillColor: CREAM, padding: px(28) }}
              >
                <div className="flex items-start gap-8 flex-1 min-h-0">
                  <div className="flex-1 min-w-0">
                    <div className="uppercase" style={{ fontSize: px(20), letterSpacing: px(3.6) }}>
                      Build order
                    </div>
                    <ol className="grid grid-cols-3 gap-x-6 gap-y-2 mt-2">
                      {BUILD_STEPS.map((step, i) => (
                        <li key={step} className="flex items-start gap-2" style={{ fontSize: px(26), lineHeight: 1.15 }}>
                          <span className="font-heading" style={{ minWidth: px(26) }}>{i + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <div
                    className="flex-shrink-0"
                    style={{ width: px(410), border: `${px(4)} dashed ${CREAM}`, borderRadius: px(14), padding: px(16) }}
                  >
                    <div className="uppercase" style={{ fontSize: px(20), letterSpacing: px(3.6) }}>
                      House portions
                    </div>
                    <div style={{ fontSize: px(26), whiteSpace: 'pre-line' }}>{card.house_portions}</div>
                  </div>
                </div>
                <div className="uppercase text-center" style={{ fontSize: px(24), letterSpacing: px(1.6) }}>
                  Every build starts on the cream base
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}