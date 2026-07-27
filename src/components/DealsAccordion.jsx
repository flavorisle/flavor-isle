import React, { useState } from 'react';

// Flavor Isle "Diner Deals" showcase accordion.
// Adapted from the Accordion 2 mockup — recolored to the brand
// (midnight-cherry card, cream-white text), retyped to the diner's
// display fonts, with photo reveals and a sparkle→minus toggle.
//
// The card palette is driven from --dsa-card / --dsa-text so the whole
// accordion recolors from one place if the brand tokens ever shift.
function SparkleToggle({ open }) {
  return (
    <span className="dsa-toggle" aria-hidden="true">
      <svg
        className={`dsa-toggle-sparkle ${open ? 'dsa-flat' : ''}`}
        viewBox="0 0 22 22"
        fill="none"
      >
        <path
          d="M8.71525 7.79567L9.25127 0.000158779L12.6051 0.210693L12.146 7.99L21.4773 8.5196L20.8582 12.2934L11.9092 12L11.3538 21.4282L7.79457 21.2054L8.43401 11.8864L0.04345 11.6107L-0.000109101 7.30066L8.71525 7.79567Z"
          fill="currentColor"
        />
      </svg>
      <svg
        className={`dsa-toggle-minus ${open ? 'dsa-drawn' : ''}`}
        viewBox="0 0 22 22"
        fill="none"
      >
        <path
          d="M-0.000109101 7.30066L8.71525 7.79567L12.146 7.99L21.4773 8.5196L20.8582 12.2934L11.9092 12L8.43401 11.8864L0.04345 11.6107Z"
          fill="currentColor"
        />
      </svg>
    </span>
  );
}

const DEALS = [
  {
    id: 'dessert',
    title: 'Sweet Treats',
    copy: 'Homemade baked-to-order chocolate brownie cake smothered in hot fudge, layered with whipped cream and chopped peanuts. A Flavor Isle classic.',
    image:
      'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/bb9b490bf_IMG_0371.png',
    alt: 'Hot fudge brownie dessert',
    nudge: false,
  },
  {
    id: 'burgers',
    title: 'Burger Deals',
    copy: 'Fresh, never-frozen beef hand-patted to order. Doubles, triples, and our signature Smash Stack — stacked with melty American cheese.',
    image:
      'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/56f93f003_IMG_0375.png',
    alt: 'Classic double cheeseburger',
    nudge: false,
  },
  {
    id: 'fries',
    title: 'Fresh Fries',
    copy: 'Golden, hand-cut crinkle fries seasoned with a pinch of salt and fried crisp to order — the side everyone raves about.',
    image:
      'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/c5a5ce796_IMG_0407.png',
    alt: 'Hand-cut crinkle fries',
    nudge: false,
  },
  {
    id: 'loaded',
    title: 'Loaded Sides',
    copy: 'Take those fries over the top — smothered in melted cheese, crumbled bacon, and a cool drizzle of house sauce. Loaded, layered, and ready to share.',
    image:
      'https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/d86dcab09_IMG_0409.png',
    alt: 'Loaded cheese and bacon fries',
    nudge: false,
  },
];

