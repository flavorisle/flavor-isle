import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { closeIfDue } from '../../shared/groupOrderView.ts';
import { groupTicket } from '../../shared/groupOrderTicket.ts';
import { openWixCheckoutSession, resolveAppUrl, wixCheckoutConfigured } from '../../shared/wixCheckout.ts';
import { getMenuSettingRecord, getUnifiedStoreState } from '../../shared/storeState.ts';
import { chicagoParts } from '../../shared/busynessTime.ts';
import { cleanCode, cleanName, findGroup, round2 } from '../../shared/groupOrderAccess.ts';

// One payment for the whole group (issue #356).
//
// The ticket is repriced here from the live menu through the app's existing
// pricing authority, and ONE secure payment session is opened for exactly that
// amount. The Order row is deliberately NOT created yet — it is created by
// settleGroupTicket only once the provider's own record proves the money arrived,
// so an unpaid group never reaches the kitchen.
function toMins(time: string): number | null {
  const [h, m] = String(time || '').split(':').map(Number);
  if (!Number.isFinite(h)) return null;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const code = cleanCode(body?.code);
    const payerName = cleanName(body?.payer_name, 40);

    if (!code) return Response.json({ error: 'That group link is missing its code.' }, { status: 400 });
    if (!payerName) return Response.json({ error: 'Add the name of the person paying.' }, { status: 400 });

    const existing = await findGroup(base44, code);
    if (!existing) return Response.json({ error: 'We could not find that group. Check the link and try again.' }, { status: 404 });

    const group = await closeIfDue(base44, existing);
    if (group.status === 'paid') {
      return Response.json({ error: 'This group has already been paid.', paid: true }, { status: 409 });
    }
    if (group.status !== 'open') {
      return Response.json({ error: 'This group has closed. An unpaid group is not sent to the kitchen.' }, { status: 409 });
    }

    const lines = await base44.asServiceRole.entities.GroupOrderLine.filter({ group_order_id: group.id }, 'created_date', 200);
    if (!lines || lines.length === 0) {
      return Response.json({ error: 'Nobody has added anything yet.' }, { status: 400 });
    }

    // Pickup only, and only while the store is actually taking pickup orders.
    const store = await getUnifiedStoreState(base44);
    if (!store.open) {
      const why = store.closure?.active || !store.orderingEnabled
        ? store.statusMessage || 'We are not taking orders right now.'
        : 'We are closed right now, so this group cannot be placed yet.';
      return Response.json({ error: why }, { status: 409 });
    }
    const setting = await getMenuSettingRecord(base44);
    const cutoffMins = Number(setting?.pickup_cutoff_minutes ?? 15) || 15;
    const closeMins = toMins(String(store.effectiveCloseToday || '').slice(0, 5));
    if (closeMins != null) {
      const nowParts = chicagoParts(new Date().toISOString());
      const nowMins = nowParts.hour * 60 + nowParts.minute;
      if (closeMins - nowMins < cutoffMins) {
        return Response.json({ error: 'We have stopped taking pickup orders for today. Please try again when we open.' }, { status: 409 });
      }
    }

    const ticket = await groupTicket(base44, lines);
    if (!ticket.ok) return Response.json({ error: ticket.error }, { status: 400 });
    if (!(Number(ticket.total) >= 0.5)) {
      return Response.json({ error: 'A group ticket must be at least $0.50 to pay by card.' }, { status: 400 });
    }

    // The payer is recorded on the group; it only means something once the ticket
    // is actually paid, which is what settlement writes.
    await base44.asServiceRole.entities.GroupOrder.update(group.id, { paid_by_name: payerName });

    if (!wixCheckoutConfigured()) {
      console.error('payGroupOrder: the secure payment page is not configured');
      return Response.json({ error: 'The secure payment page is not available right now. Please try again later.' }, { status: 503 });
    }

    const appUrl = resolveAppUrl(req);
    let session;
    try {
      session = await openWixCheckoutSession(base44, {
        orderNumber: group.code,
        itemName: `${String(group.title || 'Group order').slice(0, 120)} — group order`,
        productId: `group:${group.code}`,
        amount: round2(Number(ticket.total)),
        appUrl,
        thankYouPath: `/group-order/${group.code}?paid=1`,
        postFlowPath: `/group-order/${group.code}?paid=1`,
      });
    } catch (sessionError) {
      console.error('payGroupOrder: the secure payment page could not be opened —', (sessionError as Error).message);
      return Response.json({ error: 'The secure payment page could not be opened, so nothing was charged. Please try again.' }, { status: 502 });
    }

    return Response.json({ ok: true, checkoutUrl: session.redirectUrl, total: round2(Number(ticket.total)) });
  } catch (error) {
    console.error('payGroupOrder error:', (error as Error).message);
    return Response.json({ error: 'The group ticket could not be opened. Please try again.' }, { status: 500 });
  }
}