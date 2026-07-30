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

    // Best-effort cleanup of associated personal data.
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