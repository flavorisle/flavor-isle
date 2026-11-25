import React from 'react';
import { Link } from 'react-router-dom';

// The invite exists: hand the link to the phone's own share sheet, and keep it on
// screen so it can be copied or sent again (issue #357). No SMS and no email are
// sent by the site.
export default function DateNightInvitePanel({ invite, name2, onShare, onStartOver }) {
  return (
    <div className="dn-invite">
      <h3 className="dn-h">It&apos;s on its way</h3>
      <p className="dn-invite-copy">
        {name2 ? `${name2} opens this link` : 'Your date opens this link'}, picks their food, then one of you pays once.
      </p>
      <p className="dn-invite-link">{invite.url}</p>
      <div className="dn-invite-actions">
        <button type="button" className="dn-btn dn-btn-small" onClick={onShare}>
          Share the link
        </button>
        <Link to={`/date-night/pay/${invite.code}`} className="dn-btn dn-btn-small dn-btn-ghost">
          Open the payment screen
        </Link>
      </div>
      <button type="button" className="dn-invite-reset" onClick={onStartOver}>
        Start a different date night
      </button>
    </div>
  );
}