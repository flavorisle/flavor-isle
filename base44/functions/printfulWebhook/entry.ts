import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
import { hasValidPrintfulKey } from "../../shared/internalRelay.ts";
import {
  sendMerchInProductionEmail,
  sendMerchFulfilledEmail,
  sendMerchShippedEmail,
} from "../../shared/sendMerchEmails.ts";

// Printful raw order statuses → MerchOrder.fulfillment_status enum.
const STATUS_MAP = {
  draft: "placed",
  pending: "placed",
  inprocess: "in_production",
  inproduction: "in_production",
  onhold: "in_production",
  partial: "in_production",
  fulfilled: "fulfilled",
  completed: "fulfilled",
  shipped: "shipped",
  canceled: "canceled",
  cancelled: "canceled",
  failed: "failed",
};

// Receives Printful webhook events and mirrors fulfillment status + tracking
// onto the matching MerchOrder, logging every transition to status_history and
// emailing the customer the first time an order enters production, is
// fulfilled, or ships. Register this endpoint URL in your Printful store's
// webhook settings.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Authenticity: only the URL registered with Printful carries our derived
    // key. Printful echoes configured params either in the URL or in the body,
    // so both are accepted. A forged event can otherwise flip a paid order's
    // fulfillment status and email the customer a tracking link of the sender's
    // choosing.
    const urlKey = new URL(req.url).searchParams.get("key");
    const bodyParams = body?.params;
    const bodyKey = bodyParams && !Array.isArray(bodyParams) ? bodyParams.key : null;
    if (!await hasValidPrintfulKey(urlKey || bodyKey)) {
      console.warn("printfulWebhook: rejected unverified event");
      return new Response("Forbidden", { status: 403 });
    }

    const type = body.type || body.event || "";
    const data = body.data || {};
    const order = data.order || data;
    const printfulOrderId = order.id;

    if (!printfulOrderId) {
      return Response.json({ received: true, ignored: true });
    }

    const rawStatus = String(order.status || "").toLowerCase();
    const shipments = order.shipments || [];
    const tracking = data.shipment || shipments[0] || {};

    let normalized = STATUS_MAP[rawStatus] || null;
    if (type === "package_shipped" || tracking.tracking_number) normalized = "shipped";
    if (type === "order_canceled") normalized = "canceled";
    if (type === "order_failed") normalized = "failed";

    const existing = await base44.asServiceRole.entities.MerchOrder.filter({
      printful_order_id: String(printfulOrderId),
    });
    const prev = existing?.[0];
    if (!prev) {
      console.warn(`Printful webhook ${type}: no MerchOrder for printful_order_id ${printfulOrderId}`);
      return Response.json({ received: true, type, printfulOrderId, matched: false });
    }

    const history = Array.isArray(prev.status_history) ? [...prev.status_history] : [];
    const updates: Record<string, unknown> = {};
    if (tracking.tracking_number) updates.tracking_number = tracking.tracking_number;
    if (tracking.tracking_url) updates.tracking_url = tracking.tracking_url;

    // First time this order has ever been in `normalized` — drives one-shot emails.
    let firstEntry = false;
    if (normalized) {
      if (normalized !== prev.fulfillment_status) updates.fulfillment_status = normalized;
      const last = history[history.length - 1];
      if (!last || last.status !== normalized) {
        firstEntry = !history.some((h) => h.status === normalized);
        history.push({ status: normalized, timestamp: new Date().toISOString() });
        updates.status_history = history;
      }
    }

    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.MerchOrder.update(prev.id, updates);
    }
    console.log(`Printful webhook ${type}: ${prev.order_number} → ${normalized || rawStatus}`);

    const merged = { ...prev, ...updates };
    if (firstEntry && prev.customer_email) {
      try {
        if (normalized === "in_production") await sendMerchInProductionEmail(merged);
        else if (normalized === "fulfilled") await sendMerchFulfilledEmail(merged);
        else if (normalized === "shipped" && !prev.tracking_number) await sendMerchShippedEmail(merged);
      } catch (mailErr) {
        console.error(`Merch ${normalized} email failed:`, mailErr.message);
      }
    }

    return Response.json({ received: true, type, printfulOrderId, status: normalized, emailed: firstEntry });
  } catch (error) {
    console.error("printfulWebhook error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}