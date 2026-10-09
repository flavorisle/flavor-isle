import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { Resend } from 'npm:resend@3.2.0';
import {
  brandedEmailHtml,
  sendOrderPreparingEmail,
  sendOrderReadyEmail,
  sendOrderCompletedEmail,
  merchPromoHtml,
  reviewCtaHtml,
  whatToExpectHtml,
  starsEarnedHtml,
  accountCtaHtml,
  rewardsEnrolledHtml,
  foodHeroHtml,
} from '../../shared/sendOrderEmails.ts';
import { buildCartReminderHtml } from '../../shared/cartReminderEmail.ts';

// Admin-only: sends one of every customer-facing email type to a single
// address so the team can review each template end-to-end.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const to = body.to;
    if (!to) return Response.json({ error: 'Missing "to" email address' }, { status: 400 });

    const sampleOrder = {
      id: 'sample-order-001',
      order_number: 'PH999999',
      customer_name: 'Jordan',
      customer_email: to,
      order_type: 'pickup',
      pickup_method: 'counter',
      items: [
        { name: 'Deluxe Burger', quantity: 1, price: 8.99 },
        { name: 'Crinkle-Cut Fries', quantity: 1, price: 3.49 },
        { name: '14 oz Chocolate Shake', quantity: 1, price: 5.99 },
      ],
      subtotal: 18.47,
      tax: 1.11,
      total: 19.58,
      delivery_address: null,
      table_number: null,
    };

    const results: Array<{ email: string; success: boolean; error?: string; detail?: string }> = [];
    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    // 1. Order Confirmation (Guest)
    try {
      const confirmBody = `
        <p style="color:#666;margin:0 0 10px;font-size:16px;">Hey Jordan,</p>
        <h2 style="color:#141414;font-family:'Oswald',Arial,sans-serif;font-size:22px;margin:0 0 4px;">Jordan — your order is locked in. 🎉</h2>
        <p style="color:#141414;font-size:17px;line-height:1.5;margin:6px 0 24px;">Everything's lined up just how you like it, and the crew's already firing up the grill. 🔥</p>
        <div style="background:#1A3A5C;color:white;border-radius:12px;padding:14px 20px;margin-bottom:24px;text-align:center;letter-spacing:3px;font-family:'Oswald',Arial,sans-serif;font-size:15px;font-weight:bold;">ORDER CONFIRMED · #PH999999</div>
        <p style="color:#141414;font-size:15px;margin:0 0 4px;"><strong>Items:</strong> Deluxe Burger, Crinkle-Cut Fries, 14 oz Chocolate Shake</p>
        <p style="color:#141414;font-size:15px;margin:0 0 4px;"><strong>Total:</strong> $19.58</p>
        <p style="color:#141414;font-size:15px;margin:0 0 14px;"><strong>Pickup Location:</strong> Flavor Isle — Smiths Grove, KY</p>
        ${starsEarnedHtml({ pointsEarned: 18, balance: 44, newlyEnrolled: true })}
        ${rewardsEnrolledHtml({ newlyEnrolled: true, balance: 44 })}
        ${accountCtaHtml()}
        ${whatToExpectHtml()}
        ${await foodHeroHtml(base44)}
        ${await merchPromoHtml()}`;
      const { error } = await resend.emails.send({
        from: 'Flavor Isle <smashie@flavor-isle.com>',
        to,
        subject: '🎉 Order #PH999999 confirmed!',
        html: brandedEmailHtml(confirmBody),
      });
      results.push({ email: '1. Order Confirmation (Guest)', success: !error, error: error?.message });
    } catch (e) {
      results.push({ email: '1. Order Confirmation (Guest)', success: false, error: e.message });
    }
    await sleep(500);

    // 2. Order Preparing ("On the Grill")
    try {
      const ok = await sendOrderPreparingEmail({ ...sampleOrder, customer_email: to }, base44);
      results.push({ email: '2. Order Preparing (On the Grill)', success: ok });
    } catch (e) {
      results.push({ email: '2. Order Preparing (On the Grill)', success: false, error: e.message });
    }
    await sleep(500);

    // 3. Order Ready
    try {
      const ok = await sendOrderReadyEmail({ ...sampleOrder, customer_email: to }, base44);
      results.push({ email: '3. Order Ready', success: ok });
    } catch (e) {
      results.push({ email: '3. Order Ready', success: false, error: e.message });
    }
    await sleep(500);

    // 4. Order Completed (Thank You + Review Request)
    try {
      const ok = await sendOrderCompletedEmail({ ...sampleOrder, customer_email: to }, base44);
      results.push({ email: '4. Order Completed (Thank You)', success: ok });
    } catch (e) {
      results.push({ email: '4. Order Completed (Thank You)', success: false, error: e.message });
    }
    await sleep(500);

    // 5. Recommendation Email — needs a real order to build recommendations from.
    try {
      const recentOrders = await base44.asServiceRole.entities.Order.list('-created_date', 10);
      const usable = (recentOrders || []).find(o =>
        o.status !== 'cancelled' &&
        o.payment_status !== 'failed' &&
        o.payment_status !== 'refunded' &&
        (o.items || []).length > 0
      );
      if (!usable) {
        results.push({ email: '5. Recommendation Email', success: false, error: 'No usable order found' });
      } else {
        const recRes = await base44.functions.invoke('sendOrderRecommendationEmail', {
          order_id: usable.id,
          test_email: to,
        });
        results.push({
          email: '5. Recommendation Email',
          success: recRes?.ok === true || recRes?.success !== false,
          detail: recRes?.email_type ? `type: ${recRes.email_type}` : recRes?.reason || 'Sent',
        });
      }
    } catch (e) {
      results.push({ email: '5. Recommendation Email', success: false, error: e.message });
    }
    await sleep(500);

    // 6. Cart Abandonment Reminder — same rich format as the real workflow.
    try {
      const html = await buildCartReminderHtml(base44, 'Jordan', [
        { name: 'Deluxe Burger', quantity: 1, price: 8.99, image_url: '' },
        { name: 'Crinkle-Cut Fries', quantity: 1, price: 3.49, image_url: '' },
        { name: '14 oz Chocolate Shake', quantity: 1, price: 5.99, image_url: '' },
      ], 18.47);
      const { error } = await resend.emails.send({
        from: 'Flavor Isle <smashie@flavor-isle.com>',
        to,
        subject: "🔥 Your bag's getting cold, Jordan — the grill's still hot!",
        html,
      });
      results.push({ email: '6. Cart Abandonment Reminder', success: !error, error: error?.message });
    } catch (e) {
      results.push({ email: '6. Cart Abandonment Reminder', success: false, error: e.message });
    }
    await sleep(500);

    // 7. Promo Broadcast
    try {
      const promoRes = await base44.functions.invoke('sendPromoEmailBroadcast', {
        subject: '🔥 Sample Promo: Fresh Tasty Threads Just Dropped!',
        body: 'Hey fam! We just dropped fresh Tasty Threads gear — limited-edition tees and hoodies with that classic Flavor Isle vibe. Tap below to shop the collection before they sell out!',
        test_email: to,
      });
      results.push({
        email: '7. Promo Broadcast',
        success: promoRes?.success !== false,
        detail: promoRes?.sent ? `${promoRes.sent} sent` : undefined,
      });
    } catch (e) {
      results.push({ email: '7. Promo Broadcast', success: false, error: e.message });
    }

    return Response.json({ success: true, sent_to: to, results });
  } catch (error) {
    console.error('sendAllSampleEmails error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});