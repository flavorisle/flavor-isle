import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { upsertSmsConsent, SMS_CONSENT_VERSION, DISCLOSURE_TEXT } from '../../shared/smsConsent.ts';
import { normalizePhone } from '../../shared/sendSmashieSms.ts';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Sign in to manage your preferences.' }, { status: 401 });
    const { action = 'status' } = await req.json();
    if (!['status', 'emailOff', 'emailOn', 'smsOff', 'smsOn'].includes(action)) {
      return Response.json({ error: 'Unknown action.' }, { status: 400 });
    }
    const email = user.email.trim().toLowerCase();
    const profiles = await base44.asServiceRole.entities.CustomerProfile.filter({ email });
    const phone = normalizePhone(profiles[0]?.phone || '');
    const subscriptions = await base44.asServiceRole.entities.EmailSubscriber.filter({ email });
    const subscriber = subscriptions[0];

    if (action === 'emailOff' && subscriber?.status !== 'unsubscribed') {
      if (subscriber) await base44.asServiceRole.entities.EmailSubscriber.update(subscriber.id, {
        status: 'unsubscribed', unsubscribed_at: new Date().toISOString(),
      });
    }
    if (action === 'emailOn' && subscriber?.status !== 'active') {
      const response = await base44.asServiceRole.functions.invoke('subscribeEmail', { email, source: 'account' });
      if (response?.data?.error) throw new Error(response.data.error);
    }
    if (action === 'smsOff' || action === 'smsOn') {
      if (!phone) return Response.json({ error: 'Add your phone number to your profile first.' }, { status: 400 });
      const existingSms = await base44.asServiceRole.entities.SMSSubscriber.filter({ phone });
      const result = await upsertSmsConsent(base44, {
        phone, sourcePage: 'account_preferences',
        disclosureVersion: SMS_CONSENT_VERSION,
        transactionalConsent: action === 'smsOn' && existingSms[0]?.status === 'active' && existingSms[0]?.transactional_consent === true,
        ...(action === 'smsOff'
          ? { revokeMarketingConsent: true }
          : { marketingConsent: true, disclosureText: DISCLOSURE_TEXT.marketing }),
      });
      if (!result.ok) throw new Error(result.error || 'Could not update SMS consent.');
    }
    const currentEmail = await base44.asServiceRole.entities.EmailSubscriber.filter({ email });
    const currentSms = phone ? await base44.asServiceRole.entities.SMSSubscriber.filter({ phone }) : [];
    const sms = currentSms[0];
    return Response.json({
      email: currentEmail[0]?.status || 'not_subscribed',
      phone: phone || null,
      sms: sms?.status === 'active' && sms.marketing_consent === true && sms.proven_marketing_consent === true ? 'active' : 'not_subscribed',
      transactionalSms: sms?.status === 'active' && sms.transactional_consent === true,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}