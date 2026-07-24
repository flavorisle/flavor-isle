import React, { useState, useEffect } from 'react';
import { Clock, Check } from 'lucide-react';
import { getMenuSetting, setBusinessHours } from '@/lib/menuSettings';
import { DAY_KEYS, DAY_LABELS, DEFAULT_BUSINESS_HOURS } from '@/lib/businessHours';

export default function BusinessHoursSettings() {
  const [hours, setHours] = useState(DEFAULT_BUSINESS_HOURS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getMenuSetting().then(setting => {
      if (setting?.business_hours) setHours({ ...DEFAULT_BUSINESS_HOURS, ...setting.business_hours });
      setLoading(false);
    });
  }, []);

  const updateDay = (day, field, value) => {
    setHours(prev => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await setBusinessHours(hours);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8">
      <div className="card-diner p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-patina-mint/10 rounded-2xl flex items-center justify-center">
            <Clock size={18} className="text-patina-mint" />
          </div>
          <h2 className="font-heading text-lg text-obsidian-roast">Business Hours</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-5">These hours are displayed across the website — header, footer, contact, and store locator pages.</p>

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-gray-200 border-t-midnight-cherry rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="divide-y divide-border">
              {DAY_KEYS.map(day => {
                const d = hours[day];
                return (
                  <div key={day} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="font-heading text-sm text-obsidian-roast w-24">{DAY_LABELS[day]}</span>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!d.closed}
                        onChange={e => updateDay(day, 'closed', !e.target.checked)}
                        className="accent-[#C0392B] w-4 h-4"
                      />
                      Open
                    </label>
                    {!d.closed ? (
                      <div className="flex items-center gap-2 ml-auto">
                        <input
                          type="time"
                          value={d.open}
                          onChange={e => updateDay(day, 'open', e.target.value)}
                          className="px-3 py-2 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
                        />
                        <span className="text-muted-foreground text-sm">to</span>
                        <input
                          type="time"
                          value={d.close}
                          onChange={e => updateDay(day, 'close', e.target.value)}
                          className="px-3 py-2 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
                        />
                      </div>
                    ) : (
                      <span className="ml-auto text-sm text-muted-foreground italic">Closed</span>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading mt-5 flex items-center gap-2 disabled:opacity-60"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : saved ? (
                <><Check size={15} /> Saved</>
              ) : (
                'Save Hours'
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}