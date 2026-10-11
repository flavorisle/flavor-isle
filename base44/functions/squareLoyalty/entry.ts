import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { buildLoyaltyStatus, accrueForOrder, hasAccrualEventForOrder, getLoyaltyProgram, earnTextForProgram, describeRewardTier, getRewardTierDiscounts, type ResolvedTierDiscount } from '../../shared/squareLoyalty.ts';

// A phone number is guessable, so the guest lookup is throttled per caller: the
// endpoint must not be usable to walk the phone book and learn who is a Star
// Rewards member and what they have spent.
const LOOKUP_WINDOW_MS = 60 * 60 * 1000;
const LOOKUP_MAX_PER_WINDOW = 20;
const phoneLookups = new Map<string, number[]>();

function allowPhoneLookup(req: Request): boolean {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (phoneLookups.get(ip) || []).filter((at) => now - at < LOOKUP_WINDOW_MS);
  if (recent.length >= LOOKUP_MAX_PER_WINDOW) {
    phoneLookups.set(ip, recent);
    return false;
  }
  recent.push(now);
  phoneLookups.set(ip, recent);
  if (phoneLookups.size > 1000) {
    for (const [key, hits] of phoneLookups) {
      if (!hits.some((at) => now - at < LOOKUP_WINDOW_MS)) phoneLookups.delete(key);
    }
  }
  return true;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'status';

    // Server-side accrual of Square Star Rewards points for a paid order.
    // Primarily driven from the Stripe webhook via the shared module, but
    // exposed for testing / re-runs.
    if (action === 'accrue') {
      const user = await base44.auth.me().catch(() => null);
      if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { square_order_id, email, phone } = body || {};
      if (!square_order_id || (!email && !phone)) {
        return Response.json({ error: 'square_order_id and either email or phone are required' }, { status: 400 });
      }
      try {
        const orders = await base44.asServiceRole.entities.Order.filter({ square_order_id });
        const order = orders?.[0];
        if (!order || order.payment_status !== 'paid') return Response.json({ error: 'Paid website order not found' }, { status: 404 });
        await accrueForOrder({ squareOrderId: square_order_id, email: order.customer_email, phone: order.customer_phone, enroll: order.loyalty_opt_in === true, directWebOrderId: order.direct_web_rewards_v2 === true ? order.id : undefined, skipAccrual: await hasAccrualEventForOrder(square_order_id) });
        return Response.json({ success: true });
      } catch (accrueErr) {
        console.error('accrueForOrder failed:', accrueErr.message);
        return Response.json({ error: accrueErr.message }, { status: 500 });
      }
    }

    // Public program definition — no auth, no customer lookup. Returns the
    // loyalty program name, status, earn rules, and reward catalog so the
    // public /rewards page can show benefits to logged-out visitors.
    if (action === 'program') {
      try {
        const program = await getLoyaltyProgram();
        // Tiers carry a pricing-rule reference rather than an inline discount,
        // so resolve the rules before describing them.
        const tierDiscounts = await getRewardTierDiscounts(program).catch((e: Error) => {
          console.error('Program tier resolution failed:', e.message);
          return new Map<string, ResolvedTierDiscount>();
        });
        const rewardTiers = (program?.reward_tiers || []).map((t: any) => {
          const resolved = tierDiscounts.get(t.id) || null;
          return {
            id: t.id,
            name: t.name,
            points: t.points,
            description: describeRewardTier(t, resolved),
            scope: resolved?.scope || 'ORDER',
          };
        });
        return Response.json({
          programName: program?.name || 'Flavor Isle Star Rewards',
          programStatus: program?.status || 'UNKNOWN',
          earnText: earnTextForProgram(program),
          rewardTiers,
        });
      } catch (programErr) {
        console.error('squareLoyalty program action failed:', (programErr as Error).message);
        return Response.json({
          programName: 'Flavor Isle Star Rewards',
          programStatus: 'ACTIVE',
          earnText: null,
          rewardTiers: [],
        });
      }
    }

    // default: live loyalty status. A phone number passed in the body (e.g.
    // from a guest at checkout) drives a phone-first lookup — Square Star
    // Rewards are keyed by phone, so this works without a signed-in account.
    if (body?.phone) {
      if (!allowPhoneLookup(req)) {
        return Response.json({ error: 'Too many reward lookups — please try again a little later.' }, { status: 429 });
      }
      const phoneStatus: any = await buildLoyaltyStatus({ email: '', phone: body.phone });
      // The signed-in path below reports the full picture; a lookup driven by a
      // typed-in number reports only what checkout needs, never the account id
      // or lifetime spend of whoever owns that number.
      delete phoneStatus.accountId;
      delete phoneStatus.lifetimePoints;
      return Response.json(phoneStatus);
    }

    // No phone provided — fall back to the signed-in customer's saved profile.
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
    // Return a partial status so the UI can still render the program info
    // and reward tiers rather than showing a blank "not connected" state.
    return Response.json({
      programName: 'Flavor Isle Star Rewards',
      programStatus: 'ACTIVE',
      balance: 0,
      lifetimePoints: 0,
      hasAccount: false,
      needsPhone: false,
      earnText: null,
      rewardTiers: [],
    });
  }
});