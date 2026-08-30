import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { Resend } from 'npm:resend@3.2.0';
import { brandedEmailHtml, accountCtaHtml, rewardsEnrolledHtml, merchPromoHtml, reviewCtaHtml, whatToExpectHtml, starsEarnedHtml } from '../../shared/sendOrderEmails.ts';

// Admin-only diagnostic: sends a fully branded test email to verify the
// ready-email pipeline and Resend creds.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const to = body.to;
    if (!to) return Response.json({ error: 'Missing "to" email address' }, { status: 400 });

    let bodyHtml;
    if (body.preview === 'order_guest') {
      // Preview of a guest order email with the new account + Star Rewards blocks.
      bodyHtml = `
        <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey Jordan,</p>
        <h2 style="color:#141414;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 4px;">Jordan — your order is locked in. 🎉</h2>
        <p style="color:#141414;font-size:17px;line-height:1.5;margin:6px 0 24px;">Everything's lined up just how you like it, and the crew's already firing up the grill. 🔥</p>
        <div style="background:#1A3A5C;color:white;border-radius:12px;padding:14px 20px;margin-bottom:24px;text-align:center;letter-spacing:3px;font-family:'Oswald',Arial,sans-serif;font-size:15px;font-weight:bold;">ORDER CONFIRMED · #PH123456</div>
        ${starsEarnedHtml({ pointsEarned: 18, balance: 44, newlyEnrolled: true })}
        ${rewardsEnrolledHtml({ newlyEnrolled: true, balance: 44 })}
        ${accountCtaHtml()}
        ${whatToExpectHtml()}
        ${reviewCtaHtml('sample-order-id')}
        ${merchPromoHtml()}`;
    } else {
      bodyHtml = `
      <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey fam,</p>
      <h2 style="color:#C0392B;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 8px;">Test email from Flavor Isle ✅</h2>
      <p style="color:#141414;font-size:16px;line-height:1.5;margin:6px 0 18px;">If you're reading this, the branded email pipeline is working — order-ready emails will look just like this. 🔥</p>`;
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const { error } = await resend.emails.send({
      from: 'Flavor Isle <smashie@order.flavor-isle.com>',
      to,
      subject: body.preview === 'order_guest' ? 'Preview: guest order email (account + Star Rewards)' : '✅ Flavor Isle test email',
      html: brandedEmailHtml(bodyHtml),
    });

    if (error) {
      console.error('sendTestEmail Resend error:', error);
      return Response.json({ error: error.message || 'Resend error' }, { status: 500 });
    }

    console.log(`Test email sent to ${to}`);
    return Response.json({ success: true, sent_to: to });
  } catch (error) {
    console.error('sendTestEmail error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});