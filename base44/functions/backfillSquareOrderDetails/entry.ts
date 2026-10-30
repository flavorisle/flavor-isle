import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { lookupCustomersByIds } from '../../shared/squareCustomer.ts';
import { getAccrualEventForOrder } from '../../shared/squareLoyalty.ts';
import { squareOrderFields } from '../../shared/squareOrderFields.ts';

// Issue #135 — one-time cleanup of in-store orders whose customer data was
// never real: the old square-pos@ placeholder address, an empty phone, or an
// empty customer id. Read-only against Square; only non-empty Square values are
// ever written, and a real stored value is never overwritten.

const SQUARE_API = 'https://connect.squareup.com/v2';
const SQUARE_VERSION = '2026-09-16';
const PLACEHOLDER_EMAIL = 'square-pos@flavorisle.com';
const MAX_PER_RUN = 100;
const LOYALTY_CAP = 50;

function isCandidate(order) {
  return (
    order.customer_email === PLACEHOLDER_EMAIL ||
    !order.customer_email ||
    !order.customer_phone ||
    !order.customer_id
  );
}

function beforeSnapshot(order) {
  return {
    customer_name: order.customer_name || '',
    customer_email: order.customer_email || '',
    customer_phone: order.customer_phone || '',
    customer_id: order.customer_id || '',
    normalized_phone: order.normalized_phone || '',
    tip: order.tip || 0,
    discount: order.discount || 0,
    loyalty_points_earned: order.loyalty_points_earned || 0,
  };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const token = Deno.env.get('SQUARE_ACCESS_TOKEN');
    if (!token) {
      return Response.json({ error: 'SQUARE_ACCESS_TOKEN is not configured' }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    // A call with no body must never write.
    const dryRun = body?.dryRun !== false;
    const limit = Math.min(Math.max(Number(body?.limit) || MAX_PER_RUN, 1), MAX_PER_RUN);
    const skip = Math.max(Number(body?.skip) || 0, 0);

    // Gather candidates page by page, stopping once one batch is in hand.
    const candidates = [];
    let cursor = undefined;
    let pages = 0;
    while (candidates.length < skip + limit && pages < 60) {
      const page = await base44.asServiceRole.entities.Order.filter(
        { order_source: 'in_store' },
        { sort: 'created_date', limit: 100, ...(cursor ? { cursor } : {}) },
      );
      const items = page?.items || [];
      for (const order of items) {
        if (isCandidate(order)) candidates.push(order);
      }
      cursor = page?.next_cursor;
      pages += 1;
      if (!cursor || items.length === 0) break;
    }

    const batch = candidates.slice(skip, skip + limit);
    const hasMore = candidates.length > skip + batch.length || !!cursor;

    // One read-only Square order pull per row.
    const squareOrders = new Map();
    for (const order of batch) {
      if (!order.square_order_id) continue;
      try {
        const res = await fetch(
          `${SQUARE_API}/orders/${encodeURIComponent(order.square_order_id)}`,
          {
            headers: { Authorization: `Bearer ${token}`, 'Square-Version': SQUARE_VERSION },
            signal: AbortSignal.timeout(10000),
          },
        );
        const data = await res.json();
        if (!res.ok) {
          console.error(`RetrieveOrder ${order.square_order_id} failed: ${res.status} ${JSON.stringify(data?.errors || data)}`);
          continue;
        }
        if (data?.order) squareOrders.set(order.id, data.order);
      } catch (e) {
        console.error(`RetrieveOrder ${order.square_order_id} error:`, (e as Error).message);
      }
    }

    // Resolve every referenced Square customer through the chunked lookup.
    const customerIds = new Set();
    for (const so of squareOrders.values()) {
      if (so.customer_id) customerIds.add(so.customer_id);
      (so.tenders || []).forEach((tender) => {
        if (tender.customer_id) customerIds.add(tender.customer_id);
      });
    }
    const customerMap = await lookupCustomersByIds(base44, [...customerIds]);

    const counts = {
      scanned: 0,
      wouldUpdate: 0,
      resolvedWithEmail: 0,
      resolvedWithPhone: 0,
      resolvedNameOnly: 0,
      noSquareCustomer: 0,
      loyaltyFound: 0,
      applied: 0,
    };
    const samples = [];
    const pendingUpdates = [];
    let loyaltyLookups = 0;

    for (const order of batch) {
      counts.scanned += 1;
      const so = squareOrders.get(order.id);
      if (!so) {
        counts.noSquareCustomer += 1;
        continue;
      }

      const tenderCustomerId = (so.tenders || []).map((t) => t.customer_id).find(Boolean) || '';
      const squareCustomerId = so.customer_id || tenderCustomerId;
      const cust = squareCustomerId ? customerMap.get(squareCustomerId) : null;
      const { square_name, square_email, square_phone, ...squareFields } = squareOrderFields(so, cust);

      const hasCustomer = !!squareCustomerId;
      if (!hasCustomer) counts.noSquareCustomer += 1;
      else if (square_email) counts.resolvedWithEmail += 1;
      else if (square_phone) counts.resolvedWithPhone += 1;
      else counts.resolvedNameOnly += 1;

      const after: Record<string, any> = {};
      const fill = (field, value) => {
        if (!value) return;
        if (order[field]) return;
        after[field] = value;
      };

      // Customer identity: only non-empty Square values, never over a real one.
      fill('customer_id', squareFields.customer_id);
      fill('customer_phone', square_phone);
      fill('normalized_phone', squareFields.normalized_phone);

      // Name: replace only an empty or invented name. 'Walk-In' is used only
      // when the order truly has no customer at all.
      const storedName = order.customer_name || '';
      const nameIsUnknown = !storedName || storedName === 'POS Customer';
      const freshName = square_name || (hasCustomer ? '' : 'Walk-In');
      if (freshName && nameIsUnknown && freshName !== storedName) after.customer_name = freshName;

      // Email: the placeholder is cleared when Square has no email, and a real
      // address replaces it (or fills an empty field).
      const storedEmail = order.customer_email || '';
      if (square_email && (!storedEmail || storedEmail === PLACEHOLDER_EMAIL)) {
        after.customer_email = square_email;
      } else if (!square_email && storedEmail === PLACEHOLDER_EMAIL) {
        after.customer_email = '';
      }

      // Money + tender details, only where nothing real is stored yet.
      for (const field of ['tip', 'discount', 'subtotal', 'total', 'tax']) {
        const value = Number(squareFields[field]) || 0;
        if (value > 0 && !(Number(order[field]) > 0)) after[field] = value;
      }
      fill('payment_provider', squareFields.payment_provider);
      fill('square_payment_link_id', squareFields.square_payment_link_id);
      fill('order_type', squareFields.order_type);
      fill('special_instructions', squareFields.special_instructions);
      fill('table_number', squareFields.table_number);

      // Payment: only upgraded, never downgraded, and only on a real tender.
      const alreadySettled = order.payment_status === 'paid' || order.payment_status === 'refunded';
      if (!alreadySettled && squareFields.payment_status === 'paid') {
        after.payment_status = 'paid';
      }

      // Star Rewards: the points Square actually credited, when it has an event.
      if (squareCustomerId && !order.loyalty_accrued && loyaltyLookups < LOYALTY_CAP) {
        loyaltyLookups += 1;
        try {
          const event = await getAccrualEventForOrder(so.id);
          if (event) {
            counts.loyaltyFound += 1;
            const points = Number(
              event.accumulate_points?.points ?? event.accumulate_promotion_points?.points ?? 0,
            ) || 0;
            const accountId = event.loyalty_account_id || '';
            if (accountId && !order.loyalty_account_id) after.loyalty_account_id = accountId;
            after.loyalty_points_earned = points;
            after.loyalty_accrued = true;
          }
        } catch (e) {
          console.error(`Loyalty lookup failed for order ${order.order_number}:`, (e as Error).message);
        }
      }

      if (Object.keys(after).length === 0) continue;

      counts.wouldUpdate += 1;
      if (samples.length < 10) {
        samples.push({
          order_number: order.order_number || order.id,
          before: beforeSnapshot(order),
          after,
        });
      }
      pendingUpdates.push({ id: order.id, order_number: order.order_number || order.id, after });
    }

    if (!dryRun) {
      for (const item of pendingUpdates) {
        try {
          await base44.asServiceRole.entities.Order.update(item.id, item.after);
          counts.applied += 1;
        } catch (e) {
          console.error(`Backfill update failed for order ${item.order_number}:`, (e as Error).message);
        }
      }
      try {
        await base44.asServiceRole.entities.MaintenanceRun.create({
          function_name: 'backfillSquareOrderDetails',
          window_key: `bf-${new Date().toISOString().slice(0, 10)}`,
          last_run_at: new Date().toISOString(),
          run_count: 1,
          last_caller: 'admin',
          description: `Scanned ${counts.scanned}, applied ${counts.applied} of ${counts.wouldUpdate} (skip ${skip})`,
        });
      } catch (e) {
        console.error('MaintenanceRun write failed:', (e as Error).message);
      }
    }

    return Response.json({
      dryRun,
      skip,
      ...counts,
      hasMore,
      nextSkip: skip + batch.length,
      samples,
    });
  } catch (error) {
    console.error('backfillSquareOrderDetails error:', error?.message || 'unknown error');
    return Response.json({ error: error?.message || 'backfill failed' }, { status: 500 });
  }
}