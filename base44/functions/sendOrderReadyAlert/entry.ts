import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Twilio } from 'npm:twilio';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { order_id, order_number, customer_name, customer_phone, order_type } = body;

    if (!order_number || !customer_phone) {
      return Response.json({ error: 'Missing order_number or customer_phone' }, { status: 400 });
    }

    const client = new Twilio(
      Deno.env.get('TWILIO_ACCOUNT_SID'),
      Deno.env.get('TWILIO_AUTH_TOKEN')
    );

    // Format message based on order type
    let message = '';
    if (order_type === 'delivery') {
      message = `🚗 Your Flavor Isle order #${order_number} is ready and on its way! Driver will arrive soon.`;
    } else if (order_type === 'dine_in') {
      message = `🪑 Your Flavor Isle order #${order_number} is ready! Head to your table.`;
    } else {
      // pickup or call_in
      message = `✅ Your Flavor Isle order #${order_number} is ready for pickup!`;
    }

    await client.messages.create({
      from: Deno.env.get('TWILIO_PHONE_NUMBER'),
      to: customer_phone,
      body: message,
    });

    console.log(`Order ready alert sent to ${customer_phone} for order #${order_number}`);
    return Response.json({ success: true, message: 'Alert sent' });
  } catch (error) {
    console.error('sendOrderReadyAlert error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});