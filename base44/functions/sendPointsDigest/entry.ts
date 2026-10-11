import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { Resend } from 'npm:resend@3.2.0';
import { brandedEmailHtml, trackedLink } from '../../shared/sendOrderEmails.ts';
import { getLoyaltyProgram, searchLoyaltyAccountByPhone } from '../../shared/squareLoyalty.ts';
import { loadBlockFilter } from '../../shared/blockedContacts.ts';

const FROM = 'Flavor Isle <smashie@flavor-isle.com>';
const OWNER_EMAIL = 'wesleyrbooker1@gmail.com';

function nextTier(balance, tiers) {
  return [...tiers].sort((a, b) => a.points - b.points).find(tier => balance < tier.points) || null;
}

const SKIP_EMAILS = new Set([
  'square-pos@flavorisle.com',
  'wesley@flavor-isle.com',
  'wesleyrbooker1@gmail.com',
  'test@example.com',
]);

function isSkipEmail(email) {
  if (!email) return true;
  const e = email.toLowerCase().trim();
  if (SKIP_EMAILS.has(e)) return true;
  if (e.endsWith('@flavorisle.com')) return true;
  return false;
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const { test_mode, test_recipient_email, customer_email } = await req.json();
    const isTest = !!test_mode;
    if (isTest && !test_recipient_email) {
      return Response.json({ error: 'test_recipient_email is required when test_mode is true' }, { status: 400 });
    }
    // A test send goes to an operator-chosen address, so it is admin-only. The
    // scheduled monthly run never passes test_mode.
    if (isTest) {
      const { error: authError } = await requireAdmin(base44);
      if (authError) return authError;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(now);
    const [profiles, orders, program] = await Promise.all([
      base44.asServiceRole.entities.CustomerProfile.list('-updated_date', 500),
      base44.asServiceRole.entities.Order.list('-created_date', 1000),
      getLoyaltyProgram(),
    ]);
    const completedOrders = (orders || []).filter(order =>
      ['completed', 'delivered'].includes(order.status) &&
      order.payment_status === 'paid'
    );
    const monthOrders = completedOrders.filter(order => new Date(order.created_date) >= monthStart);
    const uniqueProfiles = [...new Map((profiles || [])
      .filter(profile => profile.email && profile.phone)
      .map(profile => [profile.email.toLowerCase(), profile])).values()];

    let targets = [];
    for (let i = 0; i < uniqueProfiles.length; i += 10) {
      const batch = await Promise.all(uniqueProfiles.slice(i, i + 10).map(async profile => ({
        profile,
        account: await searchLoyaltyAccountByPhone(profile.phone).catch(error => {
          console.error(`Square loyalty lookup failed for ${profile.email}:`, error.message);
          return null;
        }),
      })));
      targets.push(...batch.filter(({ profile, account }) => account && !isSkipEmail(profile.email)));
    }

    if (isTest) {
      const selected = customer_email
        ? (uniqueProfiles.find(profile => profile.email.toLowerCase() === customer_email.toLowerCase()) || { email: customer_email, name: 'friend', phone: '' })
        : (targets[0]?.profile || uniqueProfiles[0] || { email: 'test@example.com', name: 'friend', phone: '' });
      const account = targets.find(target => target.profile.email === selected.email)?.account || { balance: 0, created_at: null };
      targets = [{ profile: selected, account }];
    }

    const rewardTiers = program?.reward_tiers || [];
    const tierById = new Map(rewardTiers.map((tier: any) => [tier.id, tier]));
    const redeemedOrders = monthOrders.filter(order => order.redemption_id && tierById.has(order.redemption_id));
    const redeemedStars = redeemedOrders.reduce((sum, order) => sum + Number((tierById.get(order.redemption_id) as any)?.points || 0), 0);
    const redeemedValue = redeemedOrders.reduce((sum, order) => sum + Math.max(0, Number(order.discount) || 0), 0);
    const grossSales = monthOrders.reduce((sum, order) => sum + Math.max(0, Number(order.subtotal) || 0), 0);
    const redeemedPercent = grossSales > 0 ? (redeemedValue / grossSales) * 100 : 0;

    const directOrders = monthOrders.filter(order => order.direct_web_rewards_v2 === true).length;
    const otherChannelOrders = monthOrders.length - directOrders;
    const winbackEmails = await base44.asServiceRole.entities.LoyaltyEmail.filter({ email_type: 'winback' }).catch(() => []);
    const monthlyWinbacks = (winbackEmails || []).filter(email => email.sent_at && new Date(email.sent_at) >= monthStart);
    const redeemedWinbacks = monthlyWinbacks.filter(email => completedOrders.some(order =>
      order.customer_email?.toLowerCase() === email.customer_email?.toLowerCase() &&
      order.loyalty_welcome_back_bonus_granted_at &&
      new Date(order.created_date) > new Date(email.sent_at)
    )).length;
    const winbackRate = monthlyWinbacks.length ? (redeemedWinbacks / monthlyWinbacks.length) * 100 : 0;

    // Issue #93 (A12): blocked members never receive the digest. The block list
    // is read once per run; a failed read is logged and the run continues.
    const blockFilter = await loadBlockFilter(base44).catch((e) => {
      console.error('Block-list lookup failed, sending unfiltered:', e.message);
      return null;
    });

    let processed = 0;
    let skipped = 0;
    const memberFrequency = [];
    for (const { profile, account } of targets) {
      // Issue #93 (A12): a blocked member is skipped, and no digest record is
      // written. Test sends go to the admin's own address and are not filtered.
      if (!isTest && blockFilter && (blockFilter.hasEmail(profile.email) || blockFilter.hasPhone(profile.phone))) {
        console.log(`Points digest skipped for ${profile.email}: contact is on the block list.`);
        skipped++;
        continue;
      }

      const balance = Number(account?.balance || 0);
      const tier = nextTier(balance, rewardTiers);
      const email = profile.email;
      const memberOrders = completedOrders.filter(order => order.customer_email?.toLowerCase() === email.toLowerCase());
      const enrollmentDate = account?.created_at ? new Date(account.created_at) : null;
      const preEnrollmentOrders = enrollmentDate
        ? memberOrders.filter(order => new Date(order.created_date) < enrollmentDate)
        : [];
      const firstOrderDate = preEnrollmentOrders.length
        ? Math.min(...preEnrollmentOrders.map(order => new Date(order.created_date).getTime()))
        : null;
      const baselineMonths = firstOrderDate && enrollmentDate
        ? Math.max(1, (enrollmentDate.getTime() - firstOrderDate) / (30.4375 * 24 * 60 * 60 * 1000))
        : 1;
      const baselineFrequency = preEnrollmentOrders.length / baselineMonths;
      const currentFrequency = monthOrders.filter(order => order.customer_email?.toLowerCase() === email.toLowerCase()).length;
      memberFrequency.push({ currentFrequency, baselineFrequency });

      const name = profile.name || 'friend';
      const firstName = name.split(' ')[0] || 'friend';
      const nudgeLine = tier
        ? `You're just <strong>${Math.max(0, tier.points - balance)} Stars</strong> from ${tier.name}.`
        : 'You have reached every reward tier currently in the Square program.';
      const subject = 'Your Star Rewards update ⭐';
      const ctaLink = trackedLink('/menu', 'digest_cta');
      const bodyHtml = `
        <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey ${firstName},</p>
        <p style="color:#141414;font-size:16px;margin:0 0 20px;line-height:1.6;">Here's your ${monthLabel} Star Rewards update:</p>
        <div style="background:#FFF8E7;border:2px dashed #F5A623;border-radius:14px;padding:20px;margin:0 0 24px;text-align:center;">
          <p style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:32px;margin:0 0 4px;letter-spacing:2px;">${balance} ⭐</p>
          <p style="color:#141414;font-size:14px;margin:0 0 12px;">Your current Star balance</p>
          <p style="color:#141414;font-size:15px;margin:0;">${nudgeLine}</p>
        </div>
        <p style="color:#141414;font-size:15px;margin:0 0 8px;line-height:1.6;">Your completed orders this month: <strong>${currentFrequency}</strong>. Your average before joining Star Rewards: <strong>${baselineFrequency.toFixed(1)} per month</strong>.</p>
        <p style="color:#141414;font-size:16px;margin:0 0 24px;line-height:1.6;">Earn 1 Star per $1 spent. Every flavor-isle.com order earns +10% bonus Stars, and 3 web orders in 30 days earn a 50-Star streak bonus.</p>
        <div style="text-align:center;margin:28px 0 8px;">
          <a href="${ctaLink}" style="display:inline-block;background:#C0392B;color:#fff;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:18px 44px;border-radius:999px;font-size:18px;">Order ahead →</a>
        </div>
        <p style="color:#999;font-size:12px;margin:18px 0 0;line-height:1.5;">You're getting this because you're a Flavor Isle Star Rewards member. Don't want these emails? <a href="mailto:unsubscribe@flavor-isle.com?subject=Unsubscribe" style="color:#999;text-decoration:underline;">Unsubscribe</a>.</p>
      `;
      const recipient = isTest ? test_recipient_email : email;
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      const { error } = await resend.emails.send({
        from: FROM,
        to: recipient,
        subject: isTest ? `[TEST] ${subject}` : subject,
        html: brandedEmailHtml(bodyHtml),
      });
      if (error) {
        console.error('Points digest email send error:', error);
        skipped++;
        continue;
      }

      if (!isTest) {
        await base44.asServiceRole.entities.LoyaltyEmail.create({
          email_type: 'digest',
          customer_email: email,
          points_granted: 0,
          sent_at: new Date().toISOString(),
        });
      }
      processed++;
      console.log(`Points digest email sent to ${recipient}${isTest ? ' [TEST]' : ''}`);
    }

    let metricsEmailSent = false;
    if (!isTest) {
      const averageCurrentFrequency = memberFrequency.length
        ? memberFrequency.reduce((sum, member) => sum + member.currentFrequency, 0) / memberFrequency.length
        : 0;
      const averageBaselineFrequency = memberFrequency.length
        ? memberFrequency.reduce((sum, member) => sum + member.baselineFrequency, 0) / memberFrequency.length
        : 0;
      const directShare = monthOrders.length ? (directOrders / monthOrders.length) * 100 : 0;
      const otherShare = monthOrders.length ? (otherChannelOrders / monthOrders.length) * 100 : 0;
      const metricsHtml = brandedEmailHtml(`
        <h2 style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;">Star Rewards monthly metrics — ${monthLabel}</h2>
        <p>Enrolled members: average ${averageCurrentFrequency.toFixed(2)} completed orders this month vs. ${averageBaselineFrequency.toFixed(2)} orders/month before enrollment.</p>
        <p>Direct flavor-isle.com orders: ${directOrders} (${directShare.toFixed(1)}%); other recorded channels: ${otherChannelOrders} (${otherShare.toFixed(1)}%).</p>
        <p>Welcome-back bonus redemption: ${redeemedWinbacks}/${monthlyWinbacks.length} sent win-back offers (${winbackRate.toFixed(1)}%).</p>
        <p>Stars redeemed: ${redeemedStars}. Reward discount value: $${redeemedValue.toFixed(2)} / gross sales $${grossSales.toFixed(2)} (${redeemedPercent.toFixed(2)}%; 3% cap ${redeemedPercent <= 3 ? 'within' : 'exceeded'}).</p>
        <p style="color:#666;font-size:12px;">Order/channel calculations use completed, paid orders available in app records. Non-direct orders are grouped as other because the Order entity does not distinguish third-party from in-store/phone sources.</p>
      `);
      try {
        const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
        const { error } = await resend.emails.send({
          from: FROM,
          to: OWNER_EMAIL,
          subject: `Star Rewards monthly metrics — ${monthLabel}`,
          html: metricsHtml,
        });
        if (error) console.error('Points digest metrics email send error:', error);
        else metricsEmailSent = true;
      } catch (metricsErr) {
        console.error('Points digest metrics email failed:', metricsErr.message);
      }
    }

    return Response.json({
      ok: true,
      found: targets.length,
      processed,
      skipped,
      metrics_email_sent: metricsEmailSent,
      test: isTest,
    });
  } catch (error) {
    console.error('sendPointsDigest error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}