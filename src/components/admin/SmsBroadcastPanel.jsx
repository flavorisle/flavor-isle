import React, { useState } from 'react';
import { Send, Loader2, Users, Phone, CheckCircle2, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const MAX_LEN = 320;

export default function SmsBroadcastPanel() {
  const [message, setMessage] = useState('');
  const [testPhone, setTestPhone] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const subscriberCount = useSubscriberCount();

  const handleSend = async (broadcast) => {
    setError(null);
    setResult(null);
    if (!message.trim()) {
      setError('Type a message first.');
      return;
    }
    if (broadcast && !testPhone.trim()) {
      // true broadcast — no phone needed
    }
    setSending(true);
    try {
      const payload = { message: message.trim() };
      if (!broadcast) payload.testPhone = testPhone.trim();
      const res = await base44.functions.invoke('sendSmsBroadcast', payload);
      setResult(res);
    } catch (err) {
      setError(err.message || 'Send failed');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="card-diner p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-midnight-cherry/10 rounded-full flex items-center justify-center">
            <Send size={18} className="text-midnight-cherry" />
          </div>
          <div>
            <h3 className="font-heading text-lg text-obsidian-roast">Send a Text Message</h3>
            <p className="text-xs text-muted-foreground">Powered by Twilio. Messages come from the Flavor Isle number.</p>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-full px-3 py-2 w-fit">
          <Users size={13} className="text-patina-mint" />
          {subscriberCount == null
            ? 'Loading subscriber count…'
            : `${subscriberCount} active SMS subscriber${subscriberCount === 1 ? '' : 's'}`}
        </div>

        <label className="block mt-5 mb-1.5 text-xs font-heading uppercase tracking-widest text-muted-foreground">
          Message
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_LEN))}
          rows={4}
          placeholder="Hey fam! Today only — 2 for $1 shakes after 8pm. Tell the crew at the counter."
          className="w-full rounded-2xl border border-border bg-white p-4 text-sm text-obsidian-roast focus:outline-none focus:border-midnight-cherry resize-none"
        />
        <p className="text-right text-[11px] text-muted-foreground mt-1">{message.length}/{MAX_LEN}</p>

        <label className="block mt-3 mb-1.5 text-xs font-heading uppercase tracking-widest text-muted-foreground">
          Send a test to one number (optional)
        </label>
        <div className="flex items-center gap-2">
          <Phone size={15} className="text-muted-foreground flex-shrink-0" />
          <input
            type="tel"
            value={testPhone}
            onChange={(e) => setTestPhone(e.target.value)}
            placeholder="270-555-0000"
            className="flex-1 rounded-xl border border-border bg-white px-3 py-2.5 text-sm text-obsidian-roast focus:outline-none focus:border-midnight-cherry"
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">Leave blank to send to every active subscriber.</p>

        {error && (
          <div className="mt-4 flex items-start gap-2 text-sm text-destructive bg-destructive/10 rounded-xl p-3">
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}

        {result && (
          <div className="mt-4 flex items-start gap-2 text-sm bg-patina-mint/10 rounded-xl p-3">
            <CheckCircle2 size={15} className="mt-0.5 flex-shrink-0 text-patina-mint" />
            <div>
              <p className="font-semibold text-obsidian-roast">
                Sent {result.sent} of {result.recipientCount} message{result.recipientCount === 1 ? '' : 's'}.
              </p>
              {result.errors?.length > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {result.errors.length} failed. First: {result.errors[0].phone} — {result.errors[0].error}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => handleSend(false)}
            disabled={sending || !message.trim() || !testPhone.trim()}
            className="btn-mint chrome-hover flex-1 py-3.5 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            Send Test
          </button>
          <button
            onClick={() => handleSend(true)}
            disabled={sending || !message.trim() || testPhone.trim()}
            className="btn-cherry chrome-hover flex-1 py-3.5 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? <Loader2 size={15} className="animate-spin" /> : <Users size={15} />}
            Broadcast to All Subscribers
          </button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground px-1">
        Note: US carriers require A2P 10DLC registration for marketing blasts. If texts aren't reaching customers, that campaign may still be pending in Twilio.
      </p>
    </div>
  );
}

// Small hook to show the active subscriber count above the composer.
function useSubscriberCount() {
  const [count, setCount] = useState(null);
  React.useEffect(() => {
    base44.entities.SMSSubscriber
      .filter({ status: 'active', opted_in: true })
      .then((subs) => setCount(subs.length))
      .catch(() => setCount(0));
  }, []);
  return count;
}