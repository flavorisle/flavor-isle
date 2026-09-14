import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { Resend } from 'npm:resend@3.2.0';
import { brandedEmailHtml, trackedLink } from '../../shared/sendOrderEmails.ts';
import { grantLoyaltyPointsByEmail } from '../../shared/squareLoyalty.ts';

const FROM = 'Flavor Isle <smashie@order.flavor-isle.com>';
const BIRTHDAY_POINTS = 150;

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

    // ── Find customers with birthday today (store local time) ──
    const now = new Date();
    const storeMonthDay = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      month: '2-digit',
      day: '2-digit',
    }).format(now); // e.g. "09/14"
    const [month, day] = storeMonthDay.split('/');
    const todayMonthDay = `${month}-${day}`; // "09-14"

    const profiles = await base44.asServiceRole.entities.CustomerProfile.list('-updated_date', 500);

    // Filter profiles with birthday today (compare MM-DD, ignore year)
    const birthdayProfiles = (profiles || []).filter(p => {
      if (!p.birthday) return false;
      const parts = p.birthday.split('-');
      if (parts.length !== 3) return false;
      return `${parts[1]}-${parts[2]}` === todayMonthDay;
    });

    let targets = birthdayProfiles;
    if (isTest) {
      if (customer_email) {
        const p = (profiles || []).find(p => p.email === customer_email);
        targets = [p || { email: customer_email, name: 'friend', phone: null }];
      } else if (targets.length === 0) {
        // No birthdays today — use a dummy for testing
        targets = [{ email: 'test@example.com', name: 'friend', phone: null }];
      }
    }

    if (!isTest) {
      targets = targets.filter(p => !isSkipEmail(p.email));
    }

    if (targets.length === 0) {
      return Response.json({ ok: true, skipped: true, reason: 'no birthdays today' });
    }

    // ── Dedup: 1 birthday email per customer per year ──
    const existing = await base44.asServiceRole.entities.LoyaltyEmail.filter({ email_type: 'birthday' });
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const recentByEmail = new Set();
    for (const r of (existing || [])) {
      if (r.sent_at && new Date(r.sent_at) > oneYearAgo) {
        recentByEmail.add(r.customer_email);
      }
    }

    if (!isTest) {
      targets = targets.filter(p => !recentByEmail.has(p.email));
    }

    let processed = 0;
    let skipped = 0;
    for (const profile of targets) {
      // Grant loyalty points (skip in test mode)
      let pointsGranted = 0;
      if (!isTest) {
        try {
          const result = await grantLoyaltyPointsByEmail({
            email: profile.email,
            phone: profile.phone,
            points: BIRTHDAY_POINTS,
            reason: 'Birthday treat — free small cone or cup',
            idempotencyKey: `birthday:${profile.email}:${new Date().getFullYear()}`,
          });
          if (result) pointsGranted = BIRTHDAY_POINTS;
        } catch (e) {
          console.error(`Birthday points grant failed for ${profile.email}:`, e.message);
        }
      }

      const firstName = (profile.name || 'friend').split(' ')[0] || 'friend';
      const subject = 'Happy Birthday from the Flavor Isle family 🎂';
      const ctaLink = trackedLink('/menu', 'birthday_cta');
      const bodyHtml = `
        <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey ${firstName},</p>
        <p style="color:#141414;font-size:16px;margin:0 0 24px;line-height:1.6;">Happy birthday from the whole Flavor Isle family! 🎉 Three generations have been flipping burgers and spinning shakes in Smiths Grove since 1964, and today we're celebrating <em>you</em>. Your birthday treat's already in your account — a free small cone or cup on us. Come celebrate with us.</p>
        <div style="text-align:center;margin:28px 0 8px;">
          <a href="${ctaLink}" style="display:inline-block;background:#C0392B;color:#fff;font-family:'Oswald',Arial,sans-serif;letter-spacing:2px;text-decoration:none;padding:18px 44px;border-radius:999px;font-size:18px;">Claim your birthday treat →</a>
        </div>
        <p style="color:#999;font-size:12px;margin:18px 0 0;line-height:1.5;">You're getting this because you told us your birthday in your Flavor Isle account. Don't want these emails? <a href="mailto:smashie@order.flavor-isle.com?subject=Unsubscribe" style="color:#999;text-decoration:underline;">Unsubscribe</a>.</p>
      `;
      const html = brandedEmailHtml(bodyHtml);

      const recipient = isTest ? test_recipient_email : profile.email;
      const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
      const { error } = await resend.emails.send({
        from: FROM,
        to: recipient,
        subject: isTest ? `[TEST] ${subject}` : subject,
        html,
      });
      if (error) {
        console.error('Birthday email send error:', error);
        skipped++;
        continue;
      }

      if (!isTest) {
        await base44.asServiceRole.entities.LoyaltyEmail.create({
          email_type: 'birthday',
          customer_email: profile.email,
          points_granted: pointsGranted,
          sent_at: new Date().toISOString(),
        });
      }

      processed++;
      console.log(`Birthday email sent to ${recipient}${isTest ? ' [TEST]' : ''}`);
    }

    return Response.json({ ok: true, found: targets.length, processed, skipped, test: isTest });
  } catch (error) {
    console.error('sendBirthdayEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}