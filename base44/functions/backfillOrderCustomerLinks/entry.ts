import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { maintenanceGate } from '../../shared/maintenanceGate.ts';
import { loadCustomerProfileIndex, linkForOrder } from '../../shared/customerLink.ts';

// Issue #96, section A step 3 — the one-time order-linking backfill.
//
// Every existing order with order_source="online" gets its normalized_phone
// from customer_phone and its customer_id from the matching CustomerProfile
// (normalized phone first, then email). In-store ("Walk-In") orders are left
// unlinked on purpose: they belong to no online customer, and the Customers
// page counts them so they are visible rather than hidden.
//
// Safely repeatable: an order already carrying the right link is skipped, so a
// second run reports nothing to do. Pass { "dryRun": true } to preview.
// No orders are created, changed in status, or charged by this function.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const gate = await maintenanceGate(base44, req, body, {
      functionName: 'backfillOrderCustomerLinks',
      windowMs: 30 * 60 * 1000,
    });
    if (!gate.ok) return gate.error;

    const dryRun = body?.dryRun === true;
    const index = await loadCustomerProfileIndex(base44);

    let scanned = 0;
    let toUpdate = 0;
    let updated = 0;
    let linked = 0;
    let phoneOnly = 0;
    let unchanged = 0;
    let cursor: string | undefined;

    for (let page = 0; page < 20; page++) {
      const result = await base44.asServiceRole.entities.Order.filter(
        { order_source: 'online' },
        { limit: 500, ...(cursor ? { cursor } : {}) },
      );
      const items = result?.items || [];

      const patches: Array<{ id: string; normalized_phone: string; customer_id: string }> = [];
      for (const order of items) {
        scanned++;
        const link = linkForOrder(index, order);
        if (link.customer_id) linked++;
        else phoneOnly++;

        if ((order.normalized_phone || '') === link.normalized_phone && (order.customer_id || '') === link.customer_id) {
          unchanged++;
          continue;
        }
        patches.push({ id: order.id, ...link });
      }

      toUpdate += patches.length;
      if (patches.length > 0 && !dryRun) {
        await base44.asServiceRole.entities.Order.bulkUpdate(patches);
        updated += patches.length;
      }

      if (!result?.has_more || !result.next_cursor) break;
      cursor = result.next_cursor;
    }

    console.log(
      `Customer-link backfill ${dryRun ? '(dry run) ' : ''}complete: ${scanned} online orders scanned, ${dryRun ? toUpdate : updated} written, ${linked} matched a profile, ${phoneOnly} phone-only, ${unchanged} already correct, ${index.byPhone.size} profile phones / ${index.byEmail.size} profile emails indexed.`,
    );

    return Response.json({
      ok: true,
      dry_run: dryRun,
      scanned_online_orders: scanned,
      updated: dryRun ? 0 : updated,
      would_update: dryRun ? toUpdate : undefined,
      matched_profile: linked,
      phone_only: phoneOnly,
      already_correct: unchanged,
      profiles_indexed_by_phone: index.byPhone.size,
      profiles_indexed_by_email: index.byEmail.size,
    });
  } catch (error) {
    console.error('backfillOrderCustomerLinks error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}