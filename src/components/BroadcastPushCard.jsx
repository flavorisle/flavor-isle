import React, { useState } from 'react';
import { Megaphone, Loader2, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function BroadcastPushCard() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [url, setUrl] = useState('/menu');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  const handleSend = async () => {
    if (!body.trim()) return;
    setSending(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('broadcastPush', { title, body, url });
      setResult(res.data);
      setBody('');
      setTitle('');
    } catch (err) {
      setResult({ error: err.message || 'Failed to send' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      <div className="card-diner p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0">
            <Megaphone size={18} className="text-midnight-cherry" />
          </div>
          <div>
            <h2 className="font-heading text-xl text-obsidian-roast mb-1">Broadcast a Push Notification</h2>
            <p className="text-sm text-muted-foreground">Send a promo or announcement to every customer with notifications enabled.</p>
          </div>
        </div>

        <div className="space-y-3 max-w-xl">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Title (optional)</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="🔥 Deal of the Day" className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Message</label>
            <textarea value={body} onChange={e => setBody(e.target.value)} rows={3} placeholder="Double cheeseburgers are 2-for-1 until 9pm today!" className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 resize-none" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Tap destination</label>
            <select value={url} onChange={e => setUrl(e.target.value)} className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30">
              <option value="/menu">Menu</option>
              <option value="/combos">Combos</option>
              <option value="/">Home</option>
              <option value="/download">Download App</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 mt-5">
          <button onClick={handleSend} disabled={sending || !body.trim()} className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading flex items-center gap-2 disabled:opacity-60 tap-44">
            {sending ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <><Megaphone size={16} /> Send Broadcast</>}
          </button>
          {result && !result.error && (
            <span className="inline-flex items-center gap-1.5 text-sm text-green-700 font-semibold">
              <Check size={16} /> Sent to {result.sent} {result.sent === 1 ? 'device' : 'devices'}
            </span>
          )}
          {result?.error && (
            <span className="text-sm text-destructive">{result.error}</span>
          )}
        </div>
      </div>
    </div>
  );
}