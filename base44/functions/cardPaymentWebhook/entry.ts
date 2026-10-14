import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { helcimPaymentByTransaction, helcimRequest } from '../../shared/helcimCheckout.ts';
import { settleHelcimCheckoutOrder, settleHelcimMerchOrder } from '../../shared/helcimSettlement.ts';

// The server-to-server card payment webhook (issue #106). Helcim POSTs only
// {id, type:'cardTransaction'} — the headers carry an HMAC signature over
// `${webhook-id}.${webhook-timestamp}.${body}` made with the verifier token from
// the merchant's Helcim webhook settings. The webhook is never trusted alone:
// the transaction is read back from Helcim's API and only an APPROVED USD
// payment for the exact amount of exactly one open order settles anything,
// through the same settlement code the browser path uses. Declines, mismatches
// and ambiguity settle nothing and are logged for a human.
export default async function (req: Request) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('webhook-signature') || '';
    const timestamp = req.headers.get('webhook-timestamp') || '';
    const messageId = req.headers.get('webhook-id') || '';

    // ── Signature first: anything not signed by Helcim is refused ──
    const verifierToken = (Deno.env.get('HELCIM_WEBHOOK_SECRET') || '').trim();
    if (!verifierToken) {
      console.error('Card webhook: HELCIM_WEBHOOK_SECRET is not configured');
      return Response.json({ error: 'not configured' }, { status: 500 });
    }
    if (!signatureHeader || !timestamp || !messageId) {
      return Response.json({ error: 'missing webhook headers' }, { status: 401 });
    }
    let expectedSignature = '';
    try {
      const keyBytes = Uint8Array.from(atob(verifierToken), (c) => c.charCodeAt(0));
      const cryptoKey = await crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
      const mac = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(`${messageId}.${timestamp}.${rawBody}`));
      expectedSignature = btoa(String.fromCharCode(...new Uint8Array(mac)));
    } catch (signError) {
      console.error('Card webhook: signature computation failed:', (signError as Error).message);
      return Response.json({ error: 'signature failure' }, { status: 401 });
    }
    const providedSignatures = signatureHeader.split(/\s+/).map((s) => s.split(',').pop() || '').filter(Boolean);
    if (!providedSignatures.includes(expectedSignature)) {
      console.warn(`Card webhook: signature mismatch (id ${messageId}) — ignored`);
      return Response.json({ error: 'invalid signature' }, { status: 401 });
    }

    // ── Payload: only the transaction id arrives ──
    let event: any = {};
    try { event = JSON.parse(rawBody); } catch { return Response.json({ ok: true }); }
    if (String(event?.type || '') !== 'cardTransaction' || !event?.id) {
      return Response.json({ ok: true });
    }
    const transactionId = String(event.id);

    // ── Read the transaction back — the webhook alone proves nothing ──
    const payment = await helcimPaymentByTransaction(transactionId).catch(() => null);
    if (!payment || payment.status !== 'APPROVED' || payment.currency !== 'USD') {
      console.log(`Card webhook: transaction ${transactionId} is not an approved USD payment (${payment?.status || 'unreadable'})`);
      return Response.json({ ok: true });
    }

    const base44 = createClientFromRequest(req);

    // ── Find the order. Primary: the order number carried on the transaction
    // record (the card form sends it). Fallback: among this merchant's own
    // open Helcim orders from the last two hours, exactly one whose stored
    // total matches the payment to the cent. Anything else is ambiguity —
    // logged, settled nothing, so a human looks rather than the code guessing.
    let orderNumberOnTransaction = '';
    try {
      const raw = await helcimRequest(`/card-transactions/${encodeURIComponent(transactionId)}`);
      const record = raw?.data || raw?.payment || raw;
      orderNumberOnTransaction = String(record?.orderNumber || '').trim();
    } catch (readError) {
      console.error(`Card webhook: could not read order number off transaction ${transactionId}:`, (readError as Error).message);
    }

    if (orderNumberOnTransaction) {
      const orders = await base44.asServiceRole.entities.Order
        .filter({ order_number: orderNumberOnTransaction }, '-created_date', 10)
        .catch(() => []);
      const order = (orders || []).find((o: any) => o.payment_provider === 'helcim') || null;
      const merchOrders = await base44.asServiceRole.entities.MerchOrder
        .filter({ order_number: orderNumberOnTransaction }, '-created_date', 10)
        .catch(() => []);
      const merchOrder = (merchOrders || [])[0] || null;
      if (order || merchOrder) {
        try {
          if (merchOrder) {
            await settleHelcimMerchOrder(base44, merchOrder, transactionId);
            console.log(`Card webhook: merch order ${orderNumberOnTransaction} settled from transaction ${transactionId}`);
          } else if (order) {
            const settled = await settleHelcimCheckoutOrder(base44, order, transactionId);
            console.log(`Card webhook: order ${orderNumberOnTransaction} settled from transaction ${transactionId} (payment_status=${settled?.payment_status})`);
          }
          return Response.json({ ok: true });
        } catch (settleError) {
          console.error(`Card webhook: settling ${orderNumberOnTransaction} from transaction ${transactionId} failed:`, (settleError as Error).message);
          return Response.json({ ok: true });
        }
      }
      console.warn(`Card webhook: transaction ${transactionId} names order ${orderNumberOnTransaction} but no open order carries that number`);
      return Response.json({ ok: true });
    }

    // ── Fallback: match by exact amount among recent open Helcim orders ──
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    const recentOrders = await base44.asServiceRole.entities.Order.list('-created_date', 60).catch(() => []);
    const candidates = (recentOrders || []).filter((o: any) =>
      o.payment_provider === 'helcim' &&
      o.payment_status !== 'paid' &&
      o.status !== 'cancelled' &&
      !o.pay_cash_on_pickup &&
      o.created_date && new Date(o.created_date).getTime() > twoHoursAgo &&
      Math.round(Number(o.total) * 100) === payment.amountCents - payment.tipCents,
    );
    if (candidates.length === 1) {
      try {
        const settled = await settleHelcimCheckoutOrder(base44, candidates[0], transactionId);
        console.log(`Card webhook: order ${candidates[0].order_number} settled by exact amount from transaction ${transactionId} (payment_status=${settled?.payment_status})`);
      } catch (settleError) {
        console.error(`Card webhook: settling ${candidates[0].order_number} from transaction ${transactionId} failed:`, (settleError as Error).message);
      }
      return Response.json({ ok: true });
    }
    console.warn(`Card webhook: transaction ${transactionId} (${payment.amountCents}c) matched ${candidates.length} open orders — left for a human: ${candidates.map((o: any) => o.order_number).join(', ')}`);
    return Response.json({ ok: true });
  } catch (error) {
    console.error('Card webhook error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}