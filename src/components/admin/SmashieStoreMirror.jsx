import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Phone, ArrowUpRight, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Read-only mirror of what Smashie's phone line is doing right now. It reports
// the same unified store state the phone itself reads, so the crew can confirm
// at a glance that a switch in Store Settings reached the phone. Nothing here
// edits anything — every value is changed in Store Settings.
function tierSummary(state) {
  const tiers = state.deliveryTiers || [];
  if (!tiers.length) return `flat $${Number(state.flatDeliveryFee || 0).toFixed(2)}`;
  return tiers.map(t => `up to ${t.max_miles} mi $${Number(t.fee).toFixed(2)}`).join(', ');
}

export default function SmashieStoreMirror() {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    base44.functions.invoke('getStoreStateForAdmin', {})
      .then((res) => { if (active) setData(res?.data || null); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  const state = data?.state;
  const phone = data?.phoneStatus;

  return (
    <div className="card-diner p-5">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <Phone size={18} className="text-midnight-cherry" />
          <h3 className="font-heading text-obsidian-roast">What Smashie's phone line is doing right now</h3>
        </div>
        <Link
          to="/admin/store-settings"
          className="inline-flex items-center gap-1.5 text-xs font-heading text-patina-mint hover:text-midnight-cherry transition-colors"
        >
          Edit in Store Settings <ArrowUpRight size={13} />
        </Link>
      </div>

      {failed && <p className="text-xs text-destructive">Could not read the live store state just now.</p>}
      {!data && !failed && (
        <p className="text-xs text-muted-foreground flex items-center gap-2">
          <Loader2 size={13} className="animate-spin" /> Checking the phone line…
        </p>
      )}

      {state && (
        <dl className="text-xs space-y-1.5">
          <Row label="Smashie sees">
            {phone?.open ? 'STORE STATUS: OPEN' : 'STORE STATUS: CLOSED'}
            {phone?.message ? ` — ${phone.message}` : ''}
          </Row>
          <Row label="Ordering">
            {state.orderingEnabled ? 'On for website + phone' : `Off — "${state.orderingClosedMessage}"`}
          </Row>
          <Row label="Delivery">
            {state.deliveryEnabled
              ? `Available — ${state.maxMiles ? `within ${state.maxMiles} miles` : 'no mileage limit'}, ${tierSummary(state)}`
              : 'Paused — pickup or dine-in only'}
          </Row>
          <Row label="Today's hours">
            {state.closure.active
              ? `Closed — ${state.closure.message}`
              : `Last orders at ${state.effectiveCloseToday}${state.earlyCloseToday ? ' (early close)' : ''}`}
          </Row>
          <Row label="Notice">
            {state.activeNotice?.active ? `"${state.activeNotice.message}" (${state.activeNotice.level})` : 'None'}
          </Row>
        </dl>
      )}
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex gap-2">
      <dt className="font-semibold text-muted-foreground w-28 flex-shrink-0">{label}</dt>
      <dd className="text-obsidian-roast">{children}</dd>
    </div>
  );
}