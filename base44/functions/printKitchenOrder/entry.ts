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
    const normalizedType = order_type?.toLowerCase() || 'call_in';
    
    const orderTypeLabel = {
      'pickup': '🚗 PICKUP',
      'call_in': '☎️ CALL-IN',
      'dine_in': '🍽️ DINE-IN',
      'delivery': '🚚 DELIVERY'
    }[normalizedType] || '☎️ CALL-IN';

    kitchenMessage = `\n═══════════════════\n${orderTypeLabel} ORDER #${order_number}\n═══════════════════`;
    
    if (normalizedType === 'pickup') {
      kitchenMessage += `\n👤 CUSTOMER: ${customer_name || 'N/A'}\n📞 PHONE: ${customer_phone || 'N/A'}\n⏰ READY FOR PICKUP`;
    } else if (normalizedType === 'call_in') {
      kitchenMessage += `\n👤 CUSTOMER: ${customer_name || 'N/A'}\n📞 PHONE: ${customer_phone || 'N/A'}\n⏰ CALL WHEN READY`;
    } else if (normalizedType === 'dine_in') {
      kitchenMessage += `\n👤 CUSTOMER: ${customer_name || 'N/A'}\n🪑 TABLE #: ${table_number || 'N/A'}\n⏰ SERVE AT TABLE`;
    } else if (normalizedType === 'delivery') {
      kitchenMessage += `\n👤 CUSTOMER: ${customer_name || 'N/A'}\n📞 PHONE: ${customer_phone || 'N/A'}\n📍 ADDRESS: ${delivery_address || 'N/A'}\n⏰ READY FOR DELIVERY`;
    }

    kitchenMessage += `\n───────────────────\n${itemsText}${special_instructions ? '\n───────────────────\n⚠️  SPECIAL INSTRUCTIONS:\n' + special_instructions : ''}\n═══════════════════`;

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