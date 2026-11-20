import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Navigation } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { visitorGeo } from '@/lib/visitorGeo';
import { setTravelerNote } from '@/lib/travelerNote';
import { base44 } from '@/api/base44Client';

// Issue #341 (E1) — Traveler Mode.
//
// One tap sets the order type to pickup and leaves a note that the customer is
// driving in. The cutoff line is the existing pickup cutoff logic (CartContext →
// getCutoffStatus), never an invented kitchen time; hours and wait wording are
// untouched.
//
// On the home page the strip only appears for a visitor who is plausibly out of
// town: a resolved region/country that is not Kentucky/US, otherwise a device
// timezone that is not the store's.
const STORE_TZ = 'America/Chicago';
const NOTE = 'Driving in off I-65 — I will be there shortly.';

export default function TravelerMode({ compact = false, requireOutOfTown = false }) {
  const navigate = useNavigate();
  const { setOrderType, cutoffStatus } = useCart();
  const [show, setShow] = useState(!requireOutOfTown);

  useEffect(() => {
    if (!requireOutOfTown) return;
    let alive = true;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    visitorGeo()
      .then((geo) => {
        if (!alive) return;
        const region = String(geo?.region || '').trim().toLowerCase();
        const country = String(geo?.country || '').trim().toLowerCase();
        if (region) setShow(!(region === 'kentucky' || region === 'ky'));
        else if (country) setShow(country !== 'united states');
        else setShow(tz !== STORE_TZ);
      })
      .catch(() => { if (alive) setShow(tz !== STORE_TZ); });
    return () => { alive = false; };
  }, [requireOutOfTown]);

  if (!show) return null;

  const pickupClosed = cutoffStatus?.pickup === true;
  const cutoffMins = cutoffStatus?.pickupCutoff;
  const cutoffLine = pickupClosed
    ? 'Pickup ordering has closed for today.'
    : `Pickup orders close ${cutoffMins} min before we close.`;

  const start = () => {
    setOrderType('pickup');
    setTravelerNote(NOTE);
    base44.analytics.track({
      eventName: 'traveler_mode_order_clicked',
      properties: { placement: compact ? 'home' : 'i65_page' },
    });
    navigate('/menu');
  };

  if (compact) {
    return (
      <section className="bg-patina-mint text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <Navigation size={18} className="text-smashie-yellow flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-heading text-base sm:text-lg leading-tight">
                On I-65? Exit 38, 0.7 mi. Order now and it is ready when you park.
              </p>
              <p className="text-white/75 text-xs mt-0.5">{cutoffLine}</p>
            </div>
          </div>
          <button
            onClick={start}
            disabled={pickupClosed}
            className="btn-yellow chrome-hover px-5 py-2.5 text-sm font-heading inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
          >
            Order for pickup <ArrowRight size={15} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-midnight-cherry text-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-7 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div>
          <p className="font-heading text-xs uppercase tracking-[0.25em] text-white/80 flex items-center gap-2">
            <Navigation size={14} aria-hidden="true" /> Traveler Mode
          </p>
          <p className="font-heading text-2xl sm:text-3xl leading-tight mt-1.5">
            On I-65? Exit 38, 0.7 mi. Order now and it is ready when you park.
          </p>
          <p className="text-white/80 text-sm mt-1.5">{cutoffLine}</p>
        </div>
        <button
          onClick={start}
          disabled={pickupClosed}
          className="btn-yellow chrome-hover px-7 py-3.5 text-sm font-heading inline-flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          Order for pickup <ArrowRight size={16} />
        </button>
      </div>
    </section>
  );
}