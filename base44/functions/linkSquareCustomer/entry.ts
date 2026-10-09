import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { mapSquareStatus, mapSquarePaymentStatus } from '../../shared/squareOrderStatus.ts';

const SQUARE_API = 'https://connect.squareup.com/v2';
const SQUARE_VERSION = '2026-09-16';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, full_name } = body || {};

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    const connection = await base44.asServiceRole.connectors.getConnection('square');
    if (!connection?.accessToken) {
      return Response.json({ error: 'Square is not connected' }, { status: 400 });
    }

    const headers = {
      'Authorization': `Bearer ${connection.accessToken}`,
      'Content-Type': 'application/json',
      'Square-Version': SQUARE_VERSION,
    };

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Look up an existing Square customer by email.
    let customerId = null;
    try {
      const searchRes = await fetch(`${SQUARE_API}/customers/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: {
            filter: {
              email_address: { exact: normalizedEmail },
            },
          },
          limit: 1,
        }),
      });
      const searchData = await searchRes.json();
      customerId = searchData?.customers?.[0]?.id || null;
    } catch (err) {
      console.error('Square customer search failed:', err.message);
    }

    // 2. If no Square customer exists, create one so future POS orders link to them.
    if (!customerId) {
      try {
        const createRes = await fetch(`${SQUARE_API}/customers`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            idempotency_key: `base44-link-${normalizedEmail}-${Date.now()}`,
            email_address: normalizedEmail,
            given_name: full_name || '',
          }),
        });
        const createData = await createRes.json();
        customerId = createData?.customer?.id || null;
      } catch (err) {
        console.error('Square customer create failed:', err.message);
      }
    }

    if (!customerId) {
      return Response.json({
        success: true,
        linked: false,
        message: 'No Square customer record found or creatable',
      });
    }

    // 3. Pull all Square orders for this customer.
    const squareOrders = [];
    let cursor = null;
    do {
      const ordersRes = await fetch(`${SQUARE_API}/orders/search`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          query: {
            filter: {
              customer_filter: {
                customer_ids: [customerId],
              },
            },
          },
          limit: 100,
          cursor: cursor || undefined,
        }),
      });
      const ordersData = await ordersRes.json();
      (ordersData?.orders || []).forEach((o) => squareOrders.push(o));
      cursor = ordersData?.cursor || null;
    } while (cursor);

    // 4. Import/update local Order records so they appear in the account history.
    let updatedCount = 0;
    let createdCount = 0;

    for (const so of squareOrders) {
      const matches = await base44.asServiceRole.entities.Order.filter({ square_order_id: so.id }) || [];

      if (matches.length > 0) {
        // Existing local order — backfill the real customer info.
        const existing = matches[0];
        await base44.asServiceRole.entities.Order.update(existing.id, {
          customer_email: normalizedEmail,
          customer_name:
            existing.customer_name && existing.customer_name !== 'POS Customer'
              ? existing.customer_name
              : (full_name || 'Square Customer'),
        });
        updatedCount += 1;
      } else {
        const items = (so.line_items || []).map((item) => ({
          name: item.name || 'Item',
          quantity: item.quantity ? parseInt(item.quantity) : 1,
          price: item.gross_sales_money ? item.gross_sales_money.amount / 100 : 0,
        }));
        const total = so.total_money ? so.total_money.amount / 100 : 0;
        await base44.asServiceRole.entities.Order.create({
          order_number: so.reference_id || so.id.substring(0, 8),
          square_order_id: so.id,
          order_type: 'dine_in',
          status: mapSquareStatus(so.state),
          payment_status: mapSquarePaymentStatus(so.state),
          items,
          subtotal: total,
          tax: so.total_tax_money ? so.total_tax_money.amount / 100 : 0,
          total,
          customer_name: full_name || 'Square Customer',
          customer_email: normalizedEmail,
        });
        createdCount += 1;
      }
    }

    // Send a Smashie welcome email so the customer knows their history got synced.
    if (normalizedEmail) {
      try {
        const dtFmt = (iso) =>
          new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const latestDate = squareOrders.length
          ? squareOrders
              .map((o) => o.created_at || 0)
              .sort()
              .reverse()[0]
          : null;
        const dateStr = latestDate ? dtFmt(latestDate) : dtFmt(Date.now());
        const itemCount = squareOrders.reduce(
          (a, o) => a + (o.line_items || []).reduce((b, i) => b + (parseInt(i.quantity) || 1), 0),
          0
        );
        const totalAmt =
          squareOrders.reduce((a, o) => a + (o.total_money?.amount || 0), 0) / 100;

        let body;
        if (squareOrders.length > 0) {
          const label = squareOrders.length === 1 ? 'one past order' : `${squareOrders.length} past orders`;
          body = `Hey ${full_name || 'fam'},

Welcome to Flavor Isle — you're officially tapped in. We spotted ${label} under your info and synced it to your account so your whole history stays tight and in one place.

ORDER ADDED
${dateStr} • ${itemCount} item${itemCount !== 1 ? 's' : ''} • $${totalAmt.toFixed(2)}

View my order history — head to the Account page in the Flavor Isle app.

— Pull up soon.
Smashie & The Flavor Isle Team
103 N Main St, Smiths Grove, KY 42171
(270) 563-4618`;
        } else {
          body = `Hey ${full_name || 'fam'},

Welcome to Flavor Isle — you're officially tapped in. No past orders under your info yet, but now that your account's linked, every order you place from here on out gets logged so your history stays tight.

— Pull up soon.
Smashie & The Flavor Isle Team
103 N Main St, Smiths Grove, KY 42171
(270) 563-4618`;
        }

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: normalizedEmail,
          from_name: 'Smashie',
          subject: `Welcome to Flavor Isle, fam 🔥`,
          body,
        });
      } catch (e) {
        console.error('Welcome email failed:', e.message);
      }
    }

    return Response.json({
      success: true,
      linked: true,
      squareCustomerId: customerId,
      squareOrderCount: squareOrders.length,
      updatedCount,
      createdCount,
    });
  } catch (error) {
    console.error('linkSquareCustomer error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});