import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAdmin } from '../../shared/requireAdmin.ts';

// Send an SMS via the Twilio REST API directly. The Twilio npm SDK throws
// "Unsupported cache mode: default" under Deno, so we call the REST endpoint
// with fetch + Basic auth instead — lighter and runtime-safe.
async function sendTwilioSms(accountSid, authToken, from, to, body) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams({ From: from, To: to, Body: body });
  const auth = btoa(`${accountSid}:${authToken}`);
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio SMS failed (${res.status}): ${text}`);
  }
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const body = await req.json();

    const { order_id, order_number: requestedNumber } = body;
    const order_number = requestedNumber;

    if (!order_number && !order_id) {
      return Response.json({ error: 'Missing order_number or order_id' }, { status: 400 });
    }

    // Look up the real order — the phone number and order type always come from
    // the stored record, never from the request body.
    const order = order_id
      ? await base44.asServiceRole.entities.Order.get(order_id)
      : (await base44.asServiceRole.entities.Order.filter({ order_number }))[0];

    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    const customer_phone = order.customer_phone;
    const order_type = order.order_type;
    if (!customer_phone) {
      return Response.json({ error: 'Order has no phone number on file' }, { status: 400 });
    }

    // Format message based on order type
    let message = '';
    if (order_type === 'delivery') {
      message = `🚗 Your Flavor Isle order #${order.order_number} is ready and on its way! Driver will arrive soon.`;
    } else if (order_type === 'dine_in') {
      message = `🪑 Your Flavor Isle order #${order.order_number} is ready! Head to your table.`;
    } else {
      // pickup or call_in
      message = `✅ Your Flavor Isle order #${order.order_number} is ready for pickup!`;
    }

    await sendTwilioSms(
      Deno.env.get('TWILIO_ACCOUNT_SID'),
      Deno.env.get('TWILIO_AUTH_TOKEN'),
      Deno.env.get('TWILIO_PHONE_NUMBER'),
      customer_phone,
      message,
    );

    console.log(`Order ready alert sent for order #${order.order_number}`);
    return Response.json({ success: true, message: 'Alert sent' });
  } catch (error) {
    console.error('sendOrderReadyAlert error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});