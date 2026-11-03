// The printed Build Cards poster (issue #148, PRE-PLAN v3.7): four cards to a
// page on an 11 × 17 sheet, each card carrying its own 1–6 build steps, with a
// shared base/thickness/milk band at the foot of every sheet. Section 6 of the
// plan is measured at 150 px/in, while the browser lays out at 96 px/in, so
// every measured value is multiplied by PX before use.
import React from 'react';

const PX = 96 / 150;
const px = (value) => `${Math.round(value * PX * 100) / 100}px`;

const NAVY = '#12233D';
const CHERRY = '#CC3300';
const GOLD = '#E9A53F';
const GREEN = '#7FBF6A';
const CREAM = '#FBF2E2';

const ANTON = "'Anton', 'Bebas Neue', sans-serif";
const BARLOW = "'BarlowBold', 'Barlow', sans-serif";

// Print faces for this sheet only: Anton for the display type, Barlow 700 for
// the spec-band labels and small caps.
const FONTS = "@import url('https://fonts.googleapis.com/css2?family=Anton&family=Barlow:wght@700&display=swap');";

const BUILD_STEPS = [
  'Milk first — amounts below',
  'One pump of syrup',
  'Add the mix-ins',
  'Add soft serve to the top',
  'Mix it',
  'Add the toppings',
];

const CARDS_PER_PAGE = 4;

const SPEC_ROWS = [
  { label: 'BASE', value: 'Vanilla soft serve or chocolate soft serve' },
  { label: 'THICKNESS', value: 'Regular · Thin · Thick' },
];

