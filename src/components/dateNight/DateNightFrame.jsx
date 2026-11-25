import React from 'react';
import '@/styles/dateNight.css';

// The v5 diner frame around every Date Night surface (issue #358): the neon
// header band, the EST. 1964 badge, the checkerboard floor band and the cream
// paper. The frame carries the styling only; the copy and the controls belong
// to each screen.
export default function DateNightFrame({
  children,
  eyebrow = 'Smiths Grove, Kentucky',
  forTwo = false,
  lede = 'Two people, two sets of picks, one ticket paid once.',
}) {
  return (
    <div className="dn-frame force-light">
      <div className="dn-neon-wrap">
        <span className="dn-badge">Est. 1964</span>
        <p className="dn-eyebrow">{eyebrow}</p>
        <p className="dn-neon">Date Night</p>
        {forTwo && <p className="dn-fortwo">For Two</p>}
        <p className="dn-frame-tag">{lede}</p>
      </div>
      <div className="dn-checker" aria-hidden="true" />
      <div className="dn-inner">{children}</div>
    </div>
  );
}