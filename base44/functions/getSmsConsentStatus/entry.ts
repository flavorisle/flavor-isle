import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { getConsentStatusForPhone } from '../../shared/smsConsent.ts';
import { normalizePhone } from '../../shared/blockedContacts.ts';

// Returns the consent state for a phone so the signup UI can show an
// already-subscribed state instead of the full form. Requires an authenticated
// user (the logged-in "already subscribed" check); guests get no data.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { phone } = body || {};
    if (!phone) return Response.json({ error: 'phone is required' }, { status: 400 });

    // Only the caller's own number. Answering for any number let a signed-in
    // user map the store's SMS list one probe at a time.
    const profiles = await base44.asServiceRole.entities.CustomerProfile.filter({ email: user.email });
    const ownPhone = normalizePhone(profiles?.[0]?.phone);
    if (!ownPhone || ownPhone !== normalizePhone(phone)) {
      return Response.json({ exists: false });
    }

    const status = await getConsentStatusForPhone(base44, phone);
    return Response.json(status);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}