import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Twilio } from 'npm:twilio';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { order_number, items, special_instructions, order_type, customer_name, customer_phone, table_number, delivery_address } = body;

    if (!order_number) {
      return Response.json({ error: 'Missing order_number' }, { status: 400 });
    }

    // Format items for kitchen display
    const itemsText = (items || [])
      .map(item => `${item.quantity}x ${item.name}${item.selectedModifiers ? ' (' + item.selectedModifiers.map(m => m.name).join(', ') + ')' : ''}`)
      .join('\n');

    // Format message based on order type with customer info
    let kitchenMessage = '';
    if (order_type === 'pickup') {
      kitchenMessage = `🔔 PICKUP #${order_number}\nName: ${customer_name || 'N/A'}\nPhone: ${customer_phone || 'N/A'}`;
    } else if (order_type === 'call_in' || !order_type) {
      kitchenMessage = `🔔 CALL IN #${order_number}\nName: ${customer_name || 'N/A'}\nPhone: ${customer_phone || 'N/A'}`;
    } else if (order_type === 'dine_in') {
      kitchenMessage = `🔔 DINE IN #${order_number}\nTable: ${table_number || 'N/A'}\nName: ${customer_name || 'N/A'}`;
    } else if (order_type === 'delivery') {
      kitchenMessage = `🔔 DELIVERY #${order_number}\nName: ${customer_name || 'N/A'}\nAddress: ${delivery_address || 'N/A'}\nPhone: ${customer_phone || 'N/A'}`;
    }

    kitchenMessage += `\n\n${itemsText}${special_instructions ? '\n\n⚠️ SPECIAL INSTRUCTIONS:\n' + special_instructions : ''}`;

    // Send to kitchen via Twilio SMS to kitchen phone
    const client = new Twilio(
      Deno.env.get('TWILIO_ACCOUNT_SID'),
      Deno.env.get('TWILIO_AUTH_TOKEN')
    );

    await client.messages.create({
      from: Deno.env.get('TWILIO_PHONE_NUMBER'),
      to: '+12805634618', // Kitchen phone number (Flavor Isle main line)
      body: kitchenMessage,
    });

    console.log(`Kitchen notification sent for order #${order_number}`);
    return Response.json({ success: true, message: 'Kitchen notified' });
  } catch (error) {
    console.error('printKitchenOrder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});