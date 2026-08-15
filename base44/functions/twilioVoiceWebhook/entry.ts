import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import twilio from 'npm:twilio@5.3.3';
import { getSmashieSettings } from '../../shared/smashieSettings.ts';
import { getStoreStatus } from '../../shared/storeHours.ts';
import { generateSmashieVoice } from '../../shared/smashieVoice.ts';

// Helper: strip markdown for TTS
function stripMarkdown(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/#{1,6}\s/g, '')
    .replace(/🍔|🥤|🍟|🍳|🥧|⭐|🎉|😊|👋/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}

// Truncate for TTS (Twilio Say has limits)
function forTTS(text) {
  const clean = stripMarkdown(text);
  return clean.length > 600 ? clean.substring(0, 597) + '...' : clean;
}

Deno.serve(async (req) => {
  try {
    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const callSid = params.get('CallSid') || '';
    const from = params.get('From') || '';
    const speechResult = params.get('SpeechResult') || '';
    const url = new URL(req.url);
    const isCallback = url.searchParams.get('callback') === '1';
    const buildCallbackUrl = (caller, conversationId, turn) => {
      const callback = new URL(`https://base44.app/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/twilioVoiceWebhook`);
      callback.searchParams.set('callback', '1');
      callback.searchParams.set('from', caller);
      callback.searchParams.set('convId', conversationId);
      callback.searchParams.set('turn', String(turn));
      return callback.toString();
    };

    // Generate each line with OpenAI's natural young male voice, upload it to
    // a public audio URL, then let Twilio play it. Keep a reliable fallback.
    const speak = async (twiml, text) => {
      const cleanText = forTTS(text);
      try {
        const audioUrl = await generateSmashieVoice(base44, cleanText);
        twiml.play({}, audioUrl);
      } catch (error) {
        console.error('OpenAI voice fallback:', error.message);
        twiml.say({ voice: 'Polly.Matthew-Generative', language: 'en-US' }, cleanText);
      }
    };

    console.log(`Voice call ${callSid} from ${from}, speech: "${speechResult}"`);

    const base44 = createClientFromRequest(req);
    const VoiceResponse = twilio.twiml.VoiceResponse;

    // --- Initial greeting (no speech yet) ---
    if (!isCallback && !speechResult) {
      const settings = await getSmashieSettings(base44);
      const storeStatus = await getStoreStatus(base44);
      if (!settings.voice_ordering_enabled) {
        const offTwiml = new VoiceResponse();
        await speak(offTwiml, "Yo fam, thanks for calling Flavor Isle! Our AI phone assistant is switched off right now. Please call back during business hours.");
        offTwiml.hangup();
        return new Response(offTwiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      // Look up or create conversation
      const existing = await base44.asServiceRole.entities.SmsConversation.filter({
        phone_number: from,
        status: 'active',
      });

      let conversationId;

      if (existing[0]) {
        conversationId = existing[0].conversation_id;
      } else {
        const convo = await base44.asServiceRole.agents.createConversation({
          agent_name: 'smashie',
          metadata: {
            name: `Voice Order - ${from}`,
            description: `Voice call order from ${from}`,
            channel: 'voice',
            phone: from,
          },
        });
        await base44.asServiceRole.entities.SmsConversation.create({
          phone_number: from,
          conversation_id: convo.id,
          channel: 'voice',
          last_message_at: new Date().toISOString(),
          message_count: 0,
          status: 'active',
        });
        conversationId = convo.id;
      }

      const twiml = new VoiceResponse();
      const greeting = storeStatus.isOpen
        ? settings.greeting
        : `Yo fam, thanks for calling Flavor Isle! We're closed right now, and we open ${storeStatus.nextOpenLabel}. I'm Smashie. I can share Flavor Isle history, tell you our opening time, or take a message for management. What can I help with?`;
      await speak(twiml, greeting);
      twiml.gather({
        input: 'speech',
        action: buildCallbackUrl(from, conversationId, 1),
        speechTimeout: 'auto',
        language: 'en-US',
        timeout: 8,
      });
      await speak(twiml, storeStatus.isOpen
        ? "My bad fam, I didn't catch that. Run it back when you're ready!"
        : "My bad fam, I didn't catch that. I can share our history, opening time, or take a message for management.");
      twiml.hangup();

      return new Response(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // --- Handle speech callback ---
    const conversationId = url.searchParams.get('convId') || '';
    const callerFrom = url.searchParams.get('from') || from;
    const turn = parseInt(url.searchParams.get('turn') || '1', 10);
    const MAX_TURNS = 14;

    const callbackUrl = (nextTurn) =>
      buildCallbackUrl(callerFrom, conversationId, nextTurn);

    // Empty speech — re-prompt once before politely ending the call.
    if (!speechResult) {
      const twiml = new VoiceResponse();
      if (turn <= 2) {
        await speak(twiml, "Yo, I didn't catch that — run that back for me?");
        twiml.gather({
          input: 'speech',
          action: callbackUrl(turn + 1),
          speechTimeout: 'auto',
          language: 'en-US',
          timeout: 8,
        });
      }
      await speak(twiml, "No worries fam — hit us back when you're ready. Bet!");
      twiml.hangup();
      return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

    if (!conversationId) {
      const twiml = new VoiceResponse();
      await speak(twiml, "Yo, I'm having trouble pulling up your call — hit us back real quick!");
      twiml.hangup();
      return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

    // Attach live store status to every turn so closed-hours restrictions cannot
    // drift during a long call or when admin-configured hours change.
    const storeStatus = await getStoreStatus(base44);
    const statusContext = storeStatus.isOpen
      ? `[STORE STATUS: OPEN. Flavor Isle closes today at ${storeStatus.closeTime}. Open-hours capabilities are allowed. The caller already heard Smashie's full introduction at the start of this call. Do not introduce yourself or repeat the greeting; respond directly to what they said.]`
      : `[STORE STATUS: CLOSED. Flavor Isle opens ${storeStatus.nextOpenLabel}. Closed-mode rules are mandatory: only history, next opening time, or a management message. The caller already heard Smashie's full introduction at the start of this call. Do not introduce yourself or repeat the greeting; respond directly to what they said.]`;

    const conversation = await base44.asServiceRole.agents.getConversation(conversationId);
    const updatedConversation = await base44.asServiceRole.agents.addMessage(conversation, {
      role: 'user',
      content: `${statusContext}\nCaller said: ${speechResult}`,
    });

    // Get Smashie's reply
    const messages = updatedConversation.messages || [];
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const lastReply = assistantMessages[assistantMessages.length - 1];
    const replyText = lastReply?.content || "Let me check on that for you fam!";

    // Update conversation record
    const existing = await base44.asServiceRole.entities.SmsConversation.filter({
      phone_number: callerFrom,
      status: 'active',
    });
    if (existing[0]) {
      await base44.asServiceRole.entities.SmsConversation.update(existing[0].id, {
        last_message_at: new Date().toISOString(),
        message_count: (existing[0].message_count || 0) + 1,
      });
    }

    // Check if order was completed (Smashie says goodbye/confirmed)
    const isOrderComplete = /thank you|enjoy your meal|order.*confirmed|that's everything|goodbye|have a great|all set|we're all good/i.test(replyText);
    const atTurnCap = turn >= MAX_TURNS;

    // Smashie can request a live transfer to the counter by including the
    // [[TRANSFER]] token in his reply. We strip the token, speak the rest, then
    // <Dial> the counter number (COUNTER_PHONE_NUMBER env). If no counter
    // number is configured, we fall through to the normal flow so Smashie can
    // take a message instead.
    const wantsTransfer = /\[\[TRANSFER\]\]/i.test(replyText);
    const counterNumber = Deno.env.get('COUNTER_PHONE_NUMBER');
    if (storeStatus.isOpen && wantsTransfer && counterNumber) {
      const cleanReply = replyText.replace(/\[\[TRANSFER\]\]/gi, '').trim();
      const transferTwiml = new VoiceResponse();
      await speak(transferTwiml, cleanReply || "Bet — let me get you over to the counter, hold tight fam!");
      const dial = transferTwiml.dial({ timeout: 20 });
      dial.number(counterNumber);
      return new Response(transferTwiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

    const twiml = new VoiceResponse();
    const safeReply = storeStatus.isOpen ? replyText : replyText.replace(/\[\[TRANSFER\]\]/gi, '').trim();
    await speak(twiml, safeReply);

    if (isOrderComplete || atTurnCap) {
      if (atTurnCap && !isOrderComplete) {
        await speak(twiml, "Aight fam, let's wrap this up — hit us back if you need anything else. We got you!");
      }
      twiml.hangup();
    } else {
      // Keep listening
      twiml.gather({
        input: 'speech',
        action: callbackUrl(turn + 1),
        speechTimeout: 'auto',
        language: 'en-US',
        timeout: 8,
      });
      await speak(twiml, "You still there fam? Hit us back if we got disconnected!");
      twiml.hangup();
    }

    console.log(`Smashie replied to ${callerFrom} (turn ${turn}): ${replyText.substring(0, 100)}`);

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('twilioVoiceWebhook error:', error.message);
    const twilio_twiml = twilio.twiml;
    const twiml = new twilio_twiml.VoiceResponse();
    twiml.say({ voice: 'Polly.Matthew-Generative', language: 'en-US' }, "Yo, we hit a little tech snag — hit us back in a sec and we'll get you right!");
    twiml.hangup();
    return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
  }
});