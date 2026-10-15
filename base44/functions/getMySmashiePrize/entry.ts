import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { todaysMilkshakePrize } from '../../shared/findSmashiePrize.ts';

// Does the signed-in player hold today's free Find Smashie milkshake?
//
// Answers { active: true } only while the win is real and still unused, so
// checkout can apply the free shake exactly once. Signed-out visitors and anyone
// whose prize is spent or already used get { active: false } — nothing here ever
// says why, so the shape stays safe to call from a public page.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ active: false });
    const prize = await todaysMilkshakePrize(base44, user.id);
    return Response.json({ active: !!prize });
  } catch (error) {
    console.error('getMySmashiePrize error:', (error as Error).message);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}