const MILK_ROWS = [
  { size: '14 OZ', regular: '1.5', thin: '2', thick: '0.75' },
  { size: '20 OZ', regular: '2.5', thin: '3', thick: '1.5' },
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

// Square owns every line: the crew can hide one, but the wording always comes
// from the item's modifier group, so nothing here is editable or invented.
function LineList({ lines }) {
  return (
    <ul>
      {lines.map((line, i) => (
        <li
          key={line.id || i}
          style={{ position: 'relative', paddingLeft: px(28), fontSize: px(27), lineHeight: 1, color: NAVY }}
        >
          <span
            style={{
              position: 'absolute',
              left: px(6),
              top: px(10),
              width: px(10),
              height: px(10),
              backgroundColor: CHERRY,
            }}
          />
          {line.text}
        </li>
      ))}
    </ul>
  );
}

function Panel({ title, children }) {
  return (
    <div
      className="flex-1 min-w-0"
      style={{
        backgroundColor: CREAM,
        border: `${px(2)} solid #E4D6BD`,
        borderRadius: px(10),
        padding: `${px(11)} ${px(16)}`,
      }}
    >
      <div
        className="uppercase"
        style={{ fontFamily: ANTON, fontSize: px(14), letterSpacing: px(2), color: '#8A5A1E', marginBottom: px(6) }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function BuildCard({ card, onEditCard }) {
  // Hidden lines never print. A card with no topping group is served bare, so
  // the ON TOP column always carries either the toppings or the bare block.
  const inShake = card.in_shake.filter(line => !line.hidden);
  const toppings = card.toppings.filter(line => !line.hidden);

  return (
    <article
      style={{
        display: 'flex',
        width: px(1575),
        height: px(475),
        backgroundColor: '#FFFDF7',
        border: `${px(4)} solid ${NAVY}`,
        borderRadius: px(18),
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="flex-shrink-0" style={{ width: px(20), backgroundColor: card.accent_color }} />
      <div
        className="flex-1 min-w-0 flex flex-col"
        style={{ padding: `${px(16)} ${px(24)} ${px(14)} ${px(38)}` }}
      >
        <div className="flex items-start justify-between" style={{ gap: px(20) }}>
          <div className="min-w-0">
            <div className="uppercase" style={{ fontSize: px(16), letterSpacing: px(4), color: '#6B7688' }}>
              {card.kicker}
            </div>
            <Editable
              as="h2"
              className="uppercase"
              style={{ fontFamily: ANTON, fontSize: px(60), lineHeight: 0.95, color: NAVY }}
              value={card.print_name}
              onCommit={onEditCard && (v => onEditCard(card.key, 'print_name', v))}
            />
            <Editable
              as="p"
              style={{ fontSize: px(22), color: '#3C4A5E', marginTop: px(8) }}
              value={card.tagline}
              onCommit={onEditCard && (v => onEditCard(card.key, 'tagline', v))}
            />
          </div>
          <div
            className="flex-shrink-0"
            style={{
              fontFamily: ANTON,
              fontSize: px(30),
              lineHeight: 1,
              color: NAVY,
              backgroundColor: '#FBF2E2',
              padding: `${px(6)} ${px(12)}`,
              borderRadius: px(8),
            }}
          >
            {`$${Number(card.price || 0).toFixed(2)}`}
          </div>
        </div>

        <div className="flex" style={{ gap: px(20), marginTop: px(10) }}>
          {/* IN THE SHAKE */}
          <Panel title="IN THE SHAKE">
            {inShake.length > 0 ? (
              <LineList lines={inShake} />
            ) : (
              <div style={{ fontSize: px(20), color: NAVY }}>See Square</div>
            )}
          </Panel>

          {/* ON TOP */}
          <Panel title="ON TOP">
            {card.not_topped ? (
              <>
                <div className="uppercase" style={{ fontFamily: ANTON, fontSize: px(34), lineHeight: 1, color: NAVY }}>
                  NOT TOPPED
                </div>
                <div style={{ fontSize: px(18), color: '#6B7688' }}>Serve it straight, no toppings.</div>
              </>
            ) : (
              <LineList lines={toppings} />
            )}
          </Panel>
        </div>

        {/* BUILD IT — 1 TO 6 */}
        <div style={{ marginTop: px(10), borderTop: `${px(2)} dashed #E0D2BB`, paddingTop: px(8) }}>
          <div
            className="uppercase"
            style={{
              fontFamily: BARLOW,
              fontWeight: 700,
              fontSize: px(13),
              letterSpacing: px(2.5),
              color: '#8A5A1E',
              marginBottom: px(6),
            }}
          >
            BUILD IT — 1 TO 6
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: px(18), rowGap: px(4) }}>
            {BUILD_STEPS.map((step, i) => (
              <div
                key={step}
                style={{ position: 'relative', paddingLeft: px(22), fontSize: px(13), lineHeight: 1.15, color: NAVY }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: px(16),
                    height: px(16),
                    borderRadius: '50%',
                    backgroundColor: CHERRY,
                    color: CREAM,
                    fontFamily: ANTON,
                    fontSize: px(11),
                    lineHeight: px(16),
                    textAlign: 'center',
                  }}
                >
                  {i + 1}
                </span>
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

function SpecBand() {
  return (
    <div
      style={{
        position: 'relative',
        width: px(1575),
        height: px(300),
        backgroundColor: NAVY,
        color: CREAM,
        padding: `${px(16)} ${px(30)} 0`,
        marginTop: px(22),
      }}
    >
      <div
        className="uppercase"
        style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: px(24), color: GOLD, marginBottom: px(8) }}
      >
        BASE, THICKNESS AND MILK — EVERY BLISS SHAKE
      </div>

      <div className="flex" style={{ gap: px(26) }}>
        <div className="flex-1 min-w-0">
          {SPEC_ROWS.map(row => (
            <div key={row.label} className="flex items-baseline" style={{ gap: px(14), marginBottom: px(8) }}>
              <span
                className="uppercase"
                style={{
                  minWidth: px(130),
                  fontFamily: BARLOW,
                  fontWeight: 700,
                  fontSize: px(14),
                  letterSpacing: px(2),
                  color: GOLD,
                }}
              >
                {row.label}
              </span>
              <span style={{ fontSize: px(18), color: CREAM }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div
          className="flex-shrink-0"
          style={{
            width: px(420),
            border: `${px(2)} dashed rgba(251,242,226,.45)`,
            borderRadius: px(10),
            padding: `${px(8)} ${px(16)}`,
          }}
        >
          <div
            className="grid uppercase"
            style={{
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              fontFamily: BARLOW,
              fontWeight: 700,
              fontSize: px(14),
              letterSpacing: px(1.6),
              color: GOLD,
            }}
          >
            <span />
            <span>REGULAR</span>
            <span>THIN</span>
            <span>THICK</span>
          </div>
          {MILK_ROWS.map(row => (
            <div
              key={row.size}
              className="grid"
              style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', fontSize: px(18), lineHeight: 1.3, color: CREAM }}
            >
              <span>{row.size}</span>
              <span>{row.regular}</span>
              <span>{row.thin}</span>
              <span>{row.thick}</span>
            </div>
          ))}
          <div
            className="uppercase"
            style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: px(15), color: GOLD, marginTop: px(6) }}
          >
            SYRUP · 1 PUMP
          </div>
        </div>
      </div>

      <div
        className="uppercase text-center"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: px(10),
          fontSize: px(15),
          letterSpacing: px(1.2),
          color: CREAM,
        }}
      >
        Flavor Isle · Smiths Grove, KY · 14 oz or 20 oz (+$.50)
      </div>
    </div>
  );
}

function SheetHeader() {
  return (
    <div
      className="relative flex flex-col justify-center"
      style={{ height: px(150), backgroundColor: NAVY, WebkitTextFillColor: '#ffffff', padding: `0 ${px(38)}` }}
    >
      <span className="font-heading uppercase" style={{ fontSize: px(28), letterSpacing: px(9) }}>
        Flavor Isle
      </span>
      <span style={{ fontFamily: ANTON, fontSize: px(66), lineHeight: 0.85 }} className="uppercase">
        Build Cards
      </span>
      <span className="uppercase" style={{ fontSize: px(22), letterSpacing: px(2.4) }}>
        Shake station · 14 oz or 20 oz · four cards per sheet
      </span>
      <div className="absolute left-0 right-0 bottom-0" style={{ height: px(16), backgroundColor: CHERRY }}>
        <span className="absolute left-0 top-0 bottom-0" style={{ width: '33%', backgroundColor: GOLD }} />
        <span className="absolute top-0 bottom-0" style={{ left: '50%', width: '16%', backgroundColor: GREEN }} />
      </div>
    </div>
  );
}

export default function PrintableBuildCards({ cards, onEditCard }) {
  const visible = (cards || []).filter(card => card.on_sheet !== false);
  const pages = [];
  for (let i = 0; i < visible.length; i += CARDS_PER_PAGE) {
    pages.push(visible.slice(i, i + CARDS_PER_PAGE));
  }

  return (
    <div id="print-sheet" className="bg-white text-black mx-auto print:shadow-none">
      <style>{FONTS}</style>
      <div className="overflow-x-auto print:overflow-visible">
        {pages.length === 0 ? (
          <section
            className="build-card-page bg-white text-black mx-auto mb-6 print:mb-0 shadow-float print:shadow-none"
            style={{ width: px(1650), padding: px(37) }}
          >
            <div style={{ fontSize: px(27), color: NAVY }}>No Bliss cards in Square right now.</div>
          </section>
        ) : (
          pages.map((pageCards, pageIndex) => (
            <section
              key={pageIndex}
              className="build-card-page bg-white text-black mx-auto mb-6 print:mb-0 shadow-float print:shadow-none"
              style={{ width: px(1650), padding: px(37) }}
            >
              <SheetHeader />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: px(1575),
                  gap: px(24),
                  marginTop: px(22),
                }}
              >
                {pageCards.map(card => (
                  <BuildCard key={card.key} card={card} onEditCard={onEditCard} />
                ))}
              </div>

              <SpecBand />
            </section>
          ))
        )}
      </div>
    </div>
  );
}