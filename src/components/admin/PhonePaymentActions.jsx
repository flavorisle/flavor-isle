import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import CashPickupPayment from '@/components/admin/CashPickupPayment';

export default function PhonePaymentActions({ order }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  if (order.pay_cash_on_pickup) return <CashPickupPayment order={order} />;
  if (!(order.payment_provider || order.payment_url || order.manual_pay_required) || order.payment_status === 'paid' || order.status === 'cancelled') return null;
  const send = async () => {
    setBusy(true); setMessage(''); setError('');
    try {
      const { data } = await base44.functions.invoke('sendPhonePaymentLink', { order_id: order.id });
      setMessage(data.message);
    } catch (err) {
      setError(err.response?.data?.error || 'Could not send the payment link.');
    } finally { setBusy(false); }
  };
  return <div className="mt-3 space-y-2">
    <p className="text-xs text-muted-foreground">Phone payment: {order.payment_provider || 'stripe'}</p>
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" className="min-h-11" disabled={busy} onClick={send}>{busy ? 'Please wait…' : order.payment_url ? 'Resend payment link' : 'Send payment link'}</Button>
      {order.payment_url && <a href={order.payment_url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm underline text-foreground">Open payment link</a>}
    </div>
    {message && <p role="status" className="text-sm text-foreground">{message}</p>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}