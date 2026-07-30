import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildLoyaltyStatus, accrueForOrder } from '../../shared/squareLoyalty.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'status';

    // Server-side accrual of Square Star Rewards points for a paid order.
    // Primarily driven from the Stripe webhook via the shared module, but
    // exposed for testing / re-runs.
    if (action === 'accrue') {
      const { square_order_id, email, phone } = body || {};
      if (!square_order_id || !email) {
        return Response.json({ error: 'square_order_id and email are required' }, { status: 400 });
      }
      await accrueForOrder({ squareOrderId: square_order_id, email, phone });
      return Response.json({ success: true });
    }

    // default: live loyalty status for the signed-in customer
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Not signed in' }, { status: 401 });

    let phone: string | undefined;
    try {
      const profiles = await base44.asServiceRole.entities.CustomerProfile.filter({ email: user.email });
      if (profiles?.length) phone = profiles[0].phone || undefined;
    } catch (e) {
      // phone is optional; ignore profile lookup failures
    }

    const status = await buildLoyaltyStatus({ email: user.email, phone });
    return Response.json(status);
  } catch (error) {
    console.error('squareLoyalty error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});