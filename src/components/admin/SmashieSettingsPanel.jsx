import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Bot, Save, Loader2, Check, Facebook } from 'lucide-react';
import SmashieAbilities from './SmashieAbilities';
import SmashieKnowledge, { INITIAL_TOPICS } from './SmashieKnowledge';
import SmashieToolInventory from './SmashieToolInventory';

// Edits the single SmashieSettings record. These values are read at runtime by
// the Twilio webhooks (greeting + toggles) and the order-status sync (SMS
// status-update toggle), so changes here take effect immediately.
export default function SmashieSettingsPanel() {
  const [settings, setSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const all = await base44.entities.SmashieSettings.list();
      if (all && all.length > 0) {
        setSettings({ ...all[0], knowledge_topics: all[0].knowledge_topics ?? INITIAL_TOPICS });
      } else {
        setSettings({
          greeting: "Hey there, welcome to Flavor Isle! This is Smashie. What can I get started for you today?",
          sms_status_updates_enabled: true,
          sms_auto_reply_enabled: true,
          voice_ordering_enabled: true,
          realtime_sip_enabled: false,
          sip_transfer_target: "",
          personality_notes: "",
          phone_intro: "",
          capabilities: {},
          knowledge_topics: INITIAL_TOPICS,
        });
      }
    } catch (e) { console.error(e); setError('Could not load Smashie’s settings.'); }
  };

  useEffect(() => { load(); }, []);

  const update = (field, value) => {
    setSettings(prev => ({ ...prev, [field]: value }));
    setSaved(false);
    setError('');
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
          realtime_sip_enabled: settings.realtime_sip_enabled,
          personality_notes: settings.personality_notes,
          facebook_access_token: settings.facebook_access_token,
          sip_transfer_target: settings.sip_transfer_target,
          phone_intro: settings.phone_intro || '',
          capabilities: settings.capabilities || {},
          knowledge_topics: settings.knowledge_topics || [],
        });
      } else {
        const created = await base44.entities.SmashieSettings.create({
          greeting: settings.greeting,
          sms_status_updates_enabled: settings.sms_status_updates_enabled,
          sms_auto_reply_enabled: settings.sms_auto_reply_enabled,
          voice_ordering_enabled: settings.voice_ordering_enabled,
          realtime_sip_enabled: settings.realtime_sip_enabled,
          personality_notes: settings.personality_notes,
          facebook_access_token: settings.facebook_access_token,
          sip_transfer_target: settings.sip_transfer_target,
          phone_intro: settings.phone_intro || '',
          capabilities: settings.capabilities || {},
          knowledge_topics: settings.knowledge_topics || [],
        });
        setSettings(created);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error(e); setError('Could not save Smashie’s settings. Please try again.'); }
    setSaving(false);
  };

  if (!settings) {
    if (error) return <div role="alert" className="card-diner p-5"><p>{error}</p><button onClick={load} className="btn-cherry px-5 py-3 mt-3">Try again</button></div>;
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
        <p className="text-xs text-muted-foreground mb-3">Fallback reply if Smashie can't answer a text. The separate phone introduction below is spoken on calls.</p>
        <textarea
          value={settings.greeting || ''}
          onChange={e => update('greeting', e.target.value)}
          rows={3}
          className="w-full px-4 py-3 bg-white rounded-xl text-sm border border-border focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 resize-none"
        />
      </div>

      <div className="card-diner p-5">
        <label htmlFor="smashie-phone-intro" className="font-heading text-obsidian-roast">Phone introduction</label>
        <p className="text-sm text-muted-foreground mb-3">Spoken after Smashie's name and current wait when the restaurant is open. Leave blank for the standard introduction. If you switch off an ability, Smashie uses an introduction listing only enabled abilities. Keep custom wording under 450 characters.</p>
        <textarea id="smashie-phone-intro" value={settings.phone_intro || ''} maxLength={450} onChange={e => update('phone_intro', e.target.value)} rows={5}
          placeholder="Use the standard introduction" className="w-full px-4 py-3 bg-background rounded-xl border border-border" />
      </div>

      <SmashieAbilities value={settings.capabilities} onChange={value => update('capabilities', value)} />
      <SmashieKnowledge topics={settings.knowledge_topics} onChange={value => update('knowledge_topics', value)} />
      <SmashieToolInventory />

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
        <Toggle
          label="Live Phone Pipeline (OpenAI SIP)"
          description="Answer calls through OpenAI's realtime voice bridge for near-instant replies. Leave this off until the SIP trunk points at this app and a test call has passed."
          checked={settings.realtime_sip_enabled}
          onChange={v => update('realtime_sip_enabled', v)}
        />
      </div>

      {/* Counter transfer address — the REFER target Smashie hands a caller to */}
      <div className="card-diner p-5">
        <h3 className="font-heading text-obsidian-roast mb-2">Counter Transfer Address</h3>
        <p className="text-xs text-muted-foreground mb-3">
          Where Smashie sends a call when he hands it to the counter on the Live phone pipeline. This is the Twilio SIP address, not a phone number. Leave it blank to fall back to the saved transfer secret.
        </p>
        <input
          type="text"
          value={settings.sip_transfer_target || ''}
          onChange={e => update('sip_transfer_target', e.target.value)}
          placeholder="sip:counter@flavorisle-counter.sip.twilio.com"
          spellCheck={false}
          autoComplete="off"
          className="w-full px-4 py-3 bg-white rounded-xl text-sm font-mono border border-border focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30"
        />
      </div>

      {/* Personality notes */}
      <div className="card-diner p-5">
        <h3 className="font-heading text-obsidian-roast mb-2">Personality Notes</h3>
        <p className="text-xs text-muted-foreground mb-3">Notes that guide Smashie's tone and persona on phone calls.</p>
        <textarea
          value={settings.personality_notes || ''}
          onChange={e => update('personality_notes', e.target.value)}
          rows={4}
          placeholder="e.g. Keep it casual and energetic. Emphasize fresh never-frozen burgers and hand-spun shakes…"
          className="w-full px-4 py-3 bg-white rounded-xl text-sm border border-border focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 resize-none"
        />
      </div>

      {/* Facebook Conversions API token */}
      <div className="card-diner p-5">
        <div className="flex items-center gap-2 mb-2">
          <Facebook size={18} className="text-midnight-cherry" />
          <h3 className="font-heading text-obsidian-roast">Meta Conversions API Token</h3>
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          The Facebook/Meta access token for server-side event tracking. Stored here instead of as a platform secret because it exceeds Cloudflare's environment-variable size limit.
        </p>
        <textarea
          value={settings.facebook_access_token || ''}
          onChange={e => update('facebook_access_token', e.target.value)}
          rows={3}
          placeholder="EAAG…"
          className="w-full px-4 py-3 bg-white rounded-xl text-xs font-mono border border-border focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 resize-none"
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
        {saved && <span className="text-sm text-patina-mint font-heading">Changes are live on phone calls.</span>}
        {error && <span role="alert" className="text-sm text-destructive">{error}</span>}
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