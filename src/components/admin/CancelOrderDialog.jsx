import React, { useState } from 'react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { XCircle, Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';

// One-tap cancel for the crew: cancels the order in Square, refunds the card
// payment when there is one, and tells the customer — then reports exactly what
// happened so nobody has to guess whether the money moved.
export default function CancelOrderDialog({ order, open, onClose, onCancelled }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (!order) return null;

  const handleCancel = async () => {
    setBusy(true);
    setError('');
    try {
      const res = await base44.functions.invoke('cancelOrder', { order_id: order.id, reason });
      const data = res?.data || res;
      if (data?.status === 'ok') setResult(data);
      else setError(data?.error || 'Could not cancel this order.');
    } catch (err) {
      setError(err?.response?.data?.error || err?.data?.error || err?.message || 'Could not cancel this order.');
    } finally {
      setBusy(false);
    }
  };

  const refundLine = result
    ? result.refunded
      ? `Refunded $${Number(order.total || 0).toFixed(2)} to the card`
      : result.refund_note || 'No payment to refund'
    : '';

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next && !busy) (result ? onCancelled() : onClose()); }}>
      <AlertDialogContent className="max-w-md">
        {result ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-heading text-2xl flex items-center gap-2 text-obsidian-roast">
                <CheckCircle2 className="text-green-600 flex-shrink-0" size={22} />
                Order #{result.order_number} cancelled
              </AlertDialogTitle>
              <AlertDialogDescription>Here&rsquo;s what was done:</AlertDialogDescription>
            </AlertDialogHeader>
            <ul className="mt-1 space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="font-semibold text-obsidian-roast">Square</span>
                <span className="text-muted-foreground">{result.square}</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-obsidian-roast">Payment</span>
                <span className="text-muted-foreground">{refundLine}</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-obsidian-roast">Customer</span>
                <span className="text-muted-foreground">
                  email {result.email || 'not sent'} · text {result.sms || 'not sent'}
                </span>
              </li>
            </ul>
            <AlertDialogFooter className="mt-4">
              <Button className="min-h-11" onClick={onCancelled}>Done</Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-heading text-2xl flex items-center gap-2 text-obsidian-roast">
                <XCircle className="text-destructive flex-shrink-0" size={22} />
                Cancel order #{order.order_number}?
              </AlertDialogTitle>
              <AlertDialogDescription>
                This cancels the order in Square, refunds the card payment if there is one, and tells{' '}
                {order.customer_name || 'the customer'} by email and text. It cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="mt-2">
              <label htmlFor="cancel-reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Reason (optional)
              </label>
              <Input
                id="cancel-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Customer called to cancel, duplicate order…"
                className="mt-1.5 h-11"
                disabled={busy}
              />
            </div>

            {error && (
              <p className="mt-3 text-sm text-destructive flex items-start gap-2">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                {error}
              </p>
            )}

            <AlertDialogFooter className="mt-4">
              <Button variant="outline" className="min-h-11" onClick={onClose} disabled={busy}>Keep order</Button>
              <Button variant="destructive" className="min-h-11" onClick={handleCancel} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 size={15} className="mr-1.5 animate-spin" />
                    Cancelling…
                  </>
                ) : 'Cancel order'}
              </Button>
            </AlertDialogFooter>
            {busy && (
              <p className="text-xs text-muted-foreground mt-1">
                Cancelling in Square, refunding the card if there is one, and notifying the customer — this can take a few seconds.
              </p>
            )}
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}