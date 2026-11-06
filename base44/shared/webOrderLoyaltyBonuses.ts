import { adjustLoyaltyPoints, grantLoyaltyPointsByPhone, searchLoyaltyAccountByPhone, toE164Phone } from './squareLoyalty.ts';
import { referralPhoneFromCode } from './referral.ts';
import { phoneDigits } from './normalizePhone.ts';

const COMPLETED_STATUSES = new Set(['completed', 'delivered']);
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

// Stars a referral pays, per side (issue #83). A referral pays BOTH people: the
// referrer earns this when the friend's first order completes, and the friend
// earns this on that same first order — "So both get 100" (Wesley, Nov 5 2026).
// This constant is the only place the amount lives: both awards, both audit rows
// and the referral portal read it, and points already recorded on old
// ReferralBonus rows are untouched.
export const REFERRAL_BONUS_STARS = 100;

// One side of a referral. The Stars go to that person's own Square loyalty
// account, so someone with no account is skipped silently and never enrolled —
// the same rule for the referrer and the friend. Returns the timestamp to stamp,
// or null when that side earned nothing.
async function awardReferralSide(phone: string, reason: string, idempotencyKey: string): Promise<string | null> {
  const account = await searchLoyaltyAccountByPhone(phone).catch(() => null);
  if (!account) return null;
  await adjustLoyaltyPoints({
    accountId: account.id,
    points: REFERRAL_BONUS_STARS,
    reason,
    idempotencyKey,
  });
  return new Date().toISOString();
}

function isCompletedPaidWebOrder(order: any): boolean {
  return order?.direct_web_rewards_v2 === true &&
    COMPLETED_STATUSES.has(order.status) &&
    order.payment_status === 'paid';
}

function sameMember(order: any, phone: string, email: string): boolean {
  return (phone && toE164Phone(order.customer_phone) === phone) ||
    (!phone && email && order.customer_email?.toLowerCase() === email);
}

// Referral bonus (issue #83, Part A): REFERRAL_BONUS_STARS to the referrer AND
// REFERRAL_BONUS_STARS to the friend, once per friend, ever. Returns a timestamp
// per side — whichever side earned nothing comes back null, so its stamp stays
// unset and a later run can retry. A skipped grant on one side never holds back
// the other. Skips leave the matching order field unset.
async function grantReferralBonus(
  base44: any,
  order: any,
  orderHistory: any[],
): Promise<{ referrerAt: string | null; welcomeAt: string | null }> {
  const skipped = { referrerAt: null, welcomeAt: null };
  const referrerPhone = await referralPhoneFromCode(order.referral_code);
  if (!referrerPhone) {
    console.warn(`Order ${order.order_number}: referral code ${order.referral_code} did not decode — no bonus`);
    return skipped;
  }

  const friendPhone = toE164Phone(order.customer_phone);
  // Guard 1: a customer can't refer themselves.
  if (referrerPhone === friendPhone) return skipped;

  // Guard 2: the friend must be genuinely new — no earlier paid, completed
  // order on either the same phone or the same email. Their own order is
  // pulled in by the email lookup and excluded by id.
  const friendEmail = String(order.customer_email || '').toLowerCase();
  const priorOrders = [...(orderHistory || [])];
  if (order.customer_email) {
    const byEmail = await base44.asServiceRole.entities.Order
      .filter({ customer_email: order.customer_email })
      .catch(() => []);
    priorOrders.push(...(byEmail || []));
  }
  const friendHasOrderedBefore = priorOrders.some((candidate: any) => {
    if (!candidate || candidate.id === order.id) return false;
    if (!COMPLETED_STATUSES.has(candidate.status) || candidate.payment_status !== 'paid') return false;
    return (friendPhone && toE164Phone(candidate.customer_phone) === friendPhone) ||
      (friendEmail && String(candidate.customer_email || '').toLowerCase() === friendEmail);
  });
  if (friendHasOrderedBefore) return skipped;

  // Guard 3: each side is paid only through their own Square loyalty account —
  // no account means that side is skipped silently, never auto-enrolled. The two
  // awards run in their own try/catch so a failure on one side can never roll
  // back or skip the other.
  let referrerAt: string | null = null;
  try {
    referrerAt = await awardReferralSide(
      referrerPhone,
      'Referral bonus',
      `referral:${referrerPhone}:${order.id}`,
    );
    if (referrerAt) {
      console.log(`Referral bonus: ${REFERRAL_BONUS_STARS} Stars to ${referrerPhone} for order ${order.order_number}`);
    }
  } catch (referrerError: any) {
    console.error(`Referral bonus failed for referrer ${referrerPhone} on order ${order.order_number}:`, referrerError?.message || referrerError);
  }

  let welcomeAt: string | null = null;
  try {
    if (friendPhone) {
      welcomeAt = await awardReferralSide(
        friendPhone,
        'Referral welcome bonus',
        `referral-welcome:${friendPhone}:${order.id}`,
      );
      if (welcomeAt) {
        console.log(`Referral welcome bonus: ${REFERRAL_BONUS_STARS} Stars to ${friendPhone} for order ${order.order_number}`);
      }
    }
  } catch (welcomeError: any) {
    console.error(`Referral welcome bonus failed for ${friendPhone} on order ${order.order_number}:`, welcomeError?.message || welcomeError);
  }

  // Audit rows for the referral portal (GitHub issue #95 follow-up). Additive
  // only: the Stars above are already granted, so a failed insert must never
  // break the grants or stop the timestamps from being stamped.
  try {
    await recordReferralBonus(base44, order, referrerPhone, referrerAt, welcomeAt);
  } catch (auditError: any) {
    console.error(`Referral audit row failed for order ${order.order_number}:`, auditError?.message || auditError);
  }
  return { referrerAt, welcomeAt };
}

