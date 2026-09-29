import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function PhonePaymentActions({ order }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  if (!(order.payment_provider || order.payment_url || order.manual_pay_required) || order.payment_status === 'paid' || order.status === 'cancelled') return null;
  const send = async (backup) => {
    if (backup && !window.confirm('Switch this unpaid order to Stripe and send the backup link? The old Square link will be disabled.')) return;
    setBusy(true); setMessage(''); setError('');
    try {
      const { data } = await base44.functions.invoke('sendPhonePaymentLink', { order_id: order.id, use_stripe_backup: backup });
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send the payment link.');
    } finally { setBusy(false); }
  };
  return <div className="mt-3 space-y-2">
    <p className="text-xs text-muted-foreground">Phone payment: {order.payment_provider || 'stripe'}</p>
    <div className="flex flex-wrap gap-2">
      {(order.payment_url || order.payment_provider === 'square') && <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => send(false)}>{busy ? 'Please wait…' : order.payment_url ? 'Resend payment link' : 'Send Square link'}</Button>}
      {order.payment_url && <a href={order.payment_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm underline text-foreground">Open payment link</a>}
      {order.payment_provider !== 'stripe' && <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => send(true)}>Send Stripe backup</Button>}
    </div>
    {message && <p role="status" className="text-sm text-foreground">{message}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}