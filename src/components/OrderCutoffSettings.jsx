import React, { useState, useEffect } from 'react';
import { Clock, Save, Check } from 'lucide-react';
import { getMenuSetting, setOrderCutoffs } from '@/lib/menuSettings';

export default function OrderCutoffSettings() {
  const [closingTime, setClosingTime] = useState('20:00');
  const [deliveryCutoff, setDeliveryCutoff] = useState(30);
  const [pickupCutoff, setPickupCutoff] = useState(15);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    getMenuSetting()
      .then(s => {
        if (s.closing_time) setClosingTime(s.closing_time);
        if (s.delivery_cutoff_minutes != null) setDeliveryCutoff(s.delivery_cutoff_minutes);
        if (s.pickup_cutoff_minutes != null) setPickupCutoff(s.pickup_cutoff_minutes);
        if (s.delivery_fee != null) setDeliveryFee(s.delivery_fee);
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      await setOrderCutoffs({
        closingTime,
        deliveryCutoff: Math.max(0, parseInt(deliveryCutoff) || 0),
        pickupCutoff: Math.max(0, parseInt(pickupCutoff) || 0),
        deliveryFee: Math.max(0, parseFloat(deliveryFee) || 0),
      });
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-2">
      <div className="card-diner p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-patina-mint/10 flex items-center justify-center">
            <Clock size={22} className="text-patina-mint" />
          </div>
          <div>
            <h2 className="font-heading text-lg text-obsidian-roast">Order Settings</h2>
            <p className="text-sm text-muted-foreground">Cutoff times and delivery fees for online orders.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Closing Time</label>
            <input
              type="time"
              value={closingTime}
              onChange={e => setClosingTime(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Delivery Cutoff (min before close)</label>
            <input
              type="number"
              min="0"
              value={deliveryCutoff}
              onChange={e => setDeliveryCutoff(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Pickup Cutoff (min before close)</label>
            <input
              type="number"
              min="0"
              value={pickupCutoff}
              onChange={e => setPickupCutoff(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Delivery Fee ($)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={deliveryFee}
              onChange={e => setDeliveryFee(e.target.value)}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 mt-4 flex-wrap">
          <p className="text-xs text-muted-foreground">Set the delivery fee to 0 for free delivery. Dine-in orders follow the pickup cutoff.</p>
          <button
            onClick={save}
            disabled={saving}
            className="btn-mint chrome-hover px-5 py-3 text-sm font-heading flex items-center gap-2 disabled:opacity-60"
          >
            {savedFlash ? <Check size={15} /> : <Save size={15} />}
            {savedFlash ? 'Saved' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}