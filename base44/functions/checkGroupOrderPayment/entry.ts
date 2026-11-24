import { createClientFromRequest } from 'npm:@base44/sdk';
import { closeIfDue, groupView } from '../../shared/groupOrderView.ts';
import { settleGroupTicket } from '../../shared/groupOrderTicket.ts';
import { cleanCode, findGroup } from '../../shared/groupOrderAccess.ts';

// Back from the secure payment page: ask the provider's own record whether the
// group ticket was paid, and only then create the paid order. The webhook does the
// same thing; this is the page's own check so the group updates the moment the
// payer returns, and both paths are idempotent.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const code = cleanCode(body?.code);
    if (!code) return Response.json({ error: 'That group link is missing its code.' }, { status: 400 });

    const existing = await findGroup(base44, code);
    if (!existing) return Response.json({ error: 'We could not find that group. Check the link and try again.' }, { status: 404 });

    let group = await closeIfDue(base44, existing);
    // The payments reader lives on the client itself; the service-role view is
    // used when it exposes one.
    const payments = base44?.asServiceRole?.payments || base44?.payments;
    if (group.status !== 'paid') {
      const purchases = await base44.asServiceRole.entities.Base44Purchase.filter({ productId: `group:${group.code}` }, '-created_date', 10);
      for (const purchase of (purchases || [])) {
        const checkoutId = String(purchase?.checkoutSessionId || '').trim();
        if (!checkoutId) continue;
        try {
          if (!payments?.listPurchases) throw new Error('the payment record is not readable here');
          const page = await payments.listPurchases({ checkout_id: checkoutId, limit: 5 });
          const paid = (page?.items || [])[0];
          if (!paid || paid.status !== 'paid') continue;
          const lines = await base44.asServiceRole.entities.GroupOrderLine.filter({ group_order_id: group.id }, 'created_date', 200);
          const amount = paid.amount_total != null ? Number(paid.amount_total) / 100 : Number(purchase.amount);
          const settled = await settleGroupTicket(base44, {
            group,
            lines,
            amount,
            checkoutSessionId: checkoutId,
            buyerEmail: purchase.buyerEmail || '',
          });
          if (!settled.ok) {
            console.error(`checkGroupOrderPayment: settlement failed for ${group.code} —`, settled.error);
            continue;
          }
          group = await base44.asServiceRole.entities.GroupOrder.get(group.id);
          break;
        } catch (error) {
          console.error(`checkGroupOrderPayment: could not read the payment for ${group.code} —`, (error as Error).message);
        }
      }
    }

    const view = await groupView(base44, group);
    return Response.json({ ok: true, ...view });
  } catch (error) {
    console.error('checkGroupOrderPayment error:', (error as Error).message);
    return Response.json({ error: 'We could not check that payment. Please try again.' }, { status: 500 });
  }
}