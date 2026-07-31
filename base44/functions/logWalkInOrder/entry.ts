import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAdmin } from '../../shared/requireAdmin.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const body = await req.json();

    const { items, special_instructions, table_number, customer_name } = body;

    if (!items || items.length === 0) {
      return Response.json({ error: 'Missing items' }, { status: 400 });
    }

    // Calculate totals
    const subtotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
    const tax = subtotal * 0.06;
    const total = subtotal + tax;

    // Generate order number
    const orderNumber = `WI-${Date.now().toString().slice(-8)}`;

    // Create order in database
    const order = await base44.asServiceRole.entities.Order.create({
      order_number: orderNumber,
      order_type: 'dine_in',
      status: 'pending',
      items,
      subtotal,
      tax,
      total,
      customer_name: customer_name || 'Walk-In',
      customer_email: 'walkin@flavorisle.local',
      customer_phone: '',
      table_number: table_number || '',
      special_instructions,
      payment_status: 'paid',
    });

    // Send to kitchen
    await base44.functions.invoke('printKitchenOrder', {
      order_number: orderNumber,
      items,
      special_instructions,
      order_type: 'dine_in',
      customer_name: customer_name || 'Walk-In',
      table_number: table_number || '',
    });

    console.log(`Walk-in order ${orderNumber} created`);
    return Response.json({ success: true, order_id: order.id, order_number: orderNumber });
  } catch (error) {
    console.error('logWalkInOrder error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});