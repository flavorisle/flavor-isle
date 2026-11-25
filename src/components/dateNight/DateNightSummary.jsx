import React from 'react';
import { Heart } from 'lucide-react';

// The line under the two name fields (issue #358): first name, the burger and
// shake they picked, a heart, then the other person and what they have so far.
export default function DateNightSummary({ name1, burger, shake, name2, partnerLine }) {
  return (
    <div className="dn2-summary">
      <div className="dn2-summary-side">
        <span className="dn2-summary-name">{name1 || 'Your name'}</span>
        <span className="dn2-summary-dot" aria-hidden="true">·</span>
        <span className="dn2-summary-item">{burger ? burger.name : 'pick a burger'}</span>
        <span className="dn2-summary-dot" aria-hidden="true">·</span>
        <span className="dn2-summary-item">{shake ? shake.name : 'pick a shake'}</span>
      </div>

      <Heart className="dn2-heart" size={22} aria-hidden="true" />

      <div className="dn2-summary-side">
        <span className="dn2-summary-name">{name2 || 'Your date'}</span>
        <span className="dn2-summary-dot" aria-hidden="true">·</span>
        <span className="dn2-summary-item">{partnerLine || 'picking next'}</span>
      </div>
    </div>
  );
}