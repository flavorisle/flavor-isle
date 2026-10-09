import React, { useState, useEffect } from 'react';
import { Bike, Save, Check, Plus, Trash2 } from 'lucide-react';
import { getMenuSetting, setDeliveryTiers } from '@/lib/menuSettings';

// Admin editor for distance-based delivery pricing tiers.
// Each row = "up to X miles → $fee". The last tier's miles is the delivery
// range limit; addresses beyond it can't order delivery. Empty list = the
// flat Delivery Fee in Order Settings applies instead.
export default function DeliveryPricingTiers() {
  const [tiers, setTiers] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    getMenuSetting()
      .then(s => setTiers((s.delivery_tiers || []).map(t => ({ max_miles: t.max_miles, fee: t.fee }))))
      .catch(() => {});
  }, []);

  const updateTier = (idx, field, val) => {
    setTiers(prev => prev.map((t, i) => (i === idx ? { ...t, [field]: val } : t)));
  };

  const addTier = () => {
    const lastMiles = Number(tiers[tiers.length - 1]?.max_miles) || 0;
    setTiers(prev => [...prev, { max_miles: lastMiles + 3, fee: 3 }]);
  };

  const removeTier = (idx) => setTiers(prev => prev.filter((_, i) => i !== idx));

  const save = async () => {
    setSaving(true);
    try {
      const cleaned = tiers
        .map(t => ({ max_miles: Math.max(0, parseFloat(t.max_miles) || 0), fee: Math.max(0, parseFloat(t.fee) || 0) }))
        .filter(t => t.max_miles > 0)
        .sort((a, b) => a.max_miles - b.max_miles);
      await setDeliveryTiers(cleaned);
      setTiers(cleaned);
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pb-2 pt-4">
      <div className="card-diner p-6">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-midnight-cherry/10 flex items-center justify-center">
            <Bike size={22} className="text-midnight-cherry" />
          </div>
          <div>
            <h2 className="font-heading text-lg text-obsidian-roast">Delivery Pricing</h2>
            <p className="text-sm text-muted-foreground">Charge by distance from the store. The last tier is your delivery range limit.</p>
          </div>
        </div>

        {tiers.length === 0 && (
          <p className="text-sm text-muted-foreground mb-4">No distance tiers set — every delivery uses the flat Delivery Fee from Order Settings above.</p>
        )}

        <div className="space-y-2 mb-4">
          {tiers.map((tier, idx) => (
            <div key={idx} className="flex items-center gap-3 flex-wrap">
              <span className="text-sm text-muted-foreground w-14">{idx === 0 ? 'Up to' : 'Up to'}</span>
              <input
                type="number" min="0" step="0.5" value={tier.max_miles}
                onChange={e => updateTier(idx, 'max_miles', e.target.value)}
                className="w-24 px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
              />
              <span className="text-sm text-muted-foreground">miles →</span>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <input
                  type="number" min="0" step="0.25" value={tier.fee}
                  onChange={e => updateTier(idx, 'fee', e.target.value)}
                  className="w-24 pl-7 pr-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
                />
              </div>
              <span className="text-sm text-muted-foreground">delivery fee</span>
              <button onClick={() => removeTier(idx)} className="p-2 text-muted-foreground hover:text-destructive transition-colors tap-44" aria-label="Remove tier">
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-4 flex-wrap">
          <button onClick={addTier} className="inline-flex items-center gap-1.5 text-sm font-heading text-patina-mint hover:text-midnight-cherry transition-colors">
            <Plus size={15} /> Add Tier
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="btn-mint chrome-hover px-5 py-3 text-sm font-heading flex items-center gap-2 disabled:opacity-60"
          >
            {savedFlash ? <Check size={15} /> : <Save size={15} />}
            {savedFlash ? 'Saved' : 'Save Pricing'}
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">Distances are measured straight-line from the store. The same fees are charged online and quoted by Smashie on the phone. Addresses past the last tier are out of range on both.</p>
      </div>
    </div>
  );
}