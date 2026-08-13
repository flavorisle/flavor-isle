import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { placeOrder } from "../../shared/printful.ts";

// Places a Printful fulfillment order for a paid MerchOrder. Invoked by the
// Stripe webhook once a merch checkout is paid; can also be re-run by an admin
// to retry a failed submission.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { merchOrderId } = body;
    if (!merchOrderId) {
      return Response.json({ error: "merchOrderId is required" }, { status: 400 });
    }

    const orders = await base44.asServiceRole.entities.MerchOrder.filter({ id: merchOrderId });
    const order = orders?.[0];
    if (!order) {
      return Response.json({ error: "MerchOrder not found" }, { status: 404 });
    }
    if (order.printful_order_id) {
      return Response.json({ printful_order_id: order.printful_order_id, already: true });
    }

    const items = (order.items || []).map((i: any) => ({
      sync_variant_id: i.sync_variant_id,
      quantity: i.quantity,
      retail_price: i.price,
    }));
    const recipient = order.shipping_address || {};

    const result = await placeOrder({
      external_id: order.order_number,
      recipient,
      items,
      retail_costs: {
        currency: "USD",
        subtotal: order.subtotal,
        shipping: order.shipping,
        total: order.total,
      },
    });

    await base44.asServiceRole.entities.MerchOrder.update(order.id, {
      printful_order_id: String(result.id),
      fulfillment_status: "placed",
    });

    return Response.json({ printful_order_id: result.id, status: result.status });
  } catch (error) {
    console.error("createPrintfulOrder error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}