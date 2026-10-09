import React, { useState, useEffect } from 'react';
import { Clock, Save, Check, Truck } from 'lucide-react';
import { getMenuSetting, setOrderCutoffs, setDeliveryEnabled } from '@/lib/menuSettings';

export default function OrderCutoffSettings() {
  const [closingTime, setClosingTime] = useState('20:00');
  const [deliveryCutoff, setDeliveryCutoff] = useState(30);
  const [pickupCutoff, setPickupCutoff] = useState(15);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [deliveryEnabled, setDeliveryEnabledState] = useState(true);
  const [togglingDelivery, setTogglingDelivery] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    getMenuSetting()
      .then(s => {
        if (s.closing_time) setClosingTime(s.closing_time);
        if (s.delivery_cutoff_minutes != null) setDeliveryCutoff(s.delivery_cutoff_minutes);
        if (s.pickup_cutoff_minutes != null) setPickupCutoff(s.pickup_cutoff_minutes);
        if (s.delivery_fee != null) setDeliveryFee(s.delivery_fee);
        if (s.delivery_enabled != null) setDeliveryEnabledState(s.delivery_enabled);
      })
      .catch(() => {});
  }, []);

  const toggleDelivery = async (enabled) => {
    setTogglingDelivery(true);
    try {
      const updated = await setDeliveryEnabled(enabled);
      setDeliveryEnabledState(updated.delivery_enabled !== false);
    } finally {
      setTogglingDelivery(false);
    }
  };

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
            <p className="text-sm text-muted-foreground">Cutoff times and delivery fees. Applies to website checkout and Smashie's phone orders.</p>
          </div>
        </div>

        {/* Delivery pause toggle — when off, the Delivery order type is hidden
            from customers regardless of hours, and anyone already on delivery
            is moved back to pickup. */}
        <div className={`rounded-2xl border p-4 mb-4 flex items-center justify-between gap-4 ${deliveryEnabled ? 'bg-patina-mint/5 border-patina-mint/20' : 'bg-midnight-cherry/5 border-midnight-cherry/20'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${deliveryEnabled ? 'bg-patina-mint/10' : 'bg-midnight-cherry/10'}`}>
              <Truck size={18} className={deliveryEnabled ? 'text-patina-mint' : 'text-midnight-cherry'} />
            </div>
            <div>
              <p className="font-heading text-sm text-obsidian-roast">
                Delivery {deliveryEnabled ? 'Available' : 'Paused'}
              </p>
              <p className="text-xs text-muted-foreground">
                {deliveryEnabled
                  ? 'Customers can place delivery orders during open hours.'
                  : 'Delivery is turned off — customers can still pick up or dine in.'}
              </p>
            </div>
          </div>
          <button
            onClick={() => toggleDelivery(!deliveryEnabled)}
            disabled={togglingDelivery}
            role="switch"
            aria-checked={deliveryEnabled}
            aria-label={deliveryEnabled ? 'Pause delivery' : 'Resume delivery'}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors disabled:opacity-60 flex-shrink-0 ${deliveryEnabled ? 'bg-patina-mint' : 'bg-muted-foreground/30'}`}
          >
            <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${deliveryEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
          </button>
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