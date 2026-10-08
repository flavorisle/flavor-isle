import { sendOrderStatusSms } from './sendOrderStatusSms.ts';

// Cancel + notify helpers for the crew's one-tap "Cancel order" flow.
//
// Cancelling used to be an unlabeled ✕ on the Orders page that only flipped the
// status: the Square order stayed open on the POS, the card stayed charged and
// the customer was never told. This module covers the rest of that job.

const SQUARE_API = 'https://connect.squareup.com/v2';
const SQUARE_VERSION = '2026-09-16';

function squareError(data: any): string {
  const errors = data?.errors || [];
  const text = errors.map((e: any) => e?.detail || e?.code).filter(Boolean).join('; ');
  return text || 'unknown Square error';
}

// Take the matching Square order out of play, so it leaves the POS/kitchen
// screen the same way a POS-side cancel would. Square cancels an order by
// writing state CANCELED at its current version, so read the version first.
// Never throws: the result is reported back to the crew either way.
export async function cancelSquareOrder(base44: any, squareOrderId?: string) {
  if (!squareOrderId) return { ok: false, skipped: true, detail: 'No Square order on this order' };
  try {
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('square');
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      'Square-Version': SQUARE_VERSION,
      'Content-Type': 'application/json',
    };

    const readRes = await fetch(`${SQUARE_API}/orders/${encodeURIComponent(squareOrderId)}`, { headers });
    const readData = await readRes.json().catch(() => ({}));
    if (!readRes.ok) return { ok: false, skipped: false, detail: `Square read failed: ${squareError(readData)}` };

    const squareOrder = readData?.order;
    if (!squareOrder) return { ok: false, skipped: false, detail: 'Square order not found' };
    if (squareOrder.state === 'CANCELED') {
      return { ok: true, skipped: false, detail: 'already cancelled in Square' };
    }

    // Square only treats the order as cancelled when the write carries its
    // current version, a NEW idempotency key, and the fulfillments cancelled
    // with it — an order whose fulfillments are still live is not cancellable.
    const fulfillments = (squareOrder.fulfillments || [])
      .filter((f: any) => f?.uid)
      .map((f: any) => ({ uid: f.uid, type: f.type, state: 'CANCELED' }));
    const orderPatch: Record<string, unknown> = { version: squareOrder.version, state: 'CANCELED' };
    if (fulfillments.length) orderPatch.fulfillments = fulfillments;

    const cancelRes = await fetch(`${SQUARE_API}/orders/${encodeURIComponent(squareOrderId)}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ idempotency_key: crypto.randomUUID(), order: orderPatch }),
    });
    const cancelData = await cancelRes.json().catch(() => ({}));
    if (!cancelRes.ok) {
      return {
        ok: false,
        skipped: false,
        detail: `cancel failed (Square says "${
          squareError(cancelData)
        }", order was ${squareOrder.state || 'unknown'}) — close it on the POS too`,
      };
    }
    return { ok: true, skipped: false, detail: 'cancelled in Square' };
  } catch (error) {
    return { ok: false, skipped: false, detail: `cancel failed: ${(error as Error).message} — close it on the POS too` };
  }
}

function itemsHtml(order: any): string {
  return (order?.items || [])
    .map((i: any) => {
      const mods = (i.selectedModifiers || [])
        .map((m: any) => `<li>${m.name}${m.price ? ` (+$${Number(m.price).toFixed(2)})` : ''}</li>`)
        .join('');
      return `<tr>
          <td style="padding:6px 0;">${i.quantity}× ${i.name}</td>
          <td style="padding:6px 0;text-align:right;">$${(Number(i.price) * Number(i.quantity)).toFixed(2)}</td>
        </tr>${mods ? `<tr><td colspan="2" style="padding:2px 0 6px 12px;color:#666;font-size:13px;"><ul style="margin:0;padding-left:16px;">${mods}</ul></td></tr>` : ''}`;
    })
    .join('');
}

