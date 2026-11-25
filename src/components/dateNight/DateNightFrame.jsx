import React from 'react';
import '@/styles/dateNight.css';

// The 1964 diner frame around every Date Night for Two surface (issue #357): the
// neon sign, the EST. 1964 badge and the checkerboard band. The frame carries the
// styling only; the copy and the controls belong to each screen.
export default function DateNightFrame({ children }) {
  return (
    <div className="dn-frame force-light">
      <div className="dn-neon-wrap">
        <span className="dn-badge">Est. 1964</span>
        <p className="dn-neon">Date Night</p>
        <p className="dn-frame-tag">Two people, two sets of picks, one ticket paid once.</p>
      </div>
      <div className="dn-checker" aria-hidden="true" />
      <div className="dn-inner">{children}</div>
    </div>
  );
}