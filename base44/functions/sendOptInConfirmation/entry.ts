import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendSmashieSms } from '../../shared/sendSmashieSms.ts';

// Sends the welcome/confirmation text the moment someone opts in to SMS updates.
// Invoked by the "SMS Opt-In Confirmation" workflow on new SMSSubscriber records.
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

    // Keyword (JOIN) opt-ins already get an instant auto-reply from the
    // Twilio webhook — don't double-text them.
    if (sub.source === 'keyword') {
      return Response.json({ sent: false, skipped: 'keyword opt-in already confirmed' });
    }
    if (!sub.opted_in || sub.status !== 'active') {
      return Response.json({ sent: false, skipped: 'not opted in' });
    }

    const firstName = (sub.name || '').trim().split(' ')[0];
    const body = `Flavor Isle: ${firstName ? `Hey ${firstName}! ` : ''}You're signed up, fam! 🍔 You'll get order status texts, pay-by-text links & occasional offers. Msg&data rates may apply. Reply STOP to opt out, HELP for help.`;

    const sent = await sendSmashieSms(sub.phone, body);
    return Response.json({ sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}