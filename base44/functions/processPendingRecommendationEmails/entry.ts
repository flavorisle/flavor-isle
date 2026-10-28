import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { loadBlockFilter } from '../../shared/blockedContacts.ts';

// Message consolidation (Oct 28 2026): this scheduler now dispatches the ONE
// customer thank-you email and nothing else — no separate review-request email
// and no review text. Finds online orders created between 2 and 48 hours ago
// that haven't received it yet and dispatches one
// sendOrderRecommendationEmail call per qualifying order.
//
// Quiet hours: runs only 10 AM–9 PM store local (America/Chicago). Outside that
// window it returns immediately, so no customer is emailed overnight; held
// orders go out on the first in-window run.
//
// The per-order function owns all guardrails (skip POS/test, 7-day dedup,
// already-sent) — this function just finds candidates.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);

    // ── Quiet hours (9 PM–10 AM store local) ──
    const storeHour = parseInt(
      new Intl.DateTimeFormat('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false }).format(new Date()),
      10
    );
    if (storeHour >= 21 || storeHour < 10) {
      return Response.json({ ok: true, skipped: true, reason: 'quiet hours (9 PM–10 AM store local)' });
    }

    // 2 hours ago (lower bound — the meal is over) to 48 hours ago (upper
    // bound — don't bother with very old orders that were already missed).
    const lowerBound = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const upperBound = new Date(Date.now() - 48 * 60 * 60 * 1000);

    // Recent online orders (sorted newest first). We do NOT filter by
    // payment_status here because many completed online orders sit at
    // payment_status 'pending' (pay-at-pickup / payment sync lag) and those
    // customers still deserve a recommendation email. The per-order function
    // owns the real guardrails (skip cancelled / failed / refunded).
    const orders = await base44.asServiceRole.entities.Order.filter(
      { order_source: 'online' },
      '-created_date',
      200,
    );

    // Keep only orders created between 2 and 48 hours ago, and exclude
    // cancelled / failed / refunded orders up front so we don't waste a send
    // attempt on them.
    // Issue #93 (A5): blocked customers are filtered out at selection time so
    // their orders never re-enter the queue. A failed block read is not fatal
    // here — sendOrderRecommendationEmail re-checks every order before sending.
    let blockFilter = null;
    try {
      blockFilter = await loadBlockFilter(base44);
    } catch (e) {
      console.error('Block-list lookup failed, selecting candidates unfiltered:', e.message);
    }

    const qualifying = (orders || []).filter((o) => {
      if (!o.created_date) return false;
      if (o.status === 'cancelled') return false;
      if (o.payment_status === 'failed' || o.payment_status === 'refunded') return false;
      if (blockFilter && (blockFilter.hasEmail(o.customer_email) || blockFilter.hasPhone(o.customer_phone))) return false;
      // Permanently skipped by sendOrderRecommendationEmail (no eligible
      // non-malt/sundae dessert / no photos) — don't re-enqueue.
      if (o.rec_email_skipped_at) return false;
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