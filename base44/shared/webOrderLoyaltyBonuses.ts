import { grantLoyaltyPointsByPhone, toE164Phone } from './squareLoyalty.ts';

const COMPLETED_STATUSES = new Set(['completed', 'delivered']);
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

function isCompletedPaidWebOrder(order: any): boolean {
  return order?.direct_web_rewards_v2 === true &&
    COMPLETED_STATUSES.has(order.status) &&
    order.payment_status === 'paid';
}

function sameMember(order: any, phone: string, email: string): boolean {
  return (phone && toE164Phone(order.customer_phone) === phone) ||
    (!phone && email && order.customer_email?.toLowerCase() === email);
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

  if (Object.keys(profileUpdates).length && profile?.id) {
    await base44.asServiceRole.entities.CustomerProfile.update(profile.id, profileUpdates);
  }
  if (Object.keys(updates).length) {
    await base44.asServiceRole.entities.Order.update(order.id, updates);
  }
}