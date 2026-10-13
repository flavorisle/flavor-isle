import React, { useState } from 'react';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STAGES = [
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready for pickup' },
  { value: 'completed', label: 'Completed' },
  { value: 'confirmed', label: 'Order confirmation' },
];

const stamp = (value) =>
  value ? new Date(value).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : null;

// The resend actions for one chosen order: confirmation, any status stage, and
// the cancellation notice. Every send goes through the same functions the
// automatic emails use, so the customer gets the exact wording they expect.
export default function OrderEmailResendActions({ order }) {
  const [stage, setStage] = useState('ready');
  const [reason, setReason] = useState(order.cancel_reason || '');
  const [refunded, setRefunded] = useState(false);
  const [busy, setBusy] = useState('');
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');

  const run = async (kind, fn) => {
    setBusy(kind);
    setSent('');
    setError('');
    try {
      const res = await fn();
      const data = res?.data || res;
      if (data?.success === false || data?.error) setError(data.error);
      else setSent(data?.message || 'Email sent');
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'The email could not be sent');
    } finally {
      setBusy('');
    }
  };

  const cancelled = order.status === 'cancelled';
  const confirmDate = stamp(order.confirmation_email_sent_at);
  const cancelDate = stamp(order.cancellation_email_sent_at);

  return (
    <div className="card-diner p-6 mt-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
        <h3 className="font-heading text-lg text-obsidian-roast">
          Order #{order.order_number} · {order.customer_name}
        </h3>
        <span className="text-xs font-heading uppercase tracking-widest text-muted-foreground">{order.status}</span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        Emails go to <strong className="text-obsidian-roast">{order.customer_email}</strong>
        {confirmDate ? ` · confirmation last sent ${confirmDate}` : ' · no confirmation email recorded'}
        {cancelDate ? ` · cancellation sent ${cancelDate}` : ''}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">Order confirmation</p>
          <button
            onClick={() => run('confirmation', () => base44.functions.invoke('resendOrderConfirmation', { order_id: order.id }))}
            disabled={!!busy}
            className="btn-cherry w-full min-h-11 px-4 text-sm disabled:opacity-50"
          >
            {busy === 'confirmation' ? <Loader2 size={16} className="animate-spin" /> : 'Resend confirmation'}
          </button>
        </div>

        <div className="rounded-xl border border-border p-4">
          <p className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">Status update</p>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="w-full mb-2 px-3 py-2.5 rounded-xl border border-border bg-white text-sm text-obsidian-roast focus:outline-none focus:border-midnight-cherry"
          >
            {STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
          <button
            onClick={() => run('status', () => base44.functions.invoke('resendOrderStatusEmail', { order_id: order.id, email_type: stage }))}
            disabled={!!busy}
            className="btn-mint w-full min-h-11 px-4 text-sm disabled:opacity-50"
          >
            {busy === 'status' ? <Loader2 size={16} className="animate-spin" /> : 'Resend status email'}
          </button>
        </div>
      </div>

      <div className={`rounded-xl border p-4 mt-4 ${cancelled ? 'border-midnight-cherry/40' : 'border-border opacity-70'}`}>
        <p className="text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">Cancellation notice</p>
        {!cancelled && (
          <p className="text-xs text-muted-foreground mb-2">Only a cancelled order can send this — this order is still {order.status}.</p>
        )}
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={300}
          disabled={!cancelled}
          placeholder="Why it was cancelled — e.g. we ran out of brisket"
          className="w-full mb-2 px-3 py-2.5 rounded-xl border border-border bg-white text-sm text-obsidian-roast focus:outline-none focus:border-midnight-cherry disabled:opacity-60"
        />
        <label className="flex items-center gap-2 text-sm text-obsidian-roast mb-3 select-none">
          <input type="checkbox" checked={refunded} onChange={(e) => setRefunded(e.target.checked)} disabled={!cancelled} className="w-4 h-4 accent-primary" />
          A refund was issued — include the refund wording
        </label>
        <button
          onClick={() => run('cancellation', () => base44.functions.invoke('resendOrderCancellationEmail', { order_id: order.id, reason, refunded }))}
          disabled={!cancelled || !!busy}
          className="btn-cherry w-full min-h-11 px-4 text-sm disabled:opacity-50"
        >
          {busy === 'cancellation' ? <Loader2 size={16} className="animate-spin" /> : 'Resend cancellation email'}
        </button>
      </div>

      {(sent || error) && (
        <div className={`flex items-start gap-2 mt-4 text-sm rounded-xl px-4 py-3 ${error ? 'bg-destructive/10 text-destructive' : 'bg-patina-mint/10 text-patina-mint'}`}>
          {error ? <AlertCircle size={16} className="mt-0.5 shrink-0" /> : <CheckCircle2 size={16} className="mt-0.5 shrink-0" />}
          <span>{error || sent}</span>
        </div>
      )}
    </div>
  );
}