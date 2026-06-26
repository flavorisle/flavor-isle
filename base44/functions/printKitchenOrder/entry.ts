import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Twilio } from 'npm:twilio';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { order_number, items, special_instructions, order_type } = body;

    if (!order_number) {
      return Response.json({ error: 'Missing order_number' }, { status: 400 });
    }

    // Format items for kitchen display
    const itemsText = (items || [])
      .map(item => `${item.quantity}x ${item.name}${item.selectedModifiers ? ' (' + item.selectedModifiers.map(m => m.name).join(', ') + ')' : ''}`)
      .join('\n');

    // Format header based on order type
    let orderTypeLabel = 'ORDER';
    if (order_type === 'pickup') {
      orderTypeLabel = 'PICKUP';
    } else if (order_type === 'dine_in') {
      orderTypeLabel = 'DINE IN';
    } else if (order_type === 'delivery') {
      orderTypeLabel = 'DELIVERY';
    } else if (order_type === 'call_in' || !order_type) {
      orderTypeLabel = 'CALL IN';
    }

    const kitchenMessage = `🔔 ${orderTypeLabel} ORDER #${order_number}\n\n${itemsText}${special_instructions ? '\n\n⚠️ SPECIAL INSTRUCTIONS:\n' + special_instructions : ''}`;

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