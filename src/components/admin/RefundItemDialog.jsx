import React, { useMemo, useState } from 'react';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { base44 } from '@/api/base44Client';
import { RotateCcw, Loader2, CheckCircle2, AlertTriangle, Banknote } from 'lucide-react';

// Refund one line of an order without cancelling the ticket.
//
// The amount is worked out the same way the backend works it out: the line's
// price × quantity plus that line's share of the order's tax. The server checks
// it to the cent, so what is shown here is exactly what goes back.

const money = (value) => `$${(Number(value) || 0).toFixed(2)}`;

function amountFor(order, item, quantity) {
  const line = (Number(item?.price) || 0) * quantity;
  const subtotal = Number(order?.subtotal) || 0;
  const tax = Number(order?.tax) || 0;
  const share = subtotal > 0 && tax > 0 ? line * (tax / subtotal) : 0;
  return Math.round((line + share) * 100) / 100;
}

function alreadyRefunded(order, itemName) {
  const wanted = String(itemName || '').trim().toLowerCase();
  return (order?.item_refunds || [])
    .filter((entry) => String(entry?.item_name || '').trim().toLowerCase() === wanted)
    .reduce((sum, entry) => sum + Math.max(1, Math.floor(Number(entry?.quantity) || 1)), 0);
}

const FAILURE_TEXT = {
  cash_back_needed: 'This one cannot go back on a card — hand the money back and clear the badge on the order.',
  processor_error: 'The card processor did not accept the refund. Nothing was sent back.',
  amount_unmatched: 'The amount did not match the ticket, so nothing was refunded. Wesley has been emailed.',
  item_not_found: 'That item is not on this order any more. Reload and try again.',
  order_not_found: 'This order could not be loaded.',
};

