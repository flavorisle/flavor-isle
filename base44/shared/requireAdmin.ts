// Shared authorization helper for staff-only backend functions.
// Returns the authenticated admin user, or throws a Response-ready error.
export async function requireAdmin(base44) {
  const user = await base44.auth.me().catch(() => null);
  if (!user) {
    return { user: null, error: Response.json({ error: 'Authentication required' }, { status: 401 }) };
  }
  if (user.role !== 'admin') {
    return { user: null, error: Response.json({ error: 'Admin access required' }, { status: 403 }) };
  }
  return { user, error: null };
}