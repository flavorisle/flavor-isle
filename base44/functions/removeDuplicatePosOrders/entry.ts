// Issue #124 — one-time cleanup of duplicate POS orders.
//
// syncSquarePOS used to read only the first page of the Order register, so any
// Square pull bigger than that page treated already-synced orders as new and
// re-created them. This removes the copies: for every group of in-store records
// sharing one square_order_id, the OLDEST record is kept and the rest deleted.
//
// MANUAL RUN ONLY. Nothing schedules or triggers this function — no workflow,
// no schedule, no entity trigger. It is invoked by hand, once.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const PAGE_SIZE = 500;
const MAX_PAGES = 60;
const DELETE_CHUNK = 200;

// The stamp the duplicate copies are expected to carry.
const EXPECTED_STAMP = '2026-10-26T17:44:53.138000';

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    // 1. Page through the entire Order register (same walk as the sync fix).
    const orders: any[] = [];
    let cursor: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await base44.asServiceRole.entities.Order.list({ limit: PAGE_SIZE, cursor });
      const items = res?.items || [];
      orders.push(...items);
      cursor = res?.next_cursor || null;
      if (items.length < PAGE_SIZE || !cursor) break;
    }
    console.log(`removeDuplicatePosOrders: register=${orders.length}`);

    // 2. Group only in-store records that carry a non-empty square_order_id.
    //    A null/empty square_order_id is ignored, and so is any other source.
    const groups = new Map<string, any[]>();
    for (const order of orders) {
      if (order.order_source !== 'in_store') continue;
      const squareId = typeof order.square_order_id === 'string' ? order.square_order_id.trim() : '';
      if (!squareId) continue;
      if (!groups.has(squareId)) groups.set(squareId, []);
      groups.get(squareId)!.push(order);
    }

    // 3. Keep the oldest record in every group of 2+, delete the rest.
    const extras: Array<{ id: string; square_order_id: string; created_date: string }> = [];
    let duplicateGroups = 0;
    for (const [squareId, records] of groups) {
      if (records.length < 2) continue;
      duplicateGroups += 1;
      const sorted = [...records].sort((a, b) => {
        const byDate = String(a.created_date || '').localeCompare(String(b.created_date || ''));
        return byDate !== 0 ? byDate : String(a.id).localeCompare(String(b.id));
      });
      for (const extra of sorted.slice(1)) {
        extras.push({
          id: extra.id,
          square_order_id: squareId,
          created_date: String(extra.created_date || ''),
        });
      }
    }

    // 4. Split the deletions against the expected stamp.
    const removedOther: string[][] = [];
    let removedExpected = 0;
    for (const extra of extras) {
      if (extra.created_date === EXPECTED_STAMP) removedExpected += 1;
      else removedOther.push([extra.id, extra.square_order_id]);
    }

    // 5. Delete in id chunks, logging every removed id.
    let removed = 0;
    for (let i = 0; i < extras.length; i += DELETE_CHUNK) {
      const chunk = extras.slice(i, i + DELETE_CHUNK);
      for (const extra of chunk) {
        console.log(`removeDuplicatePosOrders: removing ${extra.id} (${extra.square_order_id})`);
      }
      try {
        const res = await base44.asServiceRole.entities.Order.deleteMany({
          id: { $in: chunk.map((extra) => extra.id) },
        } as any);
        removed += Number(res?.deleted) || 0;
      } catch (e) {
        console.error(`removeDuplicatePosOrders: delete chunk at ${i} failed:`, (e as Error).message);
      }
    }

    // 6. What is left in the register.
    let remainingTotal = 0;
    let remainingCursor: string | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const res = await base44.asServiceRole.entities.Order.list({ limit: PAGE_SIZE, cursor: remainingCursor });
      const items = res?.items || [];
      remainingTotal += items.length;
      remainingCursor = res?.next_cursor || null;
      if (items.length < PAGE_SIZE || !remainingCursor) break;
    }

    console.log(
      `removeDuplicatePosOrders: groups_scanned=${groups.size} duplicate_groups=${duplicateGroups} ` +
      `removed=${removed} removed_expected_stamp=${removedExpected} removed_other=${removedOther.length} ` +
      `remaining_total=${remainingTotal}`,
    );
    if (removed !== extras.length) {
      console.error(`removeDuplicatePosOrders: expected to remove ${extras.length}, removed ${removed}`);
    }

    return Response.json({
      success: true,
      groups_scanned: groups.size,
      duplicate_groups: duplicateGroups,
      removed,
      removed_expected_stamp: removedExpected,
      removed_other: removedOther,
      remaining_total: remainingTotal,
    });
  } catch (error) {
    console.error('removeDuplicatePosOrders error:', error?.message || 'unknown error');
    return Response.json({ error: error?.message || 'cleanup failed' }, { status: 500 });
  }
}