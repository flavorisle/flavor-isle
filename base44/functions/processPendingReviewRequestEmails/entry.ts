import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { loadBlockFilter } from '../../shared/blockedContacts.ts';

// Scheduled companion to sendReviewRequestEmail. Finds online orders ~3 hours
// old that haven't received a review-request email yet and dispatches one
// sendReviewRequestEmail call per qualifying order. The per-order function
// owns all guardrails (skip POS/test, 30-day dedup, already-sent).
//
// Quiet hours: if the 3-hour mark falls between 9 PM and 10 AM store local
// (America/Chicago), the email is held and sent at 10 AM instead. This is
// implemented simply: while we're inside quiet hours we skip ALL sends; once
// quiet hours end (10 AM), every qualifying 3+ hour-old order that was held
// back goes out in one batch.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);

    // ── Quiet hours check (9 PM–10 AM store local) ──
    const now = new Date();
    const storeHour = parseInt(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'America/Chicago',
        hour: 'numeric',
        hour12: false,
      }).format(now),
      10
    );
    const inQuietHours = storeHour >= 21 || storeHour < 10;
    if (inQuietHours) {
      return Response.json({ ok: true, skipped: true, reason: 'quiet hours (9 PM–10 AM store local)' });
    }

    // ── Find candidate orders ──
    // Lower bound: 3 hours ago (they've eaten). Upper bound: 48 hours ago
    // (don't bother with very old orders that were already missed).
    const lowerBound = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const upperBound = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const orders = await base44.asServiceRole.entities.Order.filter(
      { order_source: 'online' },
      '-created_date',
      200,
    );

    // Issue #93 (A7): blocked customers are filtered out at selection time so
    // their orders never re-enter the queue. A failed block read is not fatal
    // here — sendReviewRequestEmail re-checks every order before sending.
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
      const created = new Date(o.created_date);
      return created <= lowerBound && created >= upperBound;
    });

    // Dedup: load existing review-request records so we don't re-dispatch.
    const sent = await base44.asServiceRole.entities.ReviewRequestEmail.list('-updated_date', 200);
    const sentOrderIds = new Set((sent || []).map((r) => r.order_id));

    let processed = 0;
    let skipped = 0;
    for (const order of qualifying) {
      if (sentOrderIds.has(order.id)) {
        skipped++;
        continue;
      }
      try {
        const res = await base44.asServiceRole.functions.invoke('sendReviewRequestEmail', {
          order_id: order.id,
        });
        if (res?.ok) processed++;
        else skipped++;
      } catch (e) {
        console.error(`Review request dispatch failed for order ${order.id}:`, e.message);
        skipped++;
      }
    }

    return Response.json({ ok: true, found: qualifying.length, processed, skipped });
  } catch (error) {
    console.error('processPendingReviewRequestEmails error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}