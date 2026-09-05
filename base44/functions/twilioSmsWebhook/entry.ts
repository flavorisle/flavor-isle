import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import twilio from 'npm:twilio@5.3.3';
import { getSmashieSettings } from '../../shared/smashieSettings.ts';

Deno.serve(async (req) => {
  try {
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioPhoneNumber = Deno.env.get('TWILIO_PHONE_NUMBER');

    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const from = params.get('From') || '';
    const body = params.get('Body') || '';

    console.log(`SMS from ${from}: ${body}`);

    if (!from || !body) {
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const base44 = createClientFromRequest(req);

    // ── Keyword opt-in / opt-out / help handling ──
    // Carriers recognize these standard keywords. We intercept them before
    // routing to Smashie so consent is managed for the SMSSubscriber list.
    const upper = body.trim().toUpperCase().replace(/[^A-Z]/g, '');
    const OPT_IN = ['JOIN', 'SUBSCRIBE', 'START', 'YES', 'OPTIN', 'OPTIN'];
    const OPT_OUT = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'STOPALL', 'UNSUB'];
    const HELP = ['HELP', 'INFO'];

    const xmlReply = (msg: string) =>
      new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${msg.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</Message></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      );

    if (OPT_OUT.includes(upper)) {
      const subs = await base44.asServiceRole.entities.SMSSubscriber.filter({ phone: from });
      if (subs[0]) {
        await base44.asServiceRole.entities.SMSSubscriber.update(subs[0].id, { status: 'unsubscribed', opted_in: false });
      }
      return xmlReply('Flavor Isle: You\'re unsubscribed and won\'t receive more texts. Reply JOIN to opt back in. Msg&data rates may apply.');
    }

    if (HELP.includes(upper)) {
      return xmlReply('Flavor Isle: Get order updates, payment links & occasional offers. Msg&data rates may apply. Text STOP to opt out, JOIN to opt in. Questions? Call (270) 563-4618.');
    }

    if (OPT_IN.includes(upper)) {
      const subs = await base44.asServiceRole.entities.SMSSubscriber.filter({ phone: from });
      if (subs[0]) {
        await base44.asServiceRole.entities.SMSSubscriber.update(subs[0].id, { status: 'active', opted_in: true });
      } else {
        await base44.asServiceRole.entities.SMSSubscriber.create({
          phone: from,
          opted_in: true,
          source: 'keyword',
          status: 'active',
        });
      }
      return xmlReply('Flavor Isle: You\'re subscribed! Get order updates, payment links & occasional offers. Msg&data rates may apply. Text STOP anytime to opt out.');
    }

    // Look up existing SMS conversation for this phone number
    const existing = await base44.asServiceRole.entities.SmsConversation.filter({ phone_number: from });
    let smsRecord = existing[0] || null;
    let conversation;

    if (smsRecord) {
      // Load existing conversation
      conversation = await base44.asServiceRole.agents.getConversation(smsRecord.conversation_id);
    } else {
      // Create a new Smashie conversation
      conversation = await base44.asServiceRole.agents.createConversation({
        agent_name: 'smashie',
        metadata: {
          name: `SMS - ${from}`,
          description: `SMS order from ${from}`,
          channel: 'sms',
          phone: from,
        },
      });
      // Save the conversation reference
      smsRecord = await base44.asServiceRole.entities.SmsConversation.create({
        phone_number: from,
        conversation_id: conversation.id,
        channel: 'sms',
        last_message_at: new Date().toISOString(),
        message_count: 0,
        status: 'active',
      });
      console.log(`New SMS conversation for ${from}: ${conversation.id}`);
    }

    // Respect the admin's SMS auto-reply toggle — if off, log the inbound text
    // but don't route it through Smashie or send a reply.
    const settings = await getSmashieSettings(base44);
    if (!settings.sms_auto_reply_enabled) {
      console.log(`SMS auto-reply disabled — ignoring message from ${from}`);
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Send message to Smashie
    const updatedConversation = await base44.asServiceRole.agents.addMessage(conversation, {
      role: 'user',
      content: body,
    });

    // Get latest assistant reply
    const messages = updatedConversation.messages || [];
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const lastReply = assistantMessages[assistantMessages.length - 1];
    const replyText = lastReply?.content || settings.greeting;

    // Update conversation record
    await base44.asServiceRole.entities.SmsConversation.update(smsRecord.id, {
      last_message_at: new Date().toISOString(),
      message_count: (smsRecord.message_count || 0) + 1,
    });

    // Send SMS reply
    const twilioClient = twilio(twilioAccountSid, twilioAuthToken);
    await twilioClient.messages.create({
      body: replyText,
      from: twilioPhoneNumber,
      to: from,
    });

    console.log(`Replied to ${from}: ${replyText.substring(0, 100)}`);

    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('twilioSmsWebhook error:', error.message);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
      headers: { 'Content-Type': 'text/xml' },
    });
  }
});