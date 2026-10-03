import React, { useState } from 'react';
import { Car, MapPin, StickyNote, CheckCircle2, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Curbside arrival screen — shown when a pickup customer taps "I'm Here".
// Collects vehicle details, confirms the parking zone, and takes special
// notes (extra ketchup packets, napkins, etc.) that Smashie relays to the
// kitchen in a clearly-marked notes section.

export default function CurbsideArrivalModal({ order, zoneLabel, onClose, onArrived }) {
  // Prefill from the vehicle details captured at checkout so the customer
  // doesn't have to retype them when they arrive.
  const [carColor, setCarColor] = useState(order?.arrival_details?.car_color || '');
  const [carMake, setCarMake] = useState(order?.arrival_details?.car_make || '');
  const [carModel, setCarModel] = useState(order?.arrival_details?.car_model || '');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await base44.functions.invoke('logCurbsideArrival', {
        order_id: order.id,
        zone: zoneLabel || '',
        car_color: carColor.trim(),
        car_make: carMake.trim(),
        car_model: carModel.trim(),
        notes: notes.trim(),
      });
      setDone(true);
      onArrived?.();
    } catch (err) {
      setError("Couldn't let the kitchen know — try again or hit the line at (270) 563-4618.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-float-lg max-h-[90vh] overflow-y-auto animate-float-up">
        {done ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} className="text-green-600" />
            </div>
            <h3 className="font-heading text-2xl text-obsidian-roast mb-2">We See You, Fam!</h3>
            <p className="font-body text-sm text-muted-foreground mb-2">
              The kitchen's been notified — someone's running your order out{zoneLabel ? ` to ${zoneLabel}` : ''}.
            </p>
            {notes.trim() && (
              <p className="font-body text-xs text-muted-foreground bg-muted/60 rounded-xl p-3 mt-3">
                Your notes made it to the crew: "{notes.trim()}"
              </p>
            )}
            <button onClick={onClose} className="btn-cherry chrome-hover px-8 py-3 text-sm mt-6 tap-44">
              Got It
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="px-6 py-5 bg-obsidian-roast text-white rounded-t-3xl sm:rounded-t-3xl flex items-start justify-between">
              <div>
                <h3 className="font-heading text-2xl leading-tight">I'm Here — Curbside</h3>
                <p className="font-body text-white/80 text-xs mt-1">Order #{order.order_number}</p>
              </div>
              <button type="button" onClick={onClose} className="p-2 -mr-2 -mt-1 text-white/80 hover:text-white tap-44">
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {/* Zone */}
              <div className="flex items-center gap-3 bg-muted/60 rounded-xl p-3">
                <MapPin size={18} className="text-midnight-cherry flex-shrink-0" />
                <p className="font-body text-sm text-obsidian-roast">
                  {zoneLabel ? <>Parked at <span className="font-semibold">{zoneLabel}</span></> : 'No zone selected — pick one on the map so we can find you faster.'}
                </p>
              </div>

              {/* Vehicle */}
              <div>
                <label className="flex items-center gap-2 text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">
                  <Car size={14} /> Your Vehicle
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={carColor}
                    onChange={(e) => setCarColor(e.target.value)}
                    placeholder="Color"
                    className="w-full px-3 py-3 border border-border rounded-xl bg-white font-body text-sm text-obsidian-roast focus:outline-none focus:border-midnight-cherry focus:ring-2 focus:ring-midnight-cherry/20 transition-all"
                  />
                  <input
                    type="text"
                    value={carMake}
                    onChange={(e) => setCarMake(e.target.value)}
                    placeholder="Make"
                    className="w-full px-3 py-3 border border-border rounded-xl bg-white font-body text-sm text-obsidian-roast focus:outline-none focus:border-midnight-cherry focus:ring-2 focus:ring-midnight-cherry/20 transition-all"
                  />
                  <input
                    type="text"
                    value={carModel}
                    onChange={(e) => setCarModel(e.target.value)}
                    placeholder="Model"
                    className="w-full px-3 py-3 border border-border rounded-xl bg-white font-body text-sm text-obsidian-roast focus:outline-none focus:border-midnight-cherry focus:ring-2 focus:ring-midnight-cherry/20 transition-all"
                  />
                </div>
              </div>

              {/* Special notes */}
              <div>
                <label className="flex items-center gap-2 text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">
                  <StickyNote size={14} /> Special Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Extra ketchup packets, extra napkins, sauce on the side…"
                  className="w-full px-4 py-3 border border-border rounded-xl bg-white font-body text-sm text-obsidian-roast focus:outline-none focus:border-midnight-cherry focus:ring-2 focus:ring-midnight-cherry/20 transition-all resize-none"
                />
                <p className="text-[11px] text-muted-foreground font-body mt-1">
                  These go straight to the kitchen with your arrival alert.
                </p>
              </div>

              {error && (
                <p className="font-body text-sm text-midnight-cherry bg-midnight-cherry/5 border border-midnight-cherry/20 rounded-xl p-3">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60 tap-44"
              >
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Letting the Kitchen Know…</>
                ) : (
                  <>Tell the Kitchen I'm Here</>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}