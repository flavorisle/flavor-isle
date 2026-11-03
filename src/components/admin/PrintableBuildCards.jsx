// The printed Build Cards poster (issue #148, PRE-PLAN v4): the crew picks the
// paper (8.5 × 11 or 11 × 17) and how many cards fit a sheet, and each card is
// scaled as a fixed 1575 × 475 block — never re-flowed — into its slot. Cards
// print in the crew's saved order; unchecked cards are skipped. Section sizes
// are measured at 150 px/in, while the browser lays out at 96 px/in, so every
// measured value is multiplied by PX before use.
import React from 'react';
import { orderCards, paperSpec } from '@/lib/buildCards';

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

const CARD_W = 1575;
const CARD_H = 475;
const PAGE_PAD = 37;
const PAGE_GAP = 22;
const SLOT_GAP = 24;

const BUILD_STEPS = [
  'Milk first — amounts below',
  'One pump of syrup',
  'Add the mix-ins',
  'Add soft serve to the top',
  'Mix it',
  'Add the toppings',
];

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

// Square owns the lines; the crew's added lines sit after them. Nothing here is
// invented — every line either comes from the item's modifier group or from the
// crew's print-only additions.
function LineList({ lines }) {
  // A long ingredient list breaks into two columns so the bigger type still
  // fits the fixed card height.
  return (
    <ul style={{ columns: lines.length > 6 ? 2 : 1, columnGap: px(20) }}>
      {lines.map((line, i) => (
        <li
          key={line.id || i}
          style={{
            position: 'relative',
            paddingLeft: px(30),
            marginBottom: px(2),
            fontSize: px(31),
            lineHeight: 1.05,
            color: NAVY,
            breakInside: 'avoid',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: px(6),
              top: px(11),
              width: px(11),
              height: px(11),
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
        style={{ fontFamily: ANTON, fontSize: px(16), letterSpacing: px(2), color: '#8A5A1E', marginBottom: px(7) }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function BuildCard({ card, onEditCard }) {
  // Hidden Square lines never print; crew additions always follow them.
  const squareIn = card.in_shake.filter(line => !line.hidden);
  const squareTop = card.not_topped ? [] : card.toppings.filter(line => !line.hidden);
  const inShake = [...squareIn, ...(card.extra_in || [])];
  const onTop = [...squareTop, ...(card.extra_top || [])];

  return (
    <article
      style={{
        display: 'flex',
        width: px(CARD_W),
        height: px(CARD_H),
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
            <div className="uppercase" style={{ fontSize: px(18), letterSpacing: px(4), color: '#6B7688' }}>
              {card.kicker}
            </div>
            <Editable
              as="h2"
              className="uppercase"
              style={{ fontFamily: ANTON, fontSize: px(64), lineHeight: 0.95, color: NAVY }}
              value={card.print_name}
              onCommit={onEditCard && (v => onEditCard(card.key, 'print_name', v))}
            />
            <Editable
              as="p"
              style={{ fontSize: px(25), color: '#3C4A5E', marginTop: px(8) }}
              value={card.tagline}
              onCommit={onEditCard && (v => onEditCard(card.key, 'tagline', v))}
            />
          </div>
          <div
            className="flex-shrink-0"
            style={{
              fontFamily: ANTON,
              fontSize: px(33),
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
              <div style={{ fontSize: px(23), color: NAVY }}>See Square</div>
            )}
          </Panel>

          {/* ON TOP — bare only when the card has no topping line at all. */}
          <Panel title="ON TOP">
            {onTop.length > 0 ? (
              <LineList lines={onTop} />
            ) : (
              <>
                <div className="uppercase" style={{ fontFamily: ANTON, fontSize: px(39), lineHeight: 1, color: NAVY }}>
                  NOT TOPPED
                </div>
                <div style={{ fontSize: px(21), color: '#6B7688' }}>Serve it straight, no toppings.</div>
              </>
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
              fontSize: px(15),
              letterSpacing: px(2.5),
              color: '#8A5A1E',
              marginBottom: px(6),
            }}
          >
            BUILD IT — 1 TO 6
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: px(18), rowGap: px(5) }}>
            {BUILD_STEPS.map((step, i) => (
              <div
                key={step}
                style={{ position: 'relative', paddingLeft: px(24), fontSize: px(15.5), lineHeight: 1.15, color: NAVY }}
              >
                <span
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    width: px(18),
                    height: px(18),
                    borderRadius: '50%',
                    backgroundColor: CHERRY,
                    color: CREAM,
                    fontFamily: ANTON,
                    fontSize: px(12),
                    lineHeight: px(18),
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

// The band shrinks with the paper, so every mark keeps its v3.7 proportions.
function SheetHeader({ spec, contentWidth }) {
  const k = Math.min(contentWidth / CARD_W, spec.header / 150);
  return (
    <div
      className="relative flex flex-col justify-center"
      style={{ height: px(spec.header), backgroundColor: NAVY, WebkitTextFillColor: '#ffffff', padding: `0 ${px(38 * k)}` }}
    >
      <span className="font-heading uppercase" style={{ fontSize: px(31 * k), letterSpacing: px(9 * k) }}>
        Flavor Isle
      </span>
      <span style={{ fontFamily: ANTON, fontSize: px(72 * k), lineHeight: 0.85 }} className="uppercase">
        Build Cards
      </span>
      <span className="uppercase" style={{ fontSize: px(25 * k), letterSpacing: px(2.4 * k) }}>
        Shake station · 14 oz or 20 oz
      </span>
      <div className="absolute left-0 right-0 bottom-0" style={{ height: px(16 * k), backgroundColor: CHERRY }}>
        <span className="absolute left-0 top-0 bottom-0" style={{ width: '33%', backgroundColor: GOLD }} />
        <span className="absolute top-0 bottom-0" style={{ left: '50%', width: '16%', backgroundColor: GREEN }} />
      </div>
    </div>
  );
}

function SpecBand({ spec, contentWidth }) {
  const k = Math.min(contentWidth / CARD_W, spec.spec / 300);
  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: px(spec.spec),
        backgroundColor: NAVY,
        color: CREAM,
        padding: `${px(16 * k)} ${px(30 * k)} 0`,
        marginTop: px(PAGE_GAP),
        overflow: 'hidden',
      }}
    >
      <div
        className="uppercase"
        style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: px(28 * k), color: GOLD, marginBottom: px(8 * k) }}
      >
        BASE, THICKNESS AND MILK — EVERY BLISS SHAKE
      </div>

      <div className="flex" style={{ gap: px(26 * k) }}>
        <div className="flex-1 min-w-0">
          {SPEC_ROWS.map(row => (
            <div key={row.label} className="flex items-baseline" style={{ gap: px(14 * k), marginBottom: px(8 * k) }}>
              <span
                className="uppercase"
                style={{
                  minWidth: px(130 * k),
                  fontFamily: BARLOW,
                  fontWeight: 700,
                  fontSize: px(17 * k),
                  letterSpacing: px(2 * k),
                  color: GOLD,
                }}
              >
                {row.label}
              </span>
              <span style={{ fontSize: px(21 * k), color: CREAM }}>{row.value}</span>
            </div>
          ))}
        </div>

        <div
          className="flex-shrink-0"
          style={{
            width: px(420 * k),
            border: `${px(2)} dashed rgba(251,242,226,.45)`,
            borderRadius: px(10),
            padding: `${px(8 * k)} ${px(16 * k)}`,
          }}
        >
          <div
            className="grid uppercase"
            style={{
              gridTemplateColumns: '1fr 1fr 1fr 1fr',
              fontFamily: BARLOW,
              fontWeight: 700,
              fontSize: px(16 * k),
              letterSpacing: px(1.6 * k),
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
              style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', fontSize: px(21 * k), lineHeight: 1.3, color: CREAM }}
            >
              <span>{row.size}</span>
              <span>{row.regular}</span>
              <span>{row.thin}</span>
              <span>{row.thick}</span>
            </div>
          ))}
          <div
            className="uppercase"
            style={{ fontFamily: BARLOW, fontWeight: 700, fontSize: px(18 * k), color: GOLD, marginTop: px(6 * k) }}
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
          bottom: px(10 * k),
          fontSize: px(17 * k),
          letterSpacing: px(1.2 * k),
          color: CREAM,
        }}
      >
        Flavor Isle · Smiths Grove, KY · 14 oz or 20 oz (+$.50)
      </div>
    </div>
  );
}

export default function PrintableBuildCards({ cards, order = [], paper = 'letter', perPage = 4, onEditCard }) {
  const spec = paperSpec(paper);
  const per = spec.perPage.includes(perPage) ? perPage : 4;
  const visible = orderCards((cards || []).filter(card => card.on_sheet !== false), order);

  // One column of `per` equal slots under the header band and above the spec
  // band. Each card keeps its 1575 × 475 build and is scaled to fit its slot,
  // centred, so a long card can never re-flow into a different design.
  const contentWidth = spec.width - PAGE_PAD * 2;
  const slotsHeight = spec.height - PAGE_PAD * 2 - spec.header - spec.spec - PAGE_GAP * 2;
  const slotHeight = (slotsHeight - SLOT_GAP * (per - 1)) / per;
  const scale = Math.min(contentWidth / CARD_W, slotHeight / CARD_H);

  const pages = [];
  for (let i = 0; i < visible.length; i += per) {
    pages.push(visible.slice(i, i + per));
  }

  return (
    <div id="print-sheet" className="bg-white text-black mx-auto print:shadow-none">
      <style>{FONTS}</style>
      <div className="overflow-x-auto print:overflow-visible">
        {pages.length === 0 ? (
          <section
            className="build-card-page bg-white text-black mx-auto mb-6 print:mb-0 shadow-float print:shadow-none"
            style={{ width: px(spec.width), height: px(spec.height), padding: px(PAGE_PAD), boxSizing: 'border-box' }}
          >
            <div style={{ fontSize: px(27), color: NAVY }}>No Bliss cards in Square right now.</div>
          </section>
        ) : (
          pages.map((pageCards, pageIndex) => (
            <section
              key={pageIndex}
              className="build-card-page bg-white text-black mx-auto mb-6 print:mb-0 shadow-float print:shadow-none"
              style={{
                width: px(spec.width),
                height: px(spec.height),
                padding: px(PAGE_PAD),
                boxSizing: 'border-box',
                overflow: 'hidden',
              }}
            >
              <SheetHeader spec={spec} contentWidth={contentWidth} />

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr',
                  rowGap: px(SLOT_GAP),
                  marginTop: px(PAGE_GAP),
                  height: px(slotsHeight),
                }}
              >
                {pageCards.map(card => (
                  <div
                    key={card.key}
                    style={{
                      height: px(slotHeight),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ width: px(CARD_W * scale), height: px(CARD_H * scale), overflow: 'hidden' }}>
                      <div
                        style={{
                          width: px(CARD_W),
                          height: px(CARD_H),
                          transform: `scale(${scale})`,
                          transformOrigin: 'top left',
                        }}
                      >
                        <BuildCard card={card} onEditCard={onEditCard} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <SpecBand spec={spec} contentWidth={contentWidth} />
            </section>
          ))
        )}
      </div>
    </div>
  );
}