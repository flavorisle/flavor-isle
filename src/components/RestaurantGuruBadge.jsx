// Restaurant Guru 2026 "Best burgers" ribbon award badge.
// Vendor design (awards.infcdn.net, 2026 "circle v2" ribbon) rebuilt as JSX so the
// markup stays React-owned: no dangerouslySetInnerHTML, and every link carries
// target="_blank" + rel="noopener noreferrer" so the award cannot navigate the
// menu tab. The vendor stylesheet only declares the three Akrobat @font-face
// faces, so it is pulled in once, and only on a page that actually shows a badge.
import React, { useEffect, useId } from 'react';

const AWARD_CSS = 'https://awards.infcdn.net/2026_new/circle_v2.css';
const LISTING_URL = 'https://restaurantguru.com/Flavor-Isle-Smiths-Grove';
const VENDOR_URL = 'https://restaurantguru.com';
const RIBBON_BG = 'https://awards.infcdn.net/img/bg.svg';

const AKROBAT_BOLD = "'Akrobat Bold', 'Helvetica Neue', 'Arial', sans-serif";
const AKROBAT_BLACK = "'Akrobat Black', 'Helvetica Neue', 'Arial', sans-serif";
const AKROBAT_REGULAR = "'Akrobat Regular', 'Helvetica Neue', 'Arial', sans-serif";

export default function RestaurantGuruBadge() {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const headingArc = `rg26-heading-arc-${uid}`;
  const subArc = `rg26-subheading-arc-${uid}`;

  // Keep the vendor stylesheet to one per page no matter how many badges render.
  useEffect(() => {
    const id = 'rg26-award-css';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href = AWARD_CSS;
    document.head.appendChild(link);
  }, []);

  const openListing = (event) => {
    if (event.target.closest && event.target.closest('a')) return;
    window.open(LISTING_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      id="rg26-circle-r-ribbon"
      className="rg26-rg-award-lang-en_US"
      onClick={openListing}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.open(LISTING_URL, '_blank', 'noopener,noreferrer');
        }
      }}
      role="link"
      tabIndex={0}
      aria-label="Restaurant Guru 2026 Best Burgers award for Flavor Isle"
      style={{
        cursor: 'pointer',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        padding: 0,
        maxWidth: '174px',
        minWidth: '174px',
        height: '135px',
        font: `400 10px/normal ${AKROBAT_BOLD}`,
        alignItems: 'center',
        textAlign: 'center',
        color: '#000',
        textShadow: 'none',
        background: `url(${RIBBON_BG}) no-repeat`,
        boxSizing: 'border-box',
      }}
    >
      {/* Top arc: the "Best burgers" heading */}
      <div
        className="rg26-r-ribbon_ahead"
        style={{
          transform: 'rotate(-11deg)',
          position: 'absolute',
          zIndex: 4,
          top: '-7px',
          left: '6px',
          letterSpacing: '0.2px',
          padding: 0,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="160px"
          height="160px"
          viewBox="0 0 160 160"
          style={{ width: '160px', height: '160px', marginTop: 0 }}
        >
          <defs>
            <path id={headingArc} d="M 30 80 a 50 50 0 1 1 100 0" />
          </defs>
          <text
            className="rg26-r-ribbon_ahead-heading"
            fill="#000"
            textAnchor="middle"
            style={{
              fontSize: '14px',
              fontFamily: AKROBAT_BOLD,
              lineHeight: 1,
              textTransform: 'uppercase',
            }}
          >
            <textPath startOffset="50%" href={`#${headingArc}`}>
              Best burgers
            </textPath>
          </text>
        </svg>
      </div>

      <p
        className="rg26-r-ribbon_year"
        style={{
          color: '#000',
          width: '140px',
          font: `22px/normal ${AKROBAT_BLACK}`,
          fontStyle: 'italic',
          transform: 'rotate(-12deg)',
          position: 'absolute',
          top: '41px',
          left: '12px',
          letterSpacing: '0.6px',
          textAlign: 'center',
          padding: 0,
          margin: 0,
        }}
      >
        2026
      </p>

      <a
        href={LISTING_URL}
        className="rg26-r-ribbon_title"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          textTransform: 'uppercase',
          color: '#fff',
          width: '140px',
          fontSize: '16px',
          lineHeight: 'normal',
          fontFamily: AKROBAT_BOLD,
          fontStyle: 'italic',
          transform: 'rotate(-12deg)',
          position: 'absolute',
          zIndex: 5,
          top: '72px',
          left: '12px',
          letterSpacing: '0.4px',
          textAlign: 'center',
          whiteSpace: 'normal',
          padding: 0,
          margin: 0,
          textDecoration: 'none',
          borderBottom: 'none',
          boxShadow: 'none',
        }}
      >
        Flavor Isle
      </a>

      {/* Bottom arc: "Restaurant Guru" */}
      <div
        className="rg26-r-ribbon_ahead rg26-r-ribbon_ahead-bottom"
        style={{
          top: 'auto',
          bottom: '-14px',
          left: '26px',
          letterSpacing: '0.3px',
          transform: 'rotate(-13deg)',
          height: '100%',
          maxWidth: '100%',
          padding: 0,
          position: 'absolute',
          zIndex: 4,
        }}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="120px"
          height="120px"
          viewBox="0 0 120 120"
          style={{ width: '120px', height: '120px', marginTop: 0 }}
        >
          <defs>
            <path id={subArc} d="M 12 60 a 48 48 0 0 0 96 0" />
          </defs>
          <text
            className="rg26-r-ribbon_ahead-subh"
            fill="#000"
            textAnchor="middle"
            style={{
              font: `12px/1 ${AKROBAT_REGULAR}`,
              textTransform: 'uppercase',
              letterSpacing: 'normal',
            }}
          >
            <textPath startOffset="50%" href={`#${subArc}`}>
              <a
                href={VENDOR_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  font: `12px/1 ${AKROBAT_REGULAR}`,
                  textTransform: 'uppercase',
                  letterSpacing: '0.3px',
                  textDecoration: 'none',
                  borderBottom: 'none',
                  boxShadow: 'none',
                  padding: 0,
                  margin: 0,
                }}
              >
                Restaurant Guru
              </a>
            </textPath>
          </text>
        </svg>
      </div>
    </div>
  );
}