// One ReferralBonus row per bonus actually granted — a referrer row and, when
// the friend's welcome bonus landed, a second row with bonus_side 'referee'. The
// referrer's email comes from their customer profile matched by phone (empty
// when no profile matches); the rows are keyed by referral_code regardless, so
// the portal finds them either way. `bonus_side` is what keeps a customer's own
// welcome bonus out of their referral count.
async function recordReferralBonus(
  base44: any,
  order: any,
  referrerPhone: string,
  referrerAt: string | null,
  welcomeAt: string | null,
) {
  let referrerEmail = '';
  const digits = phoneDigits(referrerPhone);
  if (digits) {
    const profiles = await base44.asServiceRole.entities.CustomerProfile
      .filter({ phone: { $regex: digits, $options: 'i' } })
      .catch(() => []);
    referrerEmail = String(profiles?.[0]?.email || '').trim().toLowerCase();
  }

  const row = {
    referrer_email: referrerEmail,
    referee_email: String(order.customer_email || '').trim().toLowerCase(),
    referee_order_id: order.id,
    referral_code: String(order.referral_code || '').trim().toUpperCase(),
    points_awarded: REFERRAL_BONUS_STARS,
  };

  if (referrerAt) {
    await base44.asServiceRole.entities.ReferralBonus.create({
      ...row,
      bonus_side: 'referrer',
      awarded_at: referrerAt,
    });
  }
  if (welcomeAt) {
    await base44.asServiceRole.entities.ReferralBonus.create({
      ...row,
      bonus_side: 'referee',
      awarded_at: welcomeAt,
    });
  }
}

