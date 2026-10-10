import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendSmashieSms } from '../../shared/sendSmashieSms.ts';
import { findBlock } from '../../shared/blockedContacts.ts';

// Sends a category-aware welcome/confirmation text the moment someone opts in
// to SMS via a website surface (checkout post-order, footer, sms_signup).
// Invoked by the "SMS Opt-In Confirmation" workflow on new SMSSubscriber records.
//
// Keyword (ORDERS/OFFERS) opt-ins are excluded — the Twilio webhook already
// sends an instant, category-specific auto-reply, so double-texting would
// violate the quiet hours / frequency expectations.
// STOP records (consent_category "none") are never texted.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { subscriber_id } = await req.json();
    if (!subscriber_id) {
      return Response.json({ error: 'subscriber_id required' }, { status: 400 });
    }

    const sub = await base44.asServiceRole.entities.SMSSubscriber.get(subscriber_id);
    if (!sub) {
      return Response.json({ error: 'Subscriber not found' }, { status: 404 });
    }

    // Keyword opt-ins already got an instant auto-reply from the Twilio webhook.
    const src = (sub.consent_source_page || sub.source || '').toLowerCase();
    if (src.startsWith('keyword')) {
      return Response.json({ sent: false, skipped: 'keyword opt-in already confirmed' });
    }
    // Only text when a consent was actually granted (not a STOP / no-consent record).
    if (!sub.opted_in || sub.status !== 'active' || (sub.consent_category || 'none') === 'none') {
      return Response.json({ sent: false, skipped: 'no active consent' });
    }

    // Issue #93 (A14): a blocked contact is never texted, opt-in or not.
    const block = await findBlock(base44, { phone: sub.phone, email: sub.email }).catch((e) => {
      console.error('Blocked-contact lookup failed, sending anyway:', e.message);
      return null;
    });
    if (block) {
      console.log(`Opt-in confirmation skipped for ${sub.phone}: contact is on the block list.`);
      return Response.json({ sent: false, skipped: 'contact is blocked' });
    }

    const firstName = (sub.name || '').trim().split(' ')[0];
    const hasMarketing = !!sub.marketing_consent && !!sub.proven_marketing_consent;
    const body = hasMarketing
      ? `Flavor Isle: ${firstName ? `Hey ${firstName}! ` : ''}You're signed up for order updates AND recurring offers. 🍔 Msg&data rates may apply. Reply STOP to opt out, HELP for help. Terms: https://flavor-isle.com/terms-of-service`
      : `Flavor Isle: ${firstName ? `Hey ${firstName}! ` : ''}You're signed up for order status updates (confirmed, preparing, ready) & pay-by-text links. 🍔 Msg&data rates may apply. Reply STOP to opt out, HELP for help. Terms: https://flavor-isle.com/terms-of-service`;

    const sent = await sendSmashieSms(sub.phone, body);
    return Response.json({ sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}