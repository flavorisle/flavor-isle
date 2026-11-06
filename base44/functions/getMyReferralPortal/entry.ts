import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { referralCodeForPhone } from '../../shared/referral.ts';
import { REFERRAL_BONUS_STARS } from '../../shared/webOrderLoyaltyBonuses.ts';

// The customer's own referral portal (GitHub issue #95 follow-up).
//
// Signed-in customers only: the code, the share link, the Stars they have
// earned from referrals, and who they brought in. Every lookup runs as the
// service role and the response carries a first name for each friend — never
// another customer's email, phone or order total.
//
// A referral code IS the referrer's phone number, encoded (shared/referral.ts).
// So the caller's code is derived from their customer profile's phone; nothing
// is stored to "create" it. With no phone on the profile there is no code yet,
// and the portal says so.

// The reward quoted on the portal is the grant's own constant, imported so the
// page can never drift from what the referrer is actually paid.
const SHARE_BASE = 'https://flavor-isle.com/?ref=';

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.email) return Response.json({ error: 'Authentication required' }, { status: 401 });

    const email = String(user.email).trim().toLowerCase();

    const profiles = await base44.asServiceRole.entities.CustomerProfile
      .filter({ email })
      .catch(() => []);
    const profile = (Array.isArray(profiles) ? profiles : profiles?.items || [])[0] || null;

    const code = profile?.phone ? (await referralCodeForPhone(profile.phone).catch(() => null)) || '' : '';

    // Their rows: the current code, plus anything attached to their email from
    // an earlier phone number. Plain equality only.
    const query = code
      ? { $or: [{ referral_code: code }, { referrer_email: email }] }
      : { referrer_email: email };
    const rawRows = await base44.asServiceRole.entities.ReferralBonus
      .filter(query)
      .catch(() => []);
    const rows = (Array.isArray(rawRows) ? rawRows : rawRows?.items || [])
      .slice()
      .sort((a: any, b: any) =>
        new Date(b?.awarded_at || b?.created_date || 0).getTime() -
        new Date(a?.awarded_at || a?.created_date || 0).getTime());

    const referrals = [];
    for (const row of rows) {
      let orderNumber = '';
      if (row.referee_order_id) {
        const order = await base44.asServiceRole.entities.Order
          .get(row.referee_order_id)
          .catch(() => null);
        orderNumber = String(order?.order_number || '');
      }

      // First name only, from the friend's customer profile.
      let refereeName = 'A friend';
      const refereeEmail = String(row.referee_email || '').trim().toLowerCase();
      if (refereeEmail) {
        const friendProfiles = await base44.asServiceRole.entities.CustomerProfile
          .filter({ email: refereeEmail })
          .catch(() => []);
        const fullName = String((Array.isArray(friendProfiles) ? friendProfiles : [])[0]?.name || '').trim();
        if (fullName) refereeName = fullName.split(/\s+/)[0];
      }

      referrals.push({
        referee_name: refereeName,
        order_number: orderNumber,
        points_awarded: Number(row.points_awarded || 0),
        awarded_at: row.awarded_at || row.created_date || '',
      });
    }

    return Response.json({
      code: code || null,
      share_url: code ? `${SHARE_BASE}${code}` : '',
      stars_per_referral: REFERRAL_BONUS_STARS,
      stars_earned: rows.reduce((sum: number, row: any) => sum + Number(row.points_awarded || 0), 0),
      referrals,
    });
  } catch (error: any) {
    console.error('getMyReferralPortal error:', error?.message || error);
    return Response.json({ error: String(error?.message || error) }, { status: 500 });
  }
}