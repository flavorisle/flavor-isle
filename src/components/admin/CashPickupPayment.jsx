import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';

export default function CashPickupPayment({ order }) {
  const [busy, setBusy] = useState(false);
  const [paid, setPaid] = useState(false);
  const [error, setError] = useState('');
  const collect = async () => {
    if (!window.confirm(`Confirm you have received $${Number(order.total).toFixed(2)} in cash for order #${order.order_number}?`)) return;
    setBusy(true); setError('');
    try {
      const { data } = await base44.functions.invoke('recordPhoneCashPayment', { order_id: order.id, cash_received: true });
      if (!data.success) throw new Error(data.error || 'Could not record cash payment.');
      setPaid(true);
    } catch (err) { setError(err.response?.data?.error || err.message); }
    finally { setBusy(false); }
  };
  return <div className="mt-3 space-y-2">
    <p className="text-sm font-semibold text-foreground">{paid || order.payment_status === 'paid' ? 'Payment received' : `Cash at pickup — $${Number(order.total).toFixed(2)} due`}</p>
    {!paid && order.payment_status !== 'paid' && order.status !== 'cancelled' && <Button variant="outline" className="min-h-11" onClick={collect} disabled={busy}>{busy ? 'Recording…' : 'Record cash received'}</Button>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
  </div>;
}