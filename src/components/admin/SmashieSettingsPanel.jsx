import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bot, Save, Loader2, Check } from 'lucide-react';

// Edits the single SmashieSettings record. These values are read at runtime by
// the Twilio webhooks (greeting + toggles) and the order-status sync (SMS
// status-update toggle), so changes here take effect immediately.
export default function SmashieSettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const load = async () => {
    try {
      const all = await base44.entities.SmashieSettings.list();
      if (all && all.length > 0) {
        setSettings(all[0]);
      } else {
        setSettings({
          greeting: "Hey there, welcome to Flavor Isle! This is Smashie. What can I get started for you today?",
          sms_status_updates_enabled: true,
          sms_auto_reply_enabled: true,
          voice_ordering_enabled: true,
          personality_notes: "",
        });
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { load(); }, []);

  const update = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      if (settings.id) {
        await base44.entities.SmashieSettings.update(settings.id, {
          greeting: settings.greeting,
          sms_status_updates_enabled: settings.sms_status_updates_enabled,
          sms_auto_reply_enabled: settings.sms_auto_reply_enabled,
          voice_ordering_enabled: settings.voice_ordering_enabled,
          personality_notes: settings.personality_notes,
        });
      } else {
        const created = await base44.entities.SmashieSettings.create({
          greeting: settings.greeting,
          sms_status_updates_enabled: settings.sms_status_updates_enabled,
          sms_auto_reply_enabled: settings.sms_auto_reply_enabled,
          voice_ordering_enabled: settings.voice_ordering_enabled,
          personality_notes: settings.personality_notes,
        });
        setSettings(created);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); }
    setSaving(false);
  };

  if (!settings) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting */}
      <div className="card-diner p-5">
        <div className="flex items-center gap-2 mb-3">
          <Bot size={18} className="text-midnight-cherry" />
          <h3 className="font-heading text-obsidian-roast">Smashie's Greeting</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">The first thing Smashie says on a phone call or when replying to an SMS.</p>
        <textarea
          value={settings.greeting || ''}
          onChange={e => update('greeting', e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-white rounded-xl text-sm border border-border focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 resize-none"
        />
      </div>

      {/* Toggles */}
      <div className="card-diner p-5 space-y-4">
        <h3 className="font-heading text-obsidian-roast">Automation Toggles</h3>

        <Toggle
          label="SMS Order Status Updates"
          description="Send customers automated texts when their order is confirmed, preparing, ready, and completed."
          checked={settings.sms_status_updates_enabled}
          onChange={v => update('sms_status_updates_enabled', v)}
        />
        <Toggle
          label="SMS Auto-Reply"
          description="Let Smashie automatically answer incoming text messages."
          checked={settings.sms_auto_reply_enabled}
          onChange={v => update('sms_auto_reply_enabled', v)}
        />
        <Toggle
          label="Voice Call Ordering"
          description="Let Smashie answer inbound phone calls and take orders by voice."
          checked={settings.voice_ordering_enabled}
          onChange={v => update('voice_ordering_enabled', v)}
        />
      </div>

      {/* Personality notes */}
      <div className="card-diner p-5">
        <h3 className="font-heading text-obsidian-roast mb-2">Personality Notes</h3>
        <p className="text-xs text-muted-foreground mb-3">Quick reference notes about Smashie's tone and persona for your team.</p>
        <textarea
          value={settings.personality_notes || ''}
          onChange={e => update('personality_notes', e.target.value)}
          rows={4}
          placeholder="e.g. Keep it casual and energetic. Emphasize fresh never-frozen burgers and hand-spun shakes…"
          className="w-full px-4 py-3 bg-white rounded-xl text-sm border border-border focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 resize-none"
        />
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading flex items-center gap-2 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
          {saving ? 'Saving…' : saved ? 'Saved!' : 'Save Settings'}
        </button>
        {saved && <span className="text-sm text-patina-mint font-heading">Changes are live.</span>}
      </div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div className="flex-1">
        <p className="font-heading text-sm text-obsidian-roast">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-midnight-cherry' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}