import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Scheduled-job companion to sendOrderRecommendationEmail. Finds paid online
// orders created ~30 minutes ago that haven't received a recommendation email
// yet, and dispatches one sendOrderRecommendationEmail call per qualifying
// order. The per-order function owns all guardrails (skip POS/test, 7-day
// dedup, already-sent) — this function just finds candidates.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);

    // 30 min ago (lower bound) to 2 hours ago (upper bound — don't bother with
    // very old orders that were already missed).
    const lowerBound = new Date(Date.now() - 30 * 60 * 1000);
    const upperBound = new Date(Date.now() - 2 * 60 * 60 * 1000);

    // Recent paid online orders (sorted newest first)
    const orders = await base44.asServiceRole.entities.Order.filter(
      { payment_status: 'paid', order_source: 'online' },
      '-created_date',
      100,
    );

    // Keep only orders created between 30 min and 2 hours ago
    const qualifying = (orders || []).filter((o) => {
      if (!o.created_date) return false;
      const created = new Date(o.created_date);
      return created <= lowerBound && created >= upperBound;
    });

    // Dedup: load existing recommendation-email records so we don't re-dispatch
    const sent = await base44.asServiceRole.entities.RecommendationEmail.list('-updated_date', 200);
    const sentOrderIds = new Set((sent || []).map((r) => r.order_id));

    let processed = 0;
    let skipped = 0;
    for (const order of qualifying) {
      if (sentOrderIds.has(order.id)) {
        skipped++;
        continue;
      }
      try {
        const res = await base44.asServiceRole.functions.invoke('sendOrderRecommendationEmail', {
          order_id: order.id,
        });
        if (res?.ok) processed++;
        else skipped++;
      } catch (e) {
        console.error(`Recommendation dispatch failed for order ${order.id}:`, e.message);
        skipped++;
      }
    }

    return Response.json({ ok: true, found: qualifying.length, processed, skipped });
  } catch (error) {
    console.error('processPendingRecommendationEmails error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}