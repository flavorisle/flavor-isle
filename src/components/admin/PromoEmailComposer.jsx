import React, { useState } from 'react';
import { Megaphone, Loader2, CheckCircle2, AlertCircle, Send, Eye } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function PromoEmailComposer() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const sendTest = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim() || !testEmail.trim()) return;
    setStatus('sending');
    setResult(null);
    try {
      const res = await base44.functions.invoke('sendPromoEmailBroadcast', {
        subject: subject.trim(),
        body: body.trim(),
        test_email: testEmail.trim(),
      });
      setResult(res);
      setStatus(res?.ok ? 'success' : 'error');
    } catch (err) {
      setResult({ error: err.message || 'Failed to send' });
      setStatus('error');
    }
  };

  const sendAll = async () => {
    setConfirmOpen(false);
    setStatus('sending');
    setResult(null);
    try {
      const res = await base44.functions.invoke('sendPromoEmailBroadcast', {
        subject: subject.trim(),
        body: body.trim(),
      });
      setResult(res);
      setStatus(res?.ok ? 'success' : 'error');
    } catch (err) {
      setResult({ error: err.message || 'Failed to send' });
      setStatus('error');
    }
  };

  const canSend = subject.trim() && body.trim();

  return (
    <div className="card-diner p-6">
      <div className="flex items-center gap-2 mb-1">
        <Megaphone size={18} className="text-midnight-cherry" />
        <h3 className="font-heading text-lg text-obsidian-roast">Promo Broadcast</h3>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Send a promotional email to every customer who's ever ordered online. Test it first on yourself, then broadcast to all.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Subject Line</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. 🍔 National Cheeseburger Day — $2 off!"
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-border bg-white text-obsidian-roast focus:outline-none focus:border-midnight-cherry"
          />
        </div>
        <div>
          <label className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Message</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your promo message here. It'll be wrapped in the branded Flavor Isle email template."
            rows={6}
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-border bg-white text-obsidian-roast focus:outline-none focus:border-midnight-cherry resize-y"
          />
          <p className="text-xs text-muted-foreground mt-1">Supports basic HTML (bold, links, etc.). Wrapped in the branded email shell automatically.</p>
        </div>

        {/* Test send */}
        <div className="pt-2 border-t border-border">
          <label className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Send Test To</label>
          <div className="flex gap-2 mt-1">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-white text-obsidian-roast focus:outline-none focus:border-midnight-cherry"
            />
            <button
              onClick={sendTest}
              disabled={!canSend || !testEmail.trim() || status === 'sending'}
              className="btn-mint px-5 py-2.5 text-sm font-heading flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
            >
              {status === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />}
              Test
            </button>
          </div>
        </div>

        {/* Broadcast to all */}
        <div className="pt-3 border-t border-border">
          {confirmOpen ? (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-obsidian-roast font-heading mb-3">⚠️ This will send to EVERY customer who's ever ordered. Are you sure?</p>
              <div className="flex gap-2">
                <button
                  onClick={sendAll}
                  disabled={status === 'sending'}
                  className="btn-cherry px-5 py-2.5 text-sm font-heading flex items-center gap-2"
                >
                  {status === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Yes, Send to Everyone
                </button>
                <button
                  onClick={() => setConfirmOpen(false)}
                  className="px-5 py-2.5 text-sm font-heading rounded-full border border-border text-obsidian-roast hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmOpen(true)}
              disabled={!canSend || status === 'sending'}
              className="btn-cherry chrome-hover w-full py-3.5 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Megaphone size={16} /> Send to All Customers
            </button>
          )}
        </div>
      </div>

      {status === 'success' && result && (
        <div className="mt-4 p-4 rounded-xl bg-patina-mint/10 border border-patina-mint/20 flex items-start gap-2">
          <CheckCircle2 size={18} className="text-patina-mint flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-heading text-obsidian-roast">
              {result.test ? `Test sent to ${result.recipient}` : `Broadcast sent — ${result.sent}/${result.recipientCount} delivered`}
            </p>
            {!result.test && result.errorCount > 0 && (
              <p className="text-muted-foreground">{result.errorCount} failed — see logs for details.</p>
            )}
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2">
          <AlertCircle size={18} className="text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-heading text-obsidian-roast">Error</p>
            <p className="text-muted-foreground">{result?.error || 'Something went wrong'}</p>
          </div>
        </div>
      )}
    </div>
  );
}