import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { placeOrder } from "../../shared/printful.ts";

// This runs after a payment lands, with no user session, so a non-admin caller
// must prove the order is actually paid before Printful starts producing and
// shipping physical goods at the store's expense. The app only ever writes
// payment_status 'paid' after it has verified the charge to the cent with the
// processor that took the money (Square's secure page or Base44 Payments), so a
// paid record is that proof.
async function merchPaymentPaid(order: any): Promise<boolean> {
  return order?.payment_status === "paid";
}

// Places a Printful fulfillment order for a paid MerchOrder. Invoked by the merch
// settlement the moment a merch payment is verified; can also be re-run by an
// admin to retry a failed submission.
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

    // An admin may retry from the merch admin screen; anyone else (the merch
    // settlement) must present an order the app has already confirmed as paid.
    const user = await base44.auth.me().catch(() => null);
    if (user?.role !== "admin" && !await merchPaymentPaid(order)) {
      console.warn(`createPrintfulOrder: refused unverified order ${order.order_number}`);
      return Response.json({ error: "This order is not paid — fulfillment refused." }, { status: 403 });
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