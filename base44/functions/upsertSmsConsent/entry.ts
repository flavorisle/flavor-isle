import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';
import { upsertSmsConsent, SMS_CONSENT_VERSION } from '../../shared/smsConsent.ts';

// Public client-callable consent upsert. Used by the post-order, footer, and
// signup surfaces to record explicit, separate transactional and/or marketing
// consent. Never revokes (only the STOP webhook revokes). Guests may call it
// (opting in is harmless); it cannot be used to unsubscribe or to message anyone.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const {
      phone, name, email,
      transactionalConsent, marketingConsent,
      sourcePage, disclosureVersion, disclosureText,
    } = body || {};

    if (!phone) return Response.json({ error: 'phone is required' }, { status: 400 });
    if (!sourcePage) return Response.json({ error: 'sourcePage is required' }, { status: 400 });
    // At least one explicit choice must be expressed; both may be false (e.g. a
    // no-op submit) but we still record nothing then.
    if (transactionalConsent === undefined && marketingConsent === undefined) {
      return Response.json({ error: 'consent flags required' }, { status: 400 });
    }

    const result = await upsertSmsConsent(base44, {
      phone,
      name: name || undefined,
      email: email || undefined,
      transactionalConsent: !!transactionalConsent,
      marketingConsent: !!marketingConsent,
      sourcePage,
      disclosureVersion: disclosureVersion || SMS_CONSENT_VERSION,
      disclosureText: disclosureText || undefined,
    });

    if (!result.ok) return Response.json({ error: result.error || 'upsert failed' }, { status: 400 });
    return Response.json({ ok: true, ...result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}