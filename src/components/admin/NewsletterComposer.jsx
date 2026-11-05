import React, { useEffect, useState } from 'react';
import { Megaphone, Loader2, CheckCircle2, AlertCircle, Send, Eye, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Admin newsletter composer for the "Get Updates from the Isle" list.
// Subject + body editor, send-test-to-self, live active-subscriber count,
// and a final confirm before broadcasting to active subscribers only.
//
// Broadcasts run in batches: the backend handles a limited number of
// recipients per call and returns a cursor, so the composer shows progress and
// a Resume button until the whole list is done. Every call is signed with the
// body's SHA-256 and length — if the content that arrives at the server is not
// byte-for-byte what was composed here, the backend refuses before sending
// anything (the 2026-11-02 truncated-body incident).
const MIN_UNGUARDED_LENGTH = 400;

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function NewsletterComposer() {
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [stats, setStats] = useState(null);
  const [status, setStatus] = useState('idle');
  const [result, setResult] = useState(null);
  const [job, setJob] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const loadStats = async () => {
    try {
      const res = await base44.functions.invoke('sendNewsletterBroadcast', { action: 'stats' });
      setStats(res.data);
    } catch {}
  };

  useEffect(() => {
    (async () => {
      try {
        const me = await base44.auth.me();
        if (me?.email) setAdminEmail(me.email);
      } catch {}
      loadStats();
    })();
  }, []);

  // Editing the newsletter starts a new broadcast — drop the old cursor so a
  // stale resume can never send the previous content.
  useEffect(() => {
    setJob(null);
    setStatus('idle');
    setResult(null);
    setConfirmOpen(false);
  }, [subject, body]);

  const sendTest = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setStatus('sending'); setResult(null);
    try {
      const res = await base44.functions.invoke('sendNewsletterBroadcast', {
        action: 'test', subject: subject.trim(), body: body.trim(),
      });
      setResult(res.data); setStatus(res.data?.ok ? 'success' : 'error');
    } catch (err) { setResult({ error: err.message || 'Failed to send' }); setStatus('error'); }
  };

  const sendBatch = async (cursor) => {
    setConfirmOpen(false);
    setStatus('sending'); setResult(null);
    const subj = subject.trim();
    const html = body.trim();
    try {
      const res = await base44.functions.invoke('sendNewsletterBroadcast', {
        action: 'send',
        subject: subj,
        body: html,
        expected_body_sha256: await sha256Hex(`${subj}\n${html}`),
        expected_body_length: html.length,
        cursor: cursor || null,
      });
      const data = res.data || {};
      if (!data.ok) { setResult(data); setStatus('error'); setJob(null); return; }
      setJob((prev) => ({
        cursor: data.cursor,
        done: data.done,
        sent: (prev?.sent || 0) + (data.sent || 0),
        skipped: (prev?.skipped || 0) + (data.skipped || 0),
        failed: (prev?.failed || 0) + (data.failed || 0),
        remaining: data.remaining ?? 0,
        total: data.total_active ?? 0,
        bodyLength: data.body_length,
      }));
      setResult(data);
      setStatus(data.done ? 'success' : 'paused');
      loadStats();
    } catch (err) {
      // A refused send (e.g. 409 for content that already went out) carries its
      // own explanation in the response body — show that, not the HTTP error.
      const refusal = err?.response?.data;
      setResult(refusal?.error ? refusal : { error: err.message || 'Failed to send' });
      setJob(null);
      setStatus('error');
    }
  };

  const bodyLength = body.trim().length;
  const canSend = subject.trim() && body.trim();
  const activeCount = stats?.active ?? 0;
  const inProgress = job && job.done === false;
  // The backend refuses, with 409, any content that has already been broadcast.
  const alreadyBroadcast = /already broadcast/i.test(result?.error || '');

  return (
    <div className="card-diner p-6">
      <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
        <div className="flex items-center gap-2">
          <Megaphone size={18} className="text-midnight-cherry" />
          <h3 className="font-heading text-lg text-obsidian-roast">Get Updates from the Isle</h3>
        </div>
        <div className="inline-flex items-center gap-1.5 text-sm bg-patina-mint/10 text-patina-mint px-3 py-1.5 rounded-full font-heading">
          <Users size={14} /> {stats ? `${activeCount} active subscriber${activeCount === 1 ? '' : 's'}` : '…'}
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        Send a newsletter to confirmed subscribers only. Test it on yourself first, then broadcast. Each subscriber gets a one-click unsubscribe link, and nobody receives the same newsletter twice.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Subject Line</label>
          <input
            type="text" value={subject} onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. 🍔 New on the menu this week"
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-border bg-white text-obsidian-roast focus:outline-none focus:border-midnight-cherry"
          />
        </div>
        <div>
          <label className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Message</label>
          <textarea
            value={body} onChange={(e) => setBody(e.target.value)}
            placeholder="Write your newsletter here. It'll be wrapped in the branded Flavor Isle email template with an unsubscribe link."
            rows={6}
            className="w-full mt-1 px-4 py-2.5 rounded-xl border border-border bg-white text-obsidian-roast focus:outline-none focus:border-midnight-cherry resize-y"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Supports basic HTML (bold, links, etc.). Wrapped in the branded email shell automatically.{' '}
            <span className={bodyLength < MIN_UNGUARDED_LENGTH ? 'text-destructive font-semibold' : ''}>
              {bodyLength} characters{bodyLength < MIN_UNGUARDED_LENGTH ? ` — at least ${MIN_UNGUARDED_LENGTH} needed to broadcast` : ''}.
            </span>
          </p>
        </div>

        {/* Test send to self */}
        <div className="pt-2 border-t border-border">
          <label className="text-xs font-heading uppercase tracking-widest text-muted-foreground">Send Test To Yourself</label>
          <div className="flex gap-2 mt-1">
            <input
              type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="you@example.com"
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-white text-obsidian-roast focus:outline-none focus:border-midnight-cherry"
            />
            <button
              onClick={sendTest} disabled={!canSend || status === 'sending'}
              className="btn-mint px-5 py-2.5 text-sm font-heading flex items-center gap-2 disabled:opacity-50 whitespace-nowrap"
            >
              {status === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Eye size={16} />} Test
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">A test always goes to your own signed-in address.</p>
        </div>

        {/* Broadcast to all active */}
        <div className="pt-3 border-t border-border">
          {inProgress ? (
            <div className="p-4 rounded-xl bg-smashie-yellow/10 border border-smashie-yellow/30">
              <p className="text-sm font-heading text-obsidian-roast mb-2">
                Sending in batches — {job.sent || 0} sent{job.failed ? `, ${job.failed} failed` : ''}{job.skipped ? `, ${job.skipped} skipped` : ''}. {job.remaining} left of {job.total}.
              </p>
              <button
                onClick={() => sendBatch(job.cursor)} disabled={status === 'sending'}
                className="btn-cherry px-5 py-2.5 text-sm font-heading flex items-center gap-2 disabled:opacity-50"
              >
                {status === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Resume Sending
              </button>
            </div>
          ) : confirmOpen ? (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
              <p className="text-sm text-obsidian-roast font-heading mb-3">
                ⚠️ This will send to {activeCount} active subscriber{activeCount === 1 ? '' : 's'}. Are you sure?
              </p>
              <div className="flex gap-2">
                <button onClick={() => sendBatch(null)} disabled={status === 'sending'} className="btn-cherry px-5 py-2.5 text-sm font-heading flex items-center gap-2">
                  {status === 'sending' ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Yes, Send to Everyone
                </button>
                <button onClick={() => setConfirmOpen(false)} className="px-5 py-2.5 text-sm font-heading rounded-full border border-border text-obsidian-roast hover:bg-muted transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirmOpen(true)} disabled={!canSend || status === 'sending'}
              className="btn-cherry chrome-hover w-full py-3.5 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Megaphone size={16} /> Send to All Subscribers
            </button>
          )}
        </div>
      </div>

      {status === 'success' && result && (
        <div className="mt-4 p-4 rounded-xl bg-patina-mint/10 border border-patina-mint/20 flex items-start gap-2">
          <CheckCircle2 size={18} className="text-patina-mint flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-heading text-obsidian-roast">
              {result.test
                ? `Test sent to ${result.recipient}`
                : `Sent — ${job?.sent ?? result.sent} delivered${(job?.skipped ?? result.skipped) ? `, ${job?.skipped ?? result.skipped} skipped (already received)` : ''}${(job?.failed ?? result.failed) ? `, ${job?.failed ?? result.failed} failed` : ''}`}
            </p>
            {!result.test && <p className="text-muted-foreground">0 remaining of {job?.total ?? result.total_active} active subscribers.</p>}
          </div>
        </div>
      )}
      {status === 'error' && (
        <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-2">
          <AlertCircle size={18} className="text-destructive flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-heading text-obsidian-roast">
              {alreadyBroadcast ? 'Old newsletter — not sent' : 'Nothing sent'}
            </p>
            <p className="text-muted-foreground">{result?.error || 'Something went wrong'}</p>
            {alreadyBroadcast && (
              <p className="text-muted-foreground mt-1">
                This exact subject and message already went out once, so it can never be broadcast again. Write a new one — nobody gets an old newsletter twice.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}