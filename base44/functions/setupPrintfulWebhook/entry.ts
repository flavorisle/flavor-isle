import { createClientFromRequest } from "npm:@base44/sdk@0.8.44";
import { getWebhookConfig, setWebhookConfig } from "../../shared/printful.ts";
import { requireAdmin } from "../../shared/requireAdmin.ts";

// The published app endpoint that Printful should POST fulfillment events to.
// The printfulWebhook function lives at /functions/printfulWebhook.
const WEBHOOK_URL = "https://flavor-isle.com/functions/printfulWebhook";

// Events we care about for merch order status emails + tracking. order_updated
// covers status transitions (in production, fulfilled); package_shipped carries
// tracking; order_failed + order_canceled cover problem states.
const EVENT_TYPES = [
  "order_updated",
  "package_shipped",
  "order_failed",
  "order_canceled",
];

// Admin-only: registers (or replaces) the Printful store webhook so fulfillment
// status changes flow into the app and trigger customer emails. Returns the
// previous and new configuration so you can confirm it took.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    let previous: any = null;
    try {
      previous = await getWebhookConfig();
    } catch (e) {
      console.warn("Could not fetch previous webhook config:", (e as Error).message);
    }

    const result = await setWebhookConfig({ url: WEBHOOK_URL, types: EVENT_TYPES });
    console.log("Printful webhook registered:", JSON.stringify(result));
    return Response.json({
      success: true,
      previous,
      current: result,
      webhookUrl: WEBHOOK_URL,
      events: EVENT_TYPES,
    });
  } catch (error) {
    console.error("setupPrintfulWebhook error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}