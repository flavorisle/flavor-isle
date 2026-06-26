import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const connection = await base44.asServiceRole.connectors.getConnection('square');
    
    if (!connection?.accessToken) {
      return Response.json({ error: 'Square not connected' }, { status: 400 });
    }

    // Fetch orders from Square
    const squareResponse = await fetch('https://connect.squareup.com/v2/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${connection.accessToken}`,
        'Content-Type': 'application/json',
        'Square-Version': '2024-01-18'
      },
      body: JSON.stringify({
        query: {
          filter: {
            date_time_filter: {
              created_at: {
                start_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
              }
            }
          },
          limit: 100
        }
      })
    });

    const squareData = await squareResponse.json();
    const squareOrders = squareData.orders || [];

    // Sync Square POS orders into Order entity
    const existingOrders = await base44.asServiceRole.entities.Order.list();
    const squareOrderIds = new Set(existingOrders
      .filter(o => o.square_order_id)
      .map(o => o.square_order_id));

    const newOrders = squareOrders
      .filter(so => !squareOrderIds.has(so.id))
      .map(so => ({
        order_number: so.reference_id || so.id.substring(0, 8),
        square_order_id: so.id,
        customer_name: so.customer_id ? 'POS Customer' : 'Walk-In',
        customer_email: 'square-pos@flavorisle.com',
        order_type: 'dine_in',
        status: mapSquareStatus(so.state),
        items: (so.line_items || []).map(item => ({
          name: item.name || 'Item',
          quantity: item.quantity ? parseInt(item.quantity) : 1,
          price: item.gross_sales_money ? (item.gross_sales_money.amount / 100) : 0
        })),
        total: so.total_money ? (so.total_money.amount / 100) : 0,
        subtotal: so.total_money ? (so.total_money.amount / 100) : 0,
        tax: so.total_tax_money ? (so.total_tax_money.amount / 100) : 0,
        payment_status: 'paid'
      }));

    if (newOrders.length > 0) {
      await base44.asServiceRole.entities.Order.bulkCreate(newOrders);
    }

    // Calculate hourly metrics for today
    const today = new Date().toISOString().split('T')[0];
    const allOrders = await base44.asServiceRole.entities.Order.list();
    const todayOrders = (allOrders || []).filter(o => 
      o.created_date.startsWith(today) && 
      ['pending', 'confirmed', 'preparing', 'ready'].includes(o.status)
    );

    // Group by hour
    const hourlyMap = {};
    todayOrders.forEach(order => {
      const hour = new Date(order.created_date).getHours();
      hourlyMap[hour] = (hourlyMap[hour] || 0) + 1;
    });

    // Update or create hourly metrics
    const existingMetrics = await base44.asServiceRole.entities.HourlyMetrics.filter({ date: today });
    const metricsMap = {};
    (existingMetrics || []).forEach(m => {
      metricsMap[m.hour] = m.id;
    });

    for (let hour = 0; hour < 24; hour++) {
      const count = hourlyMap[hour] || 0;
      const level = count >= 8 ? 'Expecting a Short Wait' : count >= 5 ? 'A Little Busy' : 'Running Smooth';

      if (metricsMap[hour]) {
        await base44.asServiceRole.entities.HourlyMetrics.update(metricsMap[hour], {
          order_count: count,
          busyness_level: level
        });
      } else {
        await base44.asServiceRole.entities.HourlyMetrics.create({
          hour,
          date: today,
          order_count: count,
          busyness_level: level,
          source: 'square_pos'
        });
      }
    }

    return Response.json({ 
      success: true, 
      newOrders: newOrders.length,
      metricsUpdated: true 
    });
  } catch (error) {
    console.error('Square sync error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function mapSquareStatus(squareState) {
  const map = {
    'OPEN': 'pending',
    'COMPLETED': 'completed',
    'CANCELED': 'cancelled'
  };
  return map[squareState] || 'pending';
}