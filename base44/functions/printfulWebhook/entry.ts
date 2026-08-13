import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Receives Printful webhook events and mirrors fulfillment status + tracking
// onto the matching MerchOrder. Register this endpoint URL in your Printful
// store's webhook settings.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const type = body.type || body.event;
    const data = body.data || {};
    const order = data.order || data;
    const printfulOrderId = order.id;

    if (!printfulOrderId) {
      return Response.json({ received: true, ignored: true });
    }

    const status = order.status || "";
    const shipments = order.shipments || [];
    const tracking = shipments[0] || {};

    const updates: Record<string, string> = {};
    if (status) updates.fulfillment_status = status;
    if (tracking.tracking_number) updates.tracking_number = tracking.tracking_number;
    if (tracking.tracking_url) updates.tracking_url = tracking.tracking_url;

    const existing = await base44.asServiceRole.entities.MerchOrder.filter({
      printful_order_id: String(printfulOrderId),
    });
    if (existing?.[0]) {
      await base44.asServiceRole.entities.MerchOrder.update(existing[0].id, updates);
      console.log(`Printful webhook ${type}: updated merch order ${existing[0].order_number}`);
    } else {
      console.warn(`Printful webhook ${type}: no MerchOrder for printful_order_id ${printfulOrderId}`);
    }

    return Response.json({ received: true, type, printfulOrderId });
  } catch (error) {
    console.error("printfulWebhook error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}