export async function grantCompletedWebOrderBonuses(
  base44: any,
  order: any,
  orderHistory: any[],
): Promise<void> {
  if (!isCompletedPaidWebOrder(order)) return;
  const phone = toE164Phone(order.customer_phone);
  if (!phone) return;

  const profiles = order.customer_email
    ? await base44.asServiceRole.entities.CustomerProfile.filter({ email: order.customer_email }).catch(() => [])
    : [];
  const profile = profiles?.find((candidate: any) => toE164Phone(candidate.phone) === phone);
  const completedHistory = (orderHistory || [])
    .filter((candidate: any) =>
      candidate.id !== order.id &&
      COMPLETED_STATUSES.has(candidate.status) &&
      candidate.payment_status === 'paid' &&
      sameMember(candidate, phone, order.customer_email)
    )
    .sort((a: any, b: any) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime());
  const history = completedHistory.filter((candidate: any) => candidate.direct_web_rewards_v2 === true);
  const currentTime = new Date(order.created_date || Date.now()).getTime();
  const updates: Record<string, any> = {};
  const profileUpdates: Record<string, any> = {};

  if (!profile?.star_rewards_second_order_bonus_granted_at && history.length === 1 && !order.loyalty_second_order_bonus_granted_at) {
    const granted = await grantLoyaltyPointsByPhone({
      phone,
      points: 50,
      reason: '2nd order bonus',
      idempotencyKey: `second-web-order:${phone}`,
    });
    if (granted) {
      const at = new Date().toISOString();
      updates.loyalty_second_order_bonus_granted_at = at;
      profileUpdates.star_rewards_second_order_bonus_granted_at = at;
    }
  }

  const recentStreakGrant = [profile?.star_rewards_last_streak_bonus_at, ...history.map((candidate: any) => candidate.loyalty_streak_bonus_granted_at)]
    .some((at: any) => at && currentTime - new Date(at).getTime() < THIRTY_DAYS);
  const inWindow = [...history, order]
    .filter((candidate: any) => isCompletedPaidWebOrder(candidate) && sameMember(candidate, phone, order.customer_email))
    .filter((candidate: any) => {
      const created = new Date(candidate.created_date || order.created_date || Date.now()).getTime();
      return created <= currentTime && currentTime - created < THIRTY_DAYS;
    })
    .sort((a: any, b: any) => new Date(a.created_date).getTime() - new Date(b.created_date).getTime());

  if (!recentStreakGrant && inWindow.length >= 3 && !order.loyalty_streak_bonus_granted_at) {
    const thresholdOrder = inWindow[2];
    const granted = await grantLoyaltyPointsByPhone({
      phone,
      points: 50,
      reason: 'Streak bonus',
      idempotencyKey: `streak:${phone}:${thresholdOrder.id}`,
    });
    if (granted) {
      const at = new Date().toISOString();
      updates.loyalty_streak_bonus_granted_at = at;
      profileUpdates.star_rewards_last_streak_bonus_at = at;
    }
  }

  const previousOrder = completedHistory[completedHistory.length - 1];
  if (previousOrder && currentTime - new Date(previousOrder.created_date).getTime() >= THIRTY_DAYS && !order.loyalty_welcome_back_bonus_granted_at) {
    const granted = await grantLoyaltyPointsByPhone({
      phone,
      points: 100,
      reason: 'Welcome back bonus',
      idempotencyKey: `welcome-back:${order.id}`,
    });
    if (granted) updates.loyalty_welcome_back_bonus_granted_at = new Date().toISOString();
  }

  // Referral bonus — the friend's order completed, so the referrer earns
  // REFERRAL_BONUS_STARS and the friend earns REFERRAL_BONUS_STARS as a welcome
  // bonus. Each side stamps its own field, so whichever one landed stays paid.
  // Guests and signed-in customers alike (identity = order phone/email).
  if (order.referral_code && !order.referral_bonus_granted_at) {
    try {
      const { referrerAt, welcomeAt } = await grantReferralBonus(base44, order, orderHistory);
      if (referrerAt) updates.referral_bonus_granted_at = referrerAt;
      if (welcomeAt) updates.referral_welcome_bonus_granted_at = welcomeAt;
    } catch (referralErr) {
      console.error(`Referral bonus failed for order ${order.order_number}:`, referralErr.message);
    }
  }

  if (Object.keys(profileUpdates).length && profile?.id) {
    await base44.asServiceRole.entities.CustomerProfile.update(profile.id, profileUpdates);
  }
  if (Object.keys(updates).length) {
    await base44.asServiceRole.entities.Order.update(order.id, updates);
  }
}