export default function DealsAccordion() {
  const [openId, setOpenId] = useState('dessert');

  return (
    <section className="dsa-section">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500&family=Inter:wght@400;500&display=swap');

        .dsa-section {
          container-type: inline-size;
          background: transparent;
          display: flex;
          justify-content: center;
          padding: clamp(24px, 5vw, 40px) 40px;
          box-sizing: border-box;
        }

        .dsa-card {
          width: 100%;
          max-width: 366px;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: var(--dsa-card);
          font-family: var(--dsa-body-font);
          border-radius: var(--radius);
        }

        .dsa-row {
          background: var(--dsa-card);
        }

        .dsa-divider {
          height: 1px;
          width: 100%;
          background: var(--dsa-text);
          opacity: 0.5;
        }

        .dsa-row-h {
          margin: 0;
        }

        .dsa-toggle-btn {
          display: flex;
          width: 100%;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 18px 20px;
          text-align: left;
          background: none;
          border: none;
          outline: none;
          cursor: pointer;
          color: var(--dsa-text);
        }

        .dsa-toggle-btn:focus-visible {
          outline: 2px solid var(--dsa-text);
          outline-offset: -2px;
        }

        .dsa-title {
          font-size: 16px;
          font-weight: 400;
          line-height: 0.99;
          word-break: break-word;
          letter-spacing: 0.01em;
        }

        .dsa-toggle {
          position: relative;
          display: block;
          flex-shrink: 0;
          width: 21px;
          height: 21px;
          color: var(--dsa-text);
        }

        .dsa-toggle svg {
          position: absolute;
          inset: 0;
          display: block;
          width: 100%;
          height: 100%;
        }

        .dsa-toggle-sparkle {
          transform: scaleY(1);
          opacity: 1;
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                      opacity 0.25s ease;
        }

        .dsa-toggle-minus {
          transform: scaleX(0);
          opacity: 0;
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
                      opacity 0.25s ease;
        }

        .dsa-toggle-sparkle.dsa-flat {
          transform: scaleY(0.12);
          opacity: 0;
        }

        .dsa-toggle-minus.dsa-drawn {
          transform: scaleX(1);
          opacity: 1;
        }

        .dsa-panel {
          display: grid;
          grid-template-rows: 0fr;
          overflow: hidden;
          transition: grid-template-rows 0.45s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dsa-row.dsa-open .dsa-panel {
          grid-template-rows: 1fr;
        }

        .dsa-panel-inner {
          overflow: hidden;
          min-height: 0;
        }

        .dsa-panel-content {
          display: flex;
          flex-direction: column;
          gap: 26px;
          padding: 7px 20px 30px;
        }

        .dsa-photo-wrap {
          display: flex;
          justify-content: center;
          overflow: hidden;
          width: 100%;
          height: 210px;
          clip-path: inset(0 0 100% 0);
          transition: clip-path 0.45s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .dsa-row.dsa-open .dsa-photo-wrap {
          clip-path: inset(0 0 0% 0);
        }

        .dsa-photo {
          display: block;
          height: 100%;
          width: auto;
          max-width: 100%;
          object-fit: contain;
        }

        .dsa-photo-drinks {
          transform: translateX(10px);
        }

        .dsa-body {
          margin: 0;
          font-family: var(--dsa-display-font);
          font-size: 28px;
          font-weight: 500;
          line-height: 1.1;
          color: var(--dsa-text);
        }

        @container (max-width: 419px) {
          .dsa-section {
            padding-left: 15px;
            padding-right: 15px;
          }
          .dsa-toggle {
            width: 17px;
            height: 17px;
          }
        }
      `}</style>

      <div
        className="dsa-card"
        style={{
          '--dsa-card': 'var(--midnight-cherry)',
          '--dsa-text': 'var(--cream-white)',
          '--dsa-body-font': 'var(--font-body)',
          '--dsa-display-font': 'var(--font-heading)',
        }}
      >
        {DEALS.map((deal, idx) => {
          const open = openId === deal.id;
          return (
            <React.Fragment key={deal.id}>
              {idx > 0 && <div className="dsa-divider" aria-hidden="true" />}
              <div className={`dsa-row ${open ? 'dsa-open' : ''}`}>
                <h3 className="dsa-row-h">
                  <button
                    type="button"
                    className="dsa-toggle-btn"
                    aria-expanded={open}
                    aria-controls={`dsa-p-${deal.id}`}
                    onClick={() => setOpenId(open ? null : deal.id)}
                  >
                    <span className="dsa-title">{deal.title}</span>
                    <SparkleToggle open={open} />
                  </button>
                </h3>
                <div
                  className="dsa-panel"
                  id={`dsa-p-${deal.id}`}
                  role="region"
                  aria-labelledby={`dsa-h-${deal.id}`}
                >
                  <div className="dsa-panel-inner">
                    <div className="dsa-panel-content">
                      <div className="dsa-photo-wrap">
                        <img
                          className={`dsa-photo ${deal.nudge ? 'dsa-photo-drinks' : ''}`}
                          src={deal.image}
                          alt={deal.alt}
                          loading="lazy"
                          decoding="async"
                        />
                      </div>
                      <p className="dsa-body">{deal.copy}</p>
                    </div>
                  </div>
                </div>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </section>
  );
}