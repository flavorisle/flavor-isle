import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { getUnifiedStoreState, getPhoneStoreStatus } from '../../shared/storeState.ts';

// Read-only mirror for the Smashie settings page: what the phone line is doing
// right now, read from the same unified store state the phone itself uses. Admin
// only — it exposes switch positions, never customer data.
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const [state, phoneStatus] = await Promise.all([
      getUnifiedStoreState(base44),
      getPhoneStoreStatus(base44),
    ]);

    return Response.json({ state, phoneStatus });
  } catch (error) {
    console.error('getStoreStateForAdmin error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}