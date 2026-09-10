import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { fetchOrder } from "../../shared/printful.ts";
import { requireAdmin } from "../../shared/requireAdmin.ts";
import {
  sendMerchInProductionEmail,
  sendMerchFulfilledEmail,
  sendMerchShippedEmail,
} from "../../shared/sendMerchEmails.ts";

// Printful raw order statuses → MerchOrder.fulfillment_status enum (mirrors
// the printfulWebhook handler so on-demand sync stays consistent with it).
const STATUS_MAP: Record<string, string> = {
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

// Admin-only: pulls a merch order's live status from Printful, updates the local
// MerchOrder (status, tracking, status_history), and emails the customer for any
// transition they never got (because the webhook wasn't registered yet). Pass
// { printful_order_id } to sync a single order.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const body = await req.json().catch(() => ({}));
    const printfulOrderId = String(body.printful_order_id || "");
    if (!printfulOrderId) {
      return Response.json({ error: "printful_order_id is required" }, { status: 400 });
    }

    const existing = await base44.asServiceRole.entities.MerchOrder.filter({
      printful_order_id: printfulOrderId,
    });
    const prev = existing?.[0];
    if (!prev) {
      return Response.json({ error: "No MerchOrder matches that printful_order_id" }, { status: 404 });
    }

    const live = await fetchOrder(printfulOrderId);
    const rawStatus = String(live.status || "").toLowerCase();
    const shipments: any[] = live.shipments || [];
    const tracking = shipments[0] || {};

    let normalized = STATUS_MAP[rawStatus] || null;
    if (tracking.tracking_number) normalized = "shipped";

    const history = Array.isArray(prev.status_history) ? [...prev.status_history] : [];
    const updates: Record<string, unknown> = {};
    if (tracking.tracking_number) updates.tracking_number = tracking.tracking_number;
    if (tracking.tracking_url) updates.tracking_url = tracking.tracking_url;
    if (normalized && normalized !== prev.fulfillment_status) {
      updates.fulfillment_status = normalized;
    }

    // Walk the order through every stage from its current local state up to the
    // live state, logging each missing transition and queuing the matching email.
    const orderOf = ["placed", "in_production", "fulfilled", "shipped"];
    const startIndex = orderOf.indexOf(prev.fulfillment_status);
    const endIndex = normalized ? orderOf.indexOf(normalized) : -1;
    const emailsToSend: string[] = [];
    if (normalized && endIndex >= 0 && endIndex > startIndex) {
      for (let i = Math.max(0, startIndex + 1); i <= endIndex; i++) {
        const stage = orderOf[i];
        if (!history.some((h: any) => h.status === stage)) {
          history.push({ status: stage, timestamp: new Date().toISOString() });
          if (stage === "in_production") emailsToSend.push("in_production");
          else if (stage === "fulfilled") emailsToSend.push("fulfilled");
          else if (stage === "shipped") emailsToSend.push("shipped");
        }
      }
    }
    if (history.length !== (prev.status_history?.length || 0)) updates.status_history = history;

    if (Object.keys(updates).length > 0) {
      await base44.asServiceRole.entities.MerchOrder.update(prev.id, updates);
    }

    const merged = { ...prev, ...updates };
    const sent: string[] = [];
    for (const stage of emailsToSend) {
      try {
        if (stage === "in_production") await sendMerchInProductionEmail(merged);
        else if (stage === "fulfilled") await sendMerchFulfilledEmail(merged);
        else if (stage === "shipped") await sendMerchShippedEmail(merged);
        sent.push(stage);
      } catch (mailErr) {
        console.error(`Merch ${stage} email failed:`, (mailErr as Error).message);
      }
    }

    return Response.json({
      success: true,
      order_number: prev.order_number,
      printful_order_id: printfulOrderId,
      previous_status: prev.fulfillment_status,
      live_status: normalized || rawStatus,
      tracking_number: updates.tracking_number || prev.tracking_number || null,
      emails_sent: sent,
      updated: Object.keys(updates),
    });
  } catch (error) {
    console.error("syncMerchFulfillment error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}