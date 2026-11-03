// The printed Build Cards poster (issue #148, PRE-PLAN v4): the crew picks the
// paper (8.5 × 11 or 11 × 17) and how many cards fit a sheet. Each card keeps
// its 1575-wide build, grows to whatever height its Square lines need (measured
// off-screen), and is then scaled whole into its slot so nothing is cut off. Cards
// print in the crew's saved order; unchecked cards are skipped. Section sizes
// are measured at 150 px/in, while the browser lays out at 96 px/in, so every
// measured value is multiplied by PX before use.
import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { orderCards, paperSpec } from '@/lib/buildCards';
import SquareBuildCard from '@/components/admin/SquareBuildCard';
import PageFooterBand from '@/components/admin/PageFooterBand';
import { footerGroupsFor } from '@/lib/buildCardContent';

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

// The header is sheet chrome; all recipe content is rendered verbatim from Square.
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
        Shake station
      </span>
      <div className="absolute left-0 right-0 bottom-0" style={{ height: px(16 * k), backgroundColor: CHERRY }}>
        <span className="absolute left-0 top-0 bottom-0" style={{ width: '33%', backgroundColor: GOLD }} />
        <span className="absolute top-0 bottom-0" style={{ left: '50%', width: '16%', backgroundColor: GREEN }} />
      </div>
    </div>
  );
}

export default function PrintableBuildCards({ cards, order = [], paper = 'letter', perPage = 3 }) {
  const spec = paperSpec(paper);
  const per = spec.perPage.includes(perPage) ? perPage : 3;
  const visible = useMemo(() => orderCards((cards || []).filter(card => card.on_sheet !== false), order), [cards, order]);

  const measureRefs = useRef({});
  const measured = useRef({});
  const [heights, setHeights] = useState({});

  // Every card is first drawn at full size off-screen so the sheet learns how
  // tall its lines really are. That measured height — not a fixed guess — is
  // what gets fitted to the page, so no ingredient line or build step is ever
  // cut off at the bottom of a card.
  useLayoutEffect(() => {
    let active = true;
    const measure = () => {
      if (!active) return;
      const next = {};
      visible.forEach(card => {
        const element = measureRefs.current[card.key];
        next[card.key] = element ? Math.max(CARD_H, Math.ceil(element.getBoundingClientRect().height / PX) + 4) : CARD_H;
      });
      if (JSON.stringify(next) !== JSON.stringify(measured.current)) {
        measured.current = next;
        setHeights(next);
      }
    };
    const observer = new ResizeObserver(measure);
    Object.values(measureRefs.current).filter(Boolean).forEach(element => observer.observe(element));
    measure();
    document.fonts.ready.then(measure);
    window.addEventListener('beforeprint', measure);
    return () => { active = false; observer.disconnect(); window.removeEventListener('beforeprint', measure); };
  }, [visible, paper, perPage]);

  // One column of `per` equal slots under the header band and above the footer
  // band, which carries the base and thickness shared by every Bliss.
  const contentWidth = spec.width - PAGE_PAD * 2;
  const slotsHeight = spec.height - PAGE_PAD * 2 - spec.header - PAGE_GAP * 2 - spec.spec;
  const slotHeight = (slotsHeight - SLOT_GAP * (per - 1)) / per;
  const pageHeight = pageCards => Math.max(CARD_H, ...pageCards.map(card => heights[card.key] || CARD_H));

  const pages = [];
  for (let i = 0; i < visible.length; i += per) {
    pages.push(visible.slice(i, i + per));
  }

  return (
    <div id="print-sheet" className="force-light bg-card text-foreground mx-auto print:shadow-none relative">
      <style>{FONTS}</style>
      {/* Off-screen full-size pass used only to measure the cards. */}
      <div
        aria-hidden="true"
        className="print:hidden"
        style={{
          position: 'absolute',
          left: px(-100000),
          top: 0,
          width: px(CARD_W),
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      >
        {visible.map(card => (
          <div key={card.key} ref={el => { measureRefs.current[card.key] = el; }}>
            <SquareBuildCard card={card} />
          </div>
        ))}
      </div>
      <div className="overflow-x-auto print:overflow-visible">
        {pages.length === 0 ? (
          <section
            className="build-card-page bg-white text-black mx-auto mb-6 print:mb-0 shadow-float print:shadow-none"
            style={{ width: px(spec.width), height: px(spec.height), padding: px(PAGE_PAD), boxSizing: 'border-box' }}
          >
            <div style={{ fontSize: px(27), color: NAVY }}>No Bliss cards in Square right now.</div>
          </section>
        ) : (
          pages.map((pageCards, pageIndex) => {
            const cardH = pageHeight(pageCards);
            // Width is fixed for every card; only the height it needs varies.
            const scale = contentWidth / CARD_W;
            return (
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
                      <div style={{ width: px(CARD_W * scale), height: px(cardH * scale), overflow: 'hidden' }}>
                        <div
                          style={{
                            width: px(CARD_W),
                            height: px(cardH),
                            transform: `scale(${scale})`,
                            transformOrigin: 'top left',
                          }}
                        >
                          <SquareBuildCard card={card} height={cardH} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <PageFooterBand groups={footerGroupsFor(pageCards)} px={px} height={spec.spec} />
              </section>
            );
          })
        )}
      </div>
    </div>
  );
}