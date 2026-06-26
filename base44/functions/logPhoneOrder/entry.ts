import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { customer_name, customer_phone, items, order_type, special_instructions, total } = body;

    if (!customer_name || !items || !Array.isArray(items) || items.length === 0) {
      return Response.json({ error: 'Missing required fields: customer_name, items' }, { status: 400 });
    }

    const orderNumber = 'PH' + Date.now().toString().slice(-6);

    const order = await base44.asServiceRole.entities.Order.create({
      order_number: orderNumber,
      order_type: order_type || 'pickup',
      status: 'confirmed',
      items: items,
      subtotal: total || 0,
      tax: Math.round((total || 0) * 0.06 * 100) / 100,
      total: Math.round((total || 0) * 1.06 * 100) / 100,
      customer_name: customer_name,
      customer_phone: customer_phone || '',
      customer_email: 'phone-order@flavorisle.com',
      special_instructions: special_instructions || '',
      payment_status: 'pending',
    });

    return Response.json({
      success: true,
      order_number: orderNumber,
      order_id: order.id,
      message: `Phone order #${orderNumber} logged successfully for ${customer_name}`,
    });
  } catch (error) {
    console.error('logPhoneOrder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});