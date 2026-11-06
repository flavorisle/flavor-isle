import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { refundOrderItem } from '../../shared/itemRefund.ts';

// Item-level refund (GitHub issue #116, Part F). Admin-only: this moves money,
// so it takes the same guard as refundOrder.
//
// POST { order_id, item_name, quantity, amount, reason }
// Nothing is scheduled and no sample order is created here: it runs only when
// the crew asks for it from the admin order view or the POS-detection sync.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.error) return auth.error;

    const body = await req.json().catch(() => ({}));
    const { order_id, item_name, quantity, amount, reason } = body || {};

    if (!order_id) return Response.json({ error: 'order_id is required' }, { status: 400 });
    if (!item_name) return Response.json({ error: 'item_name is required' }, { status: 400 });
    if (!(Number(amount) > 0)) return Response.json({ error: 'amount must be greater than zero' }, { status: 400 });

    const result = await refundOrderItem(base44, {
      orderId: order_id,
      itemName: item_name,
      quantity: Math.max(1, Math.floor(Number(quantity) || 1)),
      amount: Number(amount),
      reason: reason || 'Item refunded by Flavor Isle',
      actorEmail: auth.user?.email || 'admin',
      refundId: `item-${order_id}-${Date.now()}`,
    });

    // The shared module reports why nothing moved; the crew sees it verbatim.
    return Response.json(result, { status: result?.ok ? 200 : 409 });
  } catch (error: any) {
    console.error('refundOrderItem error:', error?.message || error);
    return Response.json({ ok: false, error: String(error?.message || error) }, { status: 500 });
  }
}