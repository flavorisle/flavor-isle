import React, { useState } from 'react';
import { Send, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function RecommendationEmailTester() {
  const [orderId, setOrderId] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | success | error
  const [result, setResult] = useState(null);

  const send = async (e) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    setStatus('sending');
    setResult(null);
    try {
      const res = await base44.functions.invoke('sendOrderRecommendationEmail', {
        order_id: orderId.trim(),
        test_email: email.trim() || undefined,
      });
      setResult(res);
      setStatus('success');
    } catch (err) {
      setResult({ error: err.message || 'Failed to send' });
      setStatus('error');
    }
  };

  return (
    <div className="card-diner p-6">
      <div className="flex items-center gap-2 mb-1">
        <Send size={18} className="text-midnight-cherry" />
        <h3 className="font-heading text-lg text-obsidian-roast">Send Test Email</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Preview the recommendation email for any order. Test sends bypass the 7-day dedup and don't create a tracking record.
      </p>
      <form onSubmit={send} className="space-y-3">
        <div>
          <label className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Order ID</label>
          <input
            type="text"
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="e.g. 6aa595e4051cd9415e1c9252"
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-border bg-white text-obsidian-roast focus:outline-none focus:border-midnight-cherry"
            required
          />
        </div>
        <div>
          <label className="text-xs font-heading uppercase tracking-widest text-muted-foreground">
            Send To <span className="text-muted-foreground/60 normal-case tracking-normal">(optional — defaults to order's customer)</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-border bg-white text-obsidian-roast focus:outline-none focus:border-midnight-cherry"
          />
        </div>
        <button
          type="submit"
          disabled={status === 'sending'}
          className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading flex items-center gap-2 disabled:opacity-60"
        >
          {status === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          {status === 'sending' ? 'Sending…' : 'Send Test Email'}
        </button>
      </form>

      {status === 'success' && result && !result.skipped && (
        <div className="mt-4 p-4 rounded-xl bg-patina-mint/10 border border-patina-mint/20 flex items-start gap-2">
          <CheckCircle2 size={18} className="text-patina-mint flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-heading text-obsidian-roast">Sent to {result.recipient}</p>
            <p className="text-muted-foreground">Type: {result.email_type} · Suggested: {result.suggested?.join(', ')}</p>
          </div>
        </div>
      )}
      {status === 'success' && result?.skipped && (
        <div className="mt-4 p-4 rounded-xl bg-smashie-yellow/10 border border-smashie-yellow/30 flex items-start gap-2">
          <AlertCircle size={18} className="text-smashie-yellow flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-heading text-obsidian-roast">Skipped</p>
            <p className="text-muted-foreground">{result.reason}</p>
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2">
          <AlertCircle size={18} className="text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-heading text-obsidian-roast">Error</p>
            <p className="text-muted-foreground">{result?.error}</p>
          </div>
        </div>
      )}
    </div>
  );
}