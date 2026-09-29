import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { getSmashieSettings } from '../../shared/smashieSettings.ts';
import { getPhysicalStoreStatus } from '../../shared/storeClosure.ts';
import {
  upsertSmsConsent,
  stopSubscriber,
  checkSmsConsent,
  DISCLOSURE_TEXT,
  SMS_CONSENT_VERSION,
} from '../../shared/smsConsent.ts';

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

    // ── Keyword handling ──
    // Carriers recognize these standard keywords. We intercept them before
    // routing to Smashie so consent is managed per-category for the
    // SMSSubscriber list. JOIN no longer auto-enrolls (that was the bundled
    // consent 30913 cause) — it asks the user to choose ORDERS or OFFERS.
    const upper = body.trim().toUpperCase().replace(/[^A-Z]/g, '');
    const OPT_OUT = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT', 'STOPALL', 'UNSUB'];
    const HELP = ['HELP', 'INFO'];
    const JOIN = ['JOIN', 'SUBSCRIBE', 'START', 'YES', 'OPTIN'];
    const ORDERS = ['ORDERS', 'ORDER', 'TXN', 'TRANSACTIONAL'];
    const OFFERS = ['OFFERS', 'OFFER', 'PROMO', 'PROMOTIONS', 'MARKETING', 'DEALS'];

    const xmlReply = (msg: string) =>
      new Response(
        `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${msg.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</Message></Response>`,
        { headers: { 'Content-Type': 'text/xml' } }
      );

    // STOP — global opt-out. Suppresses ALL outbound SMS (transactional + marketing).
    if (OPT_OUT.includes(upper)) {
      await stopSubscriber(base44, from);
      return xmlReply('Flavor Isle: You\'re unsubscribed and won\'t receive more texts. Reply ORDERS for order updates only or OFFERS for order updates + offers to opt back in. Msg&data rates may apply.');
    }

    if (HELP.includes(upper)) {
      return xmlReply('Flavor Isle: Text ORDERS for order updates only, OFFERS for order updates + recurring promotional offers, or STOP to cancel all. Msg&data rates may apply. Terms: https://taste-isle-express.base44.app/terms-of-service');
    }

    // JOIN — ask the user to pick a category. Do NOT auto-enroll.
    if (JOIN.includes(upper)) {
      return xmlReply('Flavor Isle: Reply ORDERS for order updates only, or OFFERS for order updates + recurring promotional offers. Msg&data rates may apply. STOP to cancel, HELP for help.');
    }

    // ORDERS — transactional only.
    if (ORDERS.includes(upper)) {
      await upsertSmsConsent(base44, {
        phone: from,
        transactionalConsent: true,
        marketingConsent: false,
        sourcePage: 'keyword_orders',
        disclosureVersion: SMS_CONSENT_VERSION,
        disclosureText: DISCLOSURE_TEXT.transactional,
      });
      return xmlReply('Flavor Isle: You\'re signed up for ORDER updates (confirmed, preparing, ready) & pay-by-text links. Optional, not a condition of purchase. Msg&data rates may apply. Reply STOP to cancel, HELP for help.');
    }

    // OFFERS — transactional + explicit marketing.
    if (OFFERS.includes(upper)) {
      await upsertSmsConsent(base44, {
        phone: from,
        transactionalConsent: true,
        marketingConsent: true,
        sourcePage: 'keyword_offers',
        disclosureVersion: SMS_CONSENT_VERSION,
        disclosureText: `${DISCLOSURE_TEXT.transactional} ${DISCLOSURE_TEXT.marketing}`,
      });
      return xmlReply('Flavor Isle: You\'re signed up for ORDER updates + recurring promotional offers. Consent is not a condition of purchase. Msg&data rates may apply. Reply STOP to cancel, HELP for help.');
    }

    // ── Conversational path (customer care via Smashie) ──
    // Global STOP suppresses ALL outbound SMS, including this reply. A phone
    // with no record can still get a conversational reply (they haven't opted out).
    const consent = await checkSmsConsent(base44, from, 'transactional');
    if (consent.subscriber && consent.subscriber.status === 'unsubscribed') {
      console.log(`Suppressing conversational reply to ${from}: globally stopped`);
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // Look up existing SMS conversation for this phone number
    const existing = await base44.asServiceRole.entities.SmsConversation.filter({ phone_number: from });
    let smsRecord = existing[0] || null;
    let conversation;

    if (smsRecord) {
      conversation = await base44.asServiceRole.agents.getConversation(smsRecord.conversation_id);
    } else {
      conversation = await base44.asServiceRole.agents.createConversation({
        agent_name: 'smashie',
        metadata: {
          name: `SMS - ${from}`,
          description: `SMS order from ${from}`,
          channel: 'sms',
          phone: from,
        },
      });
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

    // Attach the same STORE STATUS + CHANNEL context the phone and web-chat
    // channels attach, so Smashie knows this is a TEXT (not a call), already
    // knows the customer's number (that's how the secure pay link gets texted
    // back to the right person), and never attempts a call-only action in a
    // reply the customer reads verbatim.
    let statusLine = '';
    try {
      const storeStatus = await getPhysicalStoreStatus(base44);
      statusLine = storeStatus.open
        ? 'STORE STATUS: OPEN'
        : `STORE STATUS: CLOSED${storeStatus.message ? ` — ${storeStatus.message}` : ''}`;
    } catch (statusErr) {
      // Never let the status lookup break the reply — the chat channel fails
      // open the same way.
      console.warn('SMS store status lookup failed:', statusErr.message);
    }
    const channelLine = `CHANNEL: SMS text message — this is a TEXT, not a phone call. The customer's phone number is ${from}: pass this exact number to logPhoneOrder as customer_phone. Counter transfers are NOT possible by text and the customer sees every character you send, so never offer a transfer, never use the [[TRANSFER]] token, and never use the [[PHONE_MESSAGE:...]] token — offer (270) 563-4618 or take the details and say management will follow up.`;
    const smsContext = `[[CTX]]${statusLine}\n${channelLine}[[/CTX]]\n`;

    // Smashie's reply lands on the conversation asynchronously, so wait for it
    // the same way the voice webhook does (up to 10s). Reading the conversation
    // straight after addMessage returned no messages and the customer got the
    // canned greeting instead of an answer.
    const conversationId = smsRecord.conversation_id;
    const before = await base44.asServiceRole.agents.getConversation(conversationId);
    const priorAssistantCount = (before.messages || []).filter(m => m.role === 'assistant').length;

    await base44.asServiceRole.agents.addMessage(conversation, {
      role: 'user',
      content: `${smsContext}${body}`,
    });

    let messages = [];
    for (let attempt = 0; attempt < 40; attempt += 1) {
      await new Promise(resolve => setTimeout(resolve, 250));
      const refreshed = await base44.asServiceRole.agents.getConversation(conversationId);
      messages = refreshed.messages || [];
      if (messages.filter(m => m.role === 'assistant').length > priorAssistantCount) break;
    }
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const lastReply = assistantMessages[assistantMessages.length - 1];
    // Strip any structured token Smashie may have emitted for another channel
    // (call transfers, phone messages) — raw tokens must never reach a
    // customer's phone.
    const rawReply = lastReply?.content || settings.greeting;
    const replyText = rawReply.replace(/\[\[[\s\S]*?\]\]/g, '').trim() || settings.greeting;

    await base44.asServiceRole.entities.SmsConversation.update(smsRecord.id, {
      last_message_at: new Date().toISOString(),
      message_count: (smsRecord.message_count || 0) + 1,
    });

    // Send the reply via the Twilio REST API directly. The Twilio npm SDK
    // throws "Unsupported cache mode: default" under Deno, so we call the REST
    // endpoint with fetch + Basic auth instead — same pattern as
    // sendOrderReadyAlert. StatusCallback records delivery failures.
    const smsUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
    const smsParams = new URLSearchParams({
      From: twilioPhoneNumber,
      To: from,
      Body: replyText,
      StatusCallback: 'https://flavor-isle.com/functions/twilioSmsStatus',
    });
    const smsRes = await fetch(smsUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${twilioAccountSid}:${twilioAuthToken}`)}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: smsParams.toString(),
    });
    if (!smsRes.ok) {
      const smsErr = await smsRes.text();
      throw new Error(`Twilio SMS failed (${smsRes.status}): ${smsErr}`);
    }

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