// Crew-typed text lands in an HTML email, so keep stray < & > from breaking it.
function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export function cancellationEmailBody(order: any, { refunded, amountText }: { refunded: boolean; amountText: string }): string {
  // The reason the crew typed in the Cancel Order dialog, quoted so the customer
  // knows why their order came off the board.
  const reasonLine = order.cancel_reason
    ? `<p style="font-size:15px;line-height:1.6;">What happened: ${escapeHtml(order.cancel_reason)}</p>`
    : '';
  const moneyLine = refunded
    ? `<p style="font-size:15px;line-height:1.6;">We've also refunded <strong style="color:#C0392B;">${amountText}</strong> to your original payment method — it should appear on your statement within 5–10 business days.</p>`
    : `<p style="font-size:15px;line-height:1.6;">Nothing was charged for this order.</p>`;
  return `<!DOCTYPE html><html><body style="font-family:'Open Sans',Arial,sans-serif;background:#F5EDD6;color:#141414;margin:0;padding:24px;">
      <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:18px;padding:32px;box-shadow:0 8px 40px rgba(0,0,0,0.08);">
        <div style="text-align:center;margin-bottom:20px;">
          <h1 style="font-family:Oswald,Arial,sans-serif;color:#C0392B;margin:0;font-size:24px;">FLAVOR ISLE</h1>
          <p style="margin:4px 0 0;color:#1A3A5C;letter-spacing:2px;font-size:12px;">SMITHS GROVE, KY</p>
        </div>
        <h2 style="font-family:Oswald,Arial,sans-serif;color:#141414;font-size:20px;">Hi ${order.customer_name},</h2>
        <p style="font-size:15px;line-height:1.6;">Your order <strong>${order.order_number}</strong> has been cancelled, so we're not making it.</p>
        ${reasonLine}
        ${moneyLine}
        <table style="width:100%;font-size:14px;margin:18px 0;color:#141414;border-top:1px solid #eee;border-bottom:1px solid #eee;">
          ${itemsHtml(order)}
        </table>
        <p style="font-size:13px;color:#666;">Sorry for the trouble — if this wasn't expected, or you'd like to reorder, call us at <a href="tel:+12705634618">(270) 563-4618</a> or just reply to this email.</p>
        <p style="font-size:13px;color:#666;margin-top:24px;">— The Flavor Isle Team</p>
      </div></body></html>`;
}

export function cancellationSmsBody(order: any, { refunded, amountText }: { refunded: boolean; amountText: string }): string {
  const moneyLine = refunded
    ? ` We've refunded ${amountText} to your card — allow 5-10 business days for it to show.`
    : ' Nothing was charged.';
  return `Flavor Isle: Order #${order.order_number} has been cancelled and we're not making it.${moneyLine} Sorry about that! Questions? (270) 563-4618`;
}

// Tell the customer the order is off. The email always goes (when there's an
// address); the text rides the app's existing transactional-consent gate, so a
// customer who never opted into texts is simply skipped and the crew sees why.
export async function notifyOrderCancelled(base44: any, order: any, { refunded }: { refunded: boolean }) {
  const amountText = `$${Number(order.total || 0).toFixed(2)}`;
  let email: string | null = null;
  let sms: string | null = null;

  if (order.customer_email) {
    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: order.customer_email,
        subject: refunded
          ? `Order ${order.order_number} cancelled — refund on the way`
          : `Order ${order.order_number} cancelled`,
        body: cancellationEmailBody(order, { refunded, amountText }),
      });
      email = 'sent';
    } catch (error) {
      email = `failed (${(error as Error).message})`;
      console.error(`Cancellation email to ${order.customer_email} failed:`, (error as Error).message);
    }
  }

  if (order.customer_phone) {
    const result = await sendOrderStatusSms(base44, order, 'cancelled', {
      body: cancellationSmsBody(order, { refunded, amountText }),
    });
    sms = result.sent ? 'sent' : result.skipped ? `skipped (${result.reason})` : `failed (${result.reason || 'send failed'})`;
  }

  // Stamp what actually reached the customer. The order card shows these, so the
  // crew can confirm the notice went out instead of taking it on faith. A refused
  // or failed send leaves no stamp — there is nothing to claim.
  const stamps: Record<string, string> = {};
  if (email === 'sent') stamps.cancellation_email_sent_at = new Date().toISOString();
  if (sms === 'sent') stamps.cancellation_sms_sent_at = new Date().toISOString();
  if (order.id && Object.keys(stamps).length) {
    try {
      await base44.asServiceRole.entities.Order.update(order.id, stamps);
    } catch (error) {
      console.error(`Could not record the cancellation notice on order ${order.order_number}:`, (error as Error).message);
    }
  }

  return { email, sms };
}