import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { todaysMilkshakePrize } from '../../shared/findSmashiePrize.ts';

// The free Find Smashie shake is spent.
//
// Checkout calls this once the order it is on has been saved, so the prize can
// never be applied to a second order that day. It only ever touches the caller's
// own win: the record is looked up by the signed-in player's id, never by an id
// from the request, so nobody can mark someone else's prize fulfilled.
//
// This never throws at the caller — an order must not fail because the prize
// record could not be updated.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ ok: false, reason: 'not signed in' });

    const prize = await todaysMilkshakePrize(base44, user.id);
    if (!prize) return Response.json({ ok: false, reason: 'no active prize' });

    await base44.asServiceRole.entities.FindSmashieWinner.update(prize.id, { prize_fulfilled: true });
    return Response.json({ ok: true, fulfilled: prize.id });
  } catch (error) {
    console.error('fulfillSmashiePrize error:', (error as Error).message);
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}