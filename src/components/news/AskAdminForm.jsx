import React, { useState } from 'react';
import { Send, CheckCircle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// "Questions for the Admin" form on Community News. Reuses the existing
// sendContactMessage backend (validation, rate limiting, dedupe, blocked
// senders, durable admin inbox record). No new backend code.
export default function AskAdminForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) return;
    setStatus('sending');
    try {
      await base44.functions.invoke('sendContactMessage', {
        name: form.name,
        email: form.email,
        message: form.message,
      });
      setStatus('sent');
      setForm({ name: '', email: '', message: '' }); // clear only on success
    } catch (err) {
      // Genuine retryable error — typed text is PRESERVED so the customer can retry.
      setStatus('error');
    }
  };

  return (
    <section className="card-diner p-6" aria-label="Send a question to the admin">
      <h2 className="font-heading text-xl text-obsidian-roast mb-1">Questions or concerns?</h2>
      <p className="font-body text-sm text-muted-foreground mb-4">
        Send them straight to the admin — we're here for you.
      </p>

      {status === 'sent' ? (
        <div className="flex items-start gap-2 py-2">
          <CheckCircle size={20} className="text-green-700 shrink-0 mt-0.5" />
          <p className="font-body text-sm text-obsidian-roast">
            Got it — the admin's got it now. We'll get back to you.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="ask-name" className="block text-[11px] font-heading tracking-widest uppercase text-muted-foreground mb-1.5">Your name</label>
            <input
              id="ask-name"
              type="text"
              required
              maxLength={100}
              value={form.name}
              onChange={set('name')}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-3 font-body text-sm text-obsidian-roast focus:outline-none focus:ring-2 focus:ring-midnight-cherry focus:border-transparent"
              placeholder="Name"
            />
          </div>
          <div>
            <label htmlFor="ask-email" className="block text-[11px] font-heading tracking-widest uppercase text-muted-foreground mb-1.5">Your email</label>
            <input
              id="ask-email"
              type="email"
              required
              maxLength={200}
              value={form.email}
              onChange={set('email')}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-3 font-body text-sm text-obsidian-roast focus:outline-none focus:ring-2 focus:ring-midnight-cherry focus:border-transparent"
              placeholder="you@email.com"
            />
          </div>
          <div>
            <label htmlFor="ask-message" className="block text-[11px] font-heading tracking-widest uppercase text-muted-foreground mb-1.5">Your question</label>
            <textarea
              id="ask-message"
              required
              rows={4}
              maxLength={4000}
              value={form.message}
              onChange={set('message')}
              className="w-full rounded-lg border border-input bg-transparent px-3 py-3 font-body text-sm text-obsidian-roast focus:outline-none focus:ring-2 focus:ring-midnight-cherry focus:border-transparent resize-y"
              placeholder="Type your question here…"
            />
          </div>
          {status === 'error' && (
            <div className="flex items-start gap-2">
              <AlertCircle size={18} className="text-red-700 shrink-0 mt-0.5" />
              <p className="font-body text-sm text-red-700">
                We couldn't send that just now — please try again.
              </p>
            </div>
          )}
          <button
            type="submit"
            disabled={status === 'sending' || !form.name.trim() || !form.email.trim() || !form.message.trim()}
            className="inline-flex items-center gap-2 bg-midnight-cherry text-white font-heading text-sm tracking-wide rounded-xl px-6 py-3 hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={15} /> {status === 'sending' ? 'Sending…' : 'Send to the Admin'}
          </button>
        </form>
      )}
    </section>
  );
}