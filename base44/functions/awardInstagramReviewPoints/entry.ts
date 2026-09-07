import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const POINTS_AWARD = 100;

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { customer_email, instagram_post_url, customer_name } = body || {};

    if (!customer_email || !instagram_post_url) {
      return Response.json({
        success: false,
        message: 'Customer email and Instagram post URL are required.',
      }, { status: 400 });
    }

    const email = String(customer_email).toLowerCase().trim();
    const postUrl = String(instagram_post_url).trim();

    // 1. Same post can't be claimed twice.
    const existingPost = await base44.asServiceRole.entities.SocialReview.filter({
      instagram_post_url: postUrl,
    });
    if (existingPost && existingPost.length > 0) {
      return Response.json({
        success: false,
        message: 'This Instagram post has already been submitted for points.',
      }, { status: 409 });
    }

    // 2. One Instagram review reward per customer per week.
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const priorClaims = await base44.asServiceRole.entities.SocialReview.filter({
      customer_email: email,
    });
    const recentClaims = (priorClaims || []).filter(
      (c) => new Date(c.created_date) >= oneWeekAgo
    );
    if (recentClaims.length > 0) {
      return Response.json({
        success: false,
        message: "You've already earned Instagram review points this week. Come back next week!",
      }, { status: 429 });
    }

    // 3. Find the loyalty account.
    const accounts = await base44.asServiceRole.entities.Loyalty.filter({ email });
    if (!accounts || accounts.length === 0) {
      return Response.json({
        success: false,
        message: 'No loyalty account found for this email. Please create an account first.',
      }, { status: 404 });
    }

    const loyalty = accounts[0];
    const newBalance = (loyalty.points_balance || 0) + POINTS_AWARD;
    const newEarned = (loyalty.points_earned || 0) + POINTS_AWARD;

    // 4. Tier from lifetime points earned.
    let newTier = 'bronze';
    if (newEarned >= 1000) newTier = 'gold';
    else if (newEarned >= 500) newTier = 'silver';

    // 5. Credit the points.
    await base44.asServiceRole.entities.Loyalty.update(loyalty.id, {
      points_balance: newBalance,
      points_earned: newEarned,
      tier: newTier,
    });

    // 6. Log the submission.
    await base44.asServiceRole.entities.SocialReview.create({
      customer_email: email,
      customer_name: customer_name || '',
      instagram_post_url: postUrl,
      points_awarded: POINTS_AWARD,
      loyalty_id: loyalty.id,
      status: 'verified',
    });

    return Response.json({
      success: true,
      message: `Successfully awarded ${POINTS_AWARD} points!`,
      new_points_balance: newBalance,
      tier: newTier,
      points_to_next_tier:
        newTier === 'bronze' ? 500 - newEarned : newTier === 'silver' ? 1000 - newEarned : 0,
    });
  } catch (error) {
    console.error('Error awarding Instagram review points:', error);
    return Response.json({
      success: false,
      message: 'Something went wrong. Please try again.',
    }, { status: 500 });
  }
}