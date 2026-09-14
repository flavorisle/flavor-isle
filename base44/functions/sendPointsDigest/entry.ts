import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { Resend } from 'npm:resend@3.2.0';
import { brandedEmailHtml, trackedLink } from '../../shared/sendOrderEmails.ts';

const FROM = 'Flavor Isle <smashie@order.flavor-isle.com>';

const TIERS = [
  { points: 150, label: 'a free small cone or cup of ice cream' },
  { points: 300, label: 'a free small shake or float' },
  { points: 500, label: '15% off your next order' },
  { points: 1000, label: 'Gold status' },
];

function nextTier(balance) {
  for (const tier of TIERS) {
    if (balance < tier.points) return tier;
  }
  return null; // Already at top tier
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

    // ── Find loyalty members with points_balance > 0 ──
    const members = await base44.asServiceRole.entities.Loyalty.list('-updated_date', 500);
    let targets = (members || []).filter(m => (m.points_balance || 0) > 0 && !isSkipEmail(m.email));

    if (isTest) {
      if (customer_email) {
        const m = (members || []).find(m => m.email === customer_email);
        targets = [m || { email: customer_email, points_balance: 200 }];
      } else if (targets.length > 0) {
        targets = [targets[0]];
      } else {
        targets = [{ email: 'test@example.com', points_balance: 200 }];
      }
    }

    if (targets.length === 0) {
      return Response.json({ ok: true, skipped: true, reason: 'no eligible loyalty members' });
    }

    let processed = 0;
    let skipped = 0;
    for (const member of targets) {
      const balance = member.points_balance || 0;
      const tier = nextTier(balance);

      let nudgeLine;
      if (tier) {
        const gap = tier.points - balance;
        nudgeLine = `You're just <strong>${gap} point${gap === 1 ? '' : 's'}</strong> from ${tier.label}.`;
      } else {
        nudgeLine = `You've hit Gold status — you're part of the Flavor Isle family inner circle. 🏆`;
      }

      // Look up name from CustomerProfile
      let name = 'friend';
      try {
        const profiles = await base44.asServiceRole.entities.CustomerProfile.filter({ email: member.email });
        name = profiles?.[0]?.name || 'friend';
      } catch (e) { /* ignore */ }
      const firstName = name.split(' ')[0] || 'friend';

      const subject = `Your Star Rewards update ⭐`;
      const ctaLink = trackedLink('/menu', 'digest_cta');
      const bodyHtml = `
        <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey ${firstName},</p>
        <p style="color:#141414;font-size:16px;margin:0 0 20px;line-height:1.6;">Here's your monthly Star Rewards update:</p>
        <div style="background:#FFF8E7;border:2px dashed #F5A623;border-radius:14px;padding:20px;margin:0 0 24px;text-align:center;">
          <p style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:32px;margin:0 0 4px;letter-spacing:2px;">${balance} ⭐</p>
          <p style="color:#141414;font-size:14px;margin:0 0 12px;">Your current star balance</p>
          ${tier ? `<p style="color:#141414;font-size:15px;margin:0 0 8px;">Next reward at ${tier.points} stars: <strong>${tier.label}</strong></p><p style="color:#141414;font-size:15px;margin:0;">${nudgeLine}</p>` : `<p style="color:#141414;font-size:15px;margin:0;">${nudgeLine}</p>`}
        </div>
        <p style="color:#141414;font-size:16px;margin:0 0 24px;line-height:1.6;">Come earn more stars on your next order — every $10 spent earns 4 stars.</p>
        <div style="text-align:center;margin:28px 0 8px;">
          <a href="${ctaLink}" style="display:inline-block;background:#C0392B;color:#fff;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:18px 44px;border-radius:999px;font-size:18px;">Order ahead →</a>
        </div>
        <p style="color:#999;font-size:12px;margin:18px 0 0;line-height:1.5;">You're getting this because you're a Flavor Isle Star Rewards member. Don't want these emails? <a href="mailto:smashie@order.flavor-isle.com?subject=Unsubscribe" style="color:#999;text-decoration:underline;">Unsubscribe</a>.</p>
      `;
      const html = brandedEmailHtml(bodyHtml);

      const recipient = isTest ? test_recipient_email : member.email;
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      const { error } = await resend.emails.send({
        from: FROM,
        to: recipient,
        subject: isTest ? `[TEST] ${subject}` : subject,
        html,
      });
      if (error) {
        console.error('Points digest email send error:', error);
        skipped++;
        continue;
      }

      if (!isTest) {
        await base44.asServiceRole.entities.LoyaltyEmail.create({
          email_type: 'digest',
          customer_email: member.email,
          points_granted: 0,
          sent_at: new Date().toISOString(),
        });
      }

      processed++;
      console.log(`Points digest email sent to ${recipient}${isTest ? ' [TEST]' : ''}`);
    }

    return Response.json({ ok: true, found: targets.length, processed, skipped, test: isTest });
  } catch (error) {
    console.error('sendPointsDigest error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}