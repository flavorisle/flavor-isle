import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Permanently deletes the calling user's account plus all personal data
// linked to them (profile, favorites, loyalty, redemptions, reviews).
// Required for App Store / WebView account-deletion compliance.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;
    const email = (user.email || '').toLowerCase().trim();

    // Best-effort cleanup of all personal data linked to this account.
    // Covers every entity that stores user-identifiable information so the
    // deletion satisfies App Store / WebView account-erasure requirements.
    const cleanup = [
      base44.asServiceRole.entities.CustomerProfile.deleteMany({ email }).catch((e) =>
        console.error('CustomerProfile cleanup failed:', e.message),
      ),
      base44.asServiceRole.entities.Favorite.deleteMany({ user_id: userId }).catch((e) =>
        console.error('Favorite cleanup failed:', e.message),
      ),
      base44.asServiceRole.entities.Loyalty.deleteMany({ user_id: userId }).catch((e) =>
        console.error('Loyalty cleanup failed:', e.message),
      ),
      base44.asServiceRole.entities.LoyaltyRedemption.deleteMany({ user_id: userId }).catch((e) =>
        console.error('LoyaltyRedemption cleanup failed:', e.message),
      ),
      base44.asServiceRole.entities.Review.deleteMany({ customer_email: email }).catch((e) =>
        console.error('Review cleanup failed:', e.message),
      ),
      base44.asServiceRole.entities.SavedPaymentMethod.deleteMany({ user_id: userId }).catch((e) =>
        console.error('SavedPaymentMethod cleanup failed:', e.message),
      ),
      base44.asServiceRole.entities.PushSubscription.deleteMany({ user_id: userId }).catch((e) =>
        console.error('PushSubscription cleanup failed:', e.message),
      ),
      base44.asServiceRole.entities.SocialReview.deleteMany({ customer_email: email }).catch((e) =>
        console.error('SocialReview cleanup failed:', e.message),
      ),
      base44.asServiceRole.entities.SMSSubscriber.deleteMany({ email }).catch((e) =>
        console.error('SMSSubscriber cleanup failed:', e.message),
      ),
      base44.asServiceRole.entities.RecommendationEmail.deleteMany({ customer_email: email }).catch((e) =>
        console.error('RecommendationEmail cleanup failed:', e.message),
      ),
      base44.asServiceRole.entities.ReviewRequestEmail.deleteMany({ customer_email: email }).catch((e) =>
        console.error('ReviewRequestEmail cleanup failed:', e.message),
      ),
      base44.asServiceRole.entities.LoyaltyEmail.deleteMany({ customer_email: email }).catch((e) =>
        console.error('LoyaltyEmail cleanup failed:', e.message),
      ),
    ];
    await Promise.all(cleanup);

    // Critical step: delete the user record itself.
    await base44.asServiceRole.entities.User.delete(userId);

    console.log(`Account deleted for user ${userId} (${email})`);
    return Response.json({ success: true, deleted: true });
  } catch (error) {
    console.error('deleteMyAccount error:', error.message);
    return Response.json({ error: error.message || 'Failed to delete account' }, { status: 500 });
  }
});