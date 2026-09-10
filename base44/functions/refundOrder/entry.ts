import Stripe from 'npm:stripe@14.25.0';
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAdmin } from '../../shared/requireAdmin.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const reqBody = await req.json();
    const { order_id, reason = 'requested_by_customer' } = reqBody;

    if (!order_id) {
      return Response.json({ error: 'order_id is required' }, { status: 400 });
    }

    const order = await base44.asServiceRole.entities.Order.get(order_id);

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.payment_status === 'refunded') {
      return Response.json({ error: 'Order already refunded', order }, { status: 409 });
    }

    const paymentIntentId = order.stripe_session_id;
    if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) {
      return Response.json({ error: 'No valid Stripe PaymentIntent found on order' }, { status: 400 });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));

    // Issue a full refund of the PaymentIntent.
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason,
    });

    // Update the order record.
    await base44.asServiceRole.entities.Order.update(order_id, {
      payment_status: 'refunded',
      status: 'cancelled',
    });

    const amountText = `$${Number(order.total).toFixed(2)}`;
    const itemsHtml = (order.items || [])
      .map(i => {
        const mods = (i.selectedModifiers || []).map(m => `<li>${m.name}${m.price ? ` (+$${Number(m.price).toFixed(2)})` : ''}</li>`).join('');
        return `<tr>
          <td style="padding:6px 0;">${i.quantity}× ${i.name}</td>
          <td style="padding:6px 0;text-align:right;">$${(Number(i.price) * Number(i.quantity)).toFixed(2)}</td>
        </tr>${mods ? `<tr><td colspan="2" style="padding:2px 0 6px 12px;color:#666;font-size:13px;"><ul style="margin:0;padding-left:16px;">${mods}</ul></td></tr>` : ''}`;
      })
      .join('');

    const emailBody = `<!DOCTYPE html><html><body style="font-family:'Open Sans',Arial,sans-serif;background:#F5EDD6;color:#141414;margin:0;padding:24px;">
      <div style="max-width:520px;margin:0 auto;background:#FFFFFF;border-radius:18px;padding:32px;box-shadow:0 8px 40px rgba(0,0,0,0.08);">
        <div style="text-align:center;margin-bottom:20px;">
          <h1 style="font-family:Oswald,Arial,sans-serif;color:#C0392B;margin:0;font-size:24px;">FLAVOR ISLE</h1>
          <p style="margin:4px 0 0;color:#1A3A5C;letter-spacing:2px;font-size:12px;">SMITHS GROVE, KY</p>
        </div>
        <h2 style="font-family:Oswald,Arial,sans-serif;color:#141414;font-size:20px;">Hi ${order.customer_name},</h2>
        <p style="font-size:15px;line-height:1.6;">We've refunded your order <strong>${order.order_number}</strong> in the amount of <strong style="color:#C0392B;">${amountText}</strong>. The refund has been issued to your original payment method and should appear on your statement within 5–10 business days.</p>
        <table style="width:100%;font-size:14px;margin:18px 0;color:#141414;border-top:1px solid #eee;border-bottom:1px solid #eee;">
          ${itemsHtml}
        </table>
        <p style="font-size:13px;color:#666;">If you have any questions, just call us at <a href="tel:+12705634618">(270) 563-4618</a> or reply to this email — we're sorry for the inconvenience and hope to serve you again soon.</p>
        <p style="font-size:13px;color:#666;margin-top:24px;">— The Flavor Isle Team</p>
      </div></body></html>`;

    try {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: order.customer_email,
        subject: `Refund processed — Order ${order.order_number}`,
        body: emailBody,
      });
    } catch (emailErr) {
      console.error('Refund email send failed:', emailErr.message);
    }

    // GA4 ecommerce: record the refund server-side via the Measurement Protocol
    // so refunds are attributed even though the customer is not on a page.
    try {
      const apiSecret = Deno.env.get('GA4_MEASUREMENT_PROTOCOL_SECRET');
      if (apiSecret) {
        const refundItems = (order.items || []).map((i) => ({
          item_id: i.catalog_object_id || i.square_item_id || i.name,
          item_name: i.name,
          price: Number(i.price) || 0,
          quantity: i.quantity || 1,
        }));
        await fetch(
          `https://www.google-analytics.com/mp/collect?measurement_id=G-SHXK97DNTD&api_secret=${apiSecret}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              client_id: order.order_number || 'admin-refund',
              events: [{
                name: 'refund',
                params: {
                  transaction_id: order.order_number || order.id,
                  currency: 'USD',
                  value: Number(order.total) || 0,
                  items: refundItems,
                },
              }],
            }),
          },
        );
      }
    } catch (gaErr) {
      console.error('GA4 refund event failed:', gaErr.message);
    }

    return Response.json({
      status: 'ok',
      order_number: order.order_number,
      refund_id: refund.id,
      amount_refunded: refund.amount / 100,
    });
  } catch (error) {
    console.error('refundOrder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});