export default function RefundItemDialog({ order, open, onClose, onRefunded }) {
  const [selected, setSelected] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const items = useMemo(() => (order?.items || []).map((item, index) => {
    const refunded = alreadyRefunded(order, item.name);
    const total = Math.max(1, Math.floor(Number(item?.quantity) || 1));
    return { item, index, refunded, remaining: Math.max(0, total - refunded), total };
  }), [order]);

  if (!order) return null;

  const active = selected === null
    ? items.find((row) => row.remaining > 0) || null
    : items.find((row) => row.index === selected) || null;

  const maxQty = active ? active.remaining : 0;
  const qty = Math.min(Math.max(1, quantity), Math.max(1, maxQty));
  const amount = active ? amountFor(order, active.item, qty) : 0;

  const pick = (row) => {
    setSelected(row.index);
    setQuantity(1);
    setError('');
  };

  const handleRefund = async () => {
    if (!active || maxQty === 0) return;
    setBusy(true);
    setError('');
    try {
      const res = await base44.functions.invoke('refundOrderItem', {
        order_id: order.id,
        item_name: active.item.name,
        quantity: qty,
        amount,
        reason: reason || 'Item refunded by Flavor Isle',
      });
      const data = res?.data || res;
      if (data?.ok) setResult(data);
      else setError(FAILURE_TEXT[data?.reason] || data?.error || 'Nothing was refunded.');
    } catch (err) {
      setError(err?.response?.data?.error || err?.data?.error || err?.message || 'Nothing was refunded.');
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    if (busy) return;
    if (result) { onRefunded(); return; }
    onClose();
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <AlertDialogContent className="max-w-lg">
        {result ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-heading text-2xl flex items-center gap-2 text-obsidian-roast">
                <CheckCircle2 className="text-green-600 flex-shrink-0" size={22} />
                Refund started
              </AlertDialogTitle>
              <AlertDialogDescription>Here&rsquo;s what was done:</AlertDialogDescription>
            </AlertDialogHeader>
            <ul className="mt-1 space-y-2 text-sm">
              <li className="flex gap-2">
                <span className="font-semibold text-obsidian-roast">Amount</span>
                <span className="text-muted-foreground">
                  {money(result.amount)} for {result.quantity > 1 ? `${result.quantity}× ` : ''}{result.item_name}
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-obsidian-roast">Back on</span>
                <span className="text-muted-foreground capitalize">{result.processor || 'card'}</span>
              </li>
              <li className="flex gap-2">
                <span className="font-semibold text-obsidian-roast">Customer</span>
                <span className="text-muted-foreground">
                  email {result.customer_emailed ? 'sent' : 'not sent'} · text {result.customer_texted ? 'sent' : 'not sent'}
                </span>
              </li>
            </ul>
            <AlertDialogFooter className="mt-4">
              <Button className="min-h-11" onClick={close}>Done</Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle className="font-heading text-2xl flex items-center gap-2 text-obsidian-roast">
                <RotateCcw className="text-midnight-cherry flex-shrink-0" size={22} />
                Refund an item — #{order.order_number || order.id}
              </AlertDialogTitle>
              <AlertDialogDescription>
                Puts just that item&rsquo;s money back on the original payment and tells{' '}
                {order.customer_name || 'the customer'}. The rest of the order stays as it is.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto">
              {items.length === 0 && (
                <p className="text-sm text-muted-foreground">No items recorded on this order.</p>
              )}
              {items.map((row) => {
                const isActive = active?.index === row.index;
                const sold = row.remaining === 0;
                return (
                  <button
                    key={row.index}
                    onClick={() => pick(row)}
                    disabled={busy || sold}
                    className={`w-full flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                      isActive
                        ? 'border-midnight-cherry bg-midnight-cherry/5'
                        : sold
                        ? 'border-border bg-muted/40 opacity-60'
                        : 'border-border hover:border-midnight-cherry/50'
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-obsidian-roast truncate">
                        {row.total > 1 ? `${row.total}× ` : ''}{row.item.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {sold
                          ? `All ${row.total} already refunded`
                          : `${money(amountFor(order, row.item, 1))} each${row.refunded ? ` · ${row.refunded} already refunded` : ''}`}
                      </span>
                    </span>
                    {isActive && <span className="text-xs font-heading text-midnight-cherry shrink-0">Selected</span>}
                  </button>
                );
              })}
            </div>

            {active && maxQty > 0 && (
              <div className="mt-3 flex items-end gap-3">
                <div>
                  <label htmlFor="refund-qty" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    How many
                  </label>
                  <Input
                    id="refund-qty"
                    type="number"
                    min={1}
                    max={maxQty}
                    value={qty}
                    onChange={(e) => setQuantity(Math.min(Math.max(1, Number(e.target.value) || 1), maxQty))}
                    className="mt-1.5 h-11 w-24"
                    disabled={busy}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="refund-reason" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Reason (optional)
                  </label>
                  <Input
                    id="refund-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Wrong item, made wrong…"
                    className="mt-1.5 h-11"
                    disabled={busy}
                  />
                </div>
              </div>
            )}

            {active && maxQty > 0 && (
              <div className="mt-3 rounded-xl bg-muted px-3 py-2.5 flex items-center justify-between">
                <span className="text-xs font-heading uppercase tracking-wider text-muted-foreground">
                  {qty > 1 ? `${qty}× ${active.item.name}` : active.item.name} goes back
                </span>
                <span className="font-heading text-lg text-midnight-cherry">{money(amount)}</span>
              </div>
            )}

            {error && (
              <p className="mt-3 text-sm text-destructive flex items-start gap-2">
                <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
                {error}
              </p>
            )}

            {order.cash_back_needed && (
              <p className="mt-2 text-xs text-red-700 flex items-center gap-1.5">
                <Banknote size={13} /> This order already has cash owed back to the customer.
              </p>
            )}

            <AlertDialogFooter className="mt-4">
              <Button variant="outline" className="min-h-11" onClick={close} disabled={busy}>Keep order</Button>
              <Button className="min-h-11" onClick={handleRefund} disabled={busy || !active || maxQty === 0}>
                {busy ? (
                  <>
                    <Loader2 size={15} className="mr-1.5 animate-spin" />
                    Refunding…
                  </>
                ) : `Refund ${money(amount)}`}
              </Button>
            </AlertDialogFooter>
            {busy && (
              <p className="text-xs text-muted-foreground mt-1">
                Sending the money back and notifying the customer — this can take a few seconds.
              </p>
            )}
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}