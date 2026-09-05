import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { formatItemModifiers } from '../../shared/ticketFormat.ts';

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
    const body = await req.json();

    const { order_number, items, special_instructions, order_type, customer_name, customer_phone, table_number, delivery_address } = body;

    if (!order_number) {
      return Response.json({ error: 'Missing order_number' }, { status: 400 });
    }

    // Format items for kitchen display. Deluxe preset toppings print as the
    // preset label ("Deluxe" / "Deluxe, no Tomato") instead of a raw list.
    const itemsText = (items || [])
      .map(item => {
        const mods = formatItemModifiers(item).join(', ');
        return `${item.quantity}x ${item.name}${mods ? ' (' + mods + ')' : ''}`;
      })
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
    await sendTwilioSms(
      Deno.env.get('TWILIO_ACCOUNT_SID'),
      Deno.env.get('TWILIO_AUTH_TOKEN'),
      Deno.env.get('TWILIO_PHONE_NUMBER'),
      '+12705634618', // Kitchen phone number (Flavor Isle main line)
      kitchenMessage,
    );

    console.log(`Kitchen notification sent for order #${order_number}`);
    return Response.json({ success: true, message: 'Kitchen notified' });
  } catch (error) {
    console.error('printKitchenOrder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});