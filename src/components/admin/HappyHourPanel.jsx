import React, { useState, useEffect } from 'react';
import { Clock, Save, Tag } from 'lucide-react';
import { getMenuSetting, setHappyHour, bustMenuSettingCache } from '@/lib/menuSettings';
import { isHappyHourActive, formatHappyHourWindow } from '@/lib/happyHour';
import { Switch } from '@/components/ui/switch';
import { toast } from '@/components/ui/use-toast';

// Admin panel for configuring the daily Happy Hour discount.
// Wesley can toggle it on/off, adjust the time window, change the discount
// percentage, and edit which Square item IDs are eligible — all without a
// rebuild. Default: ON, 2:00–6:00 PM, 50%, Classic Drinks.
export default function HappyHourPanel() {
  const [setting, setSetting] = useState(null);
  const [config, setConfig] = useState(null);
  const [saving, setSaving] = useState(false);
  const [itemIdInput, setItemIdInput] = useState('');

  useEffect(() => {
    getMenuSetting().then(s => {
      setSetting(s);
      const hh = s?.happy_hour || {};
      setConfig({
        active: hh.active !== false,
        start_time: hh.start_time || '14:00',
        end_time: hh.end_time || '18:00',
        discount_percent: hh.discount_percent || 50,
        square_item_ids: Array.isArray(hh.square_item_ids) && hh.square_item_ids.length > 0
          ? hh.square_item_ids
          : ['MTOVX3FLW3QYAZRHAXMZMWYN'],
        label: hh.label || 'Happy Hour — 50% off drinks',
      });
      setItemIdInput((hh.square_item_ids || ['MTOVX3FLW3QYAZRHAXMZMWYN']).join(', '));
    }).catch(() => {});
  }, []);

  if (!config) return null;

  const active = setting ? isHappyHourActive(setting) : false;

  const handleSave = async () => {
    setSaving(true);
    try {
      const ids = itemIdInput.split(',').map(s => s.trim()).filter(Boolean);
      const updated = await setHappyHour({ ...config, square_item_ids: ids });
      setSetting(updated);
      bustMenuSettingCache();
      toast({ title: 'Happy Hour settings saved', description: 'Changes are live immediately.' });
    } catch (err) {
      toast({ title: 'Save failed', description: err.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center gap-3 mb-2">
        <Clock size={22} className="text-midnight-cherry" />
        <h2 className="font-heading text-2xl text-obsidian-roast">Happy Hour</h2>
        {active && (
          <span className="text-xs font-heading bg-midnight-cherry text-white px-2.5 py-1 rounded-full animate-pulse">
            ACTIVE NOW
          </span>
        )}
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        Daily discount on drinks, auto-applied at checkout during the window. No code needed.
        {setting && ` Currently ${formatHappyHourWindow(setting)} daily.`}
      </p>

      <div className="card-diner p-5 space-y-5">
        {/* On/Off toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-heading text-sm text-obsidian-roast">Enable Happy Hour</p>
            <p className="text-xs text-muted-foreground">When off, no discount is applied.</p>
          </div>
          <Switch checked={config.active} onCheckedChange={v => setConfig({ ...config, active: v })} />
        </div>

        {/* Time window */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Start Time</label>
            <input
              type="time"
              value={config.start_time}
              onChange={e => setConfig({ ...config, start_time: e.target.value })}
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">End Time</label>
            <input
              type="time"
              value={config.end_time}
              onChange={e => setConfig({ ...config, end_time: e.target.value })}
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground -mt-2">Store-local time (America/Chicago). Daily, every day.</p>

        {/* Discount percent */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Discount Percent</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              max="100"
              value={config.discount_percent}
              onChange={e => setConfig({ ...config, discount_percent: Number(e.target.value) || 0 })}
              className="w-24 px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
            />
            <span className="text-sm text-muted-foreground">% off eligible drink items</span>
          </div>
        </div>

        {/* Square item IDs */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Eligible Square Item IDs
          </label>
          <input
            type="text"
            value={itemIdInput}
            onChange={e => setItemIdInput(e.target.value)}
            placeholder="MTOVX3FLW3QYAZRHAXMZMWYN"
            className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
          />
          <p className="text-xs text-muted-foreground mt-1">Comma-separated. Default: Classic Drinks (MTOVX3FLW3QYAZRHAXMZMWYN).</p>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading flex items-center gap-2 disabled:opacity-60"
          >
            <Save size={16} /> {saving ? 'Saving…' : 'Save Settings'}
          </button>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Tag size={12} /> Changes go live instantly — no rebuild needed.
          </span>
        </div>
      </div>
    </div>
  );
}