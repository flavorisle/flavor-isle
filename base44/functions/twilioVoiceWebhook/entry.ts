import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import twilio from 'npm:twilio@5.3.3';
import { getSmashieSettings } from '../../shared/smashieSettings.ts';
import { processPhoneMessageTurn } from '../../shared/phoneMessage.ts';

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

export default async function(req) {
  try {
    const bodyText = await req.text();
    const isJson = req.headers.get('content-type')?.includes('application/json');
    const body = isJson ? JSON.parse(bodyText || '{}') : Object.fromEntries(new URLSearchParams(bodyText));
    const params = new URLSearchParams(body);

    const callSid = params.get('CallSid') || '';
    const from = params.get('From') || '';
    const speechResult = params.get('SpeechResult') || '';
    const url = new URL(req.url);
    const isCallback = url.searchParams.get('callback') === '1' || params.get('callback') === '1';
    const buildCallbackUrl = (caller, conversationId, turn) => {
      const callback = new URL(`https://base44.app/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/twilioVoiceWebhook`);
      callback.searchParams.set('callback', '1');
      callback.searchParams.set('from', caller);
      callback.searchParams.set('convId', conversationId);
      callback.searchParams.set('turn', String(turn));
      return callback.toString();
    };

    // Return TwiML immediately; Twilio streams Smashie's OpenAI voice directly
    // instead of waiting here for generation plus a second file upload.
    const speak = async (twiml, text) => {
      const cleanText = forTTS(text);
      const audioUrl = new URL('https://crave.flavor-isle.com/functions/smashieTts');
      audioUrl.searchParams.set('text', cleanText);
      twiml.play({}, audioUrl.toString());
    };

    console.log(`Voice call ${callSid} from ${from}, speech: "${speechResult}"`);

    const base44 = createClientFromRequest(req);
    const VoiceResponse = twilio.twiml.VoiceResponse;

    // --- Initial greeting (no speech yet) ---
    if (!isCallback && !speechResult) {
      const settings = await getSmashieSettings(base44);
      if (!settings.voice_ordering_enabled) {
        const offTwiml = new VoiceResponse();
        await speak(offTwiml, "Yo fam, thanks for calling Flavor Isle! Our AI phone assistant is switched off right now. Please call back during business hours.");
        offTwiml.hangup();
        return new Response(offTwiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      // Every phone call gets its own conversation and complete transcript.
      const startedAt = new Date().toISOString();
      const convo = await base44.asServiceRole.agents.createConversation({
        agent_name: 'smashie',
        metadata: {
          name: `Voice Call - ${from}`,
          description: `Voice call from ${from}`,
          channel: 'voice',
          phone: from,
          call_sid: callSid,
        },
      });
      const conversationId = convo.id;
      await base44.asServiceRole.entities.SmsConversation.create({
        phone_number: from,
        conversation_id: conversationId,
        call_sid: callSid,
        channel: 'voice',
        last_message_at: startedAt,
        message_count: 0,
        status: 'active',
        transcript: [{ role: 'assistant', content: settings.greeting, timestamp: startedAt }],
      });

      const twiml = new VoiceResponse();
      await speak(twiml, settings.greeting);
      twiml.gather({
        input: 'speech',
        action: buildCallbackUrl(from, conversationId, 1),
        speechTimeout: '1',
        language: 'en-US',
        timeout: 8,
      });
      await speak(twiml, "My bad fam, I didn't catch that. Run it back when you're ready!");
      twiml.hangup();

      return new Response(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // --- Handle speech callback ---
    const conversationId = url.searchParams.get('convId') || params.get('convId') || '';
    const callerFrom = url.searchParams.get('from') || params.get('from') || from;
    const turn = parseInt(url.searchParams.get('turn') || params.get('turn') || '1', 10);
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
          speechTimeout: '1',
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

    // Phone ordering is intentionally available at all hours for testing.
    const statusContext = `[STORE STATUS: OPEN FOR PHONE TESTING. All open-hours capabilities are allowed regardless of the current time. The caller already heard Smashie's full introduction at the start of this call. Do not introduce yourself or repeat the greeting; respond directly to what they said.]`;

    const callRecords = await base44.asServiceRole.entities.SmsConversation.filter({ conversation_id: conversationId });
    const messageTurn = await processPhoneMessageTurn(
      base44,
      callRecords[0],
      speechResult,
      callerFrom,
      callSid,
      conversationId,
    );

    let replyText;
    if (messageTurn) {
      replyText = messageTurn.reply;
    } else {
      const conversation = await base44.asServiceRole.agents.getConversation(conversationId);
      const priorAssistantCount = (conversation.messages || []).filter(m => m.role === 'assistant').length;
      await base44.asServiceRole.agents.addMessage(conversation, {
        role: 'user',
        content: `${statusContext}\nCaller said: ${speechResult}`,
      });

      let messages = conversation.messages || [];
      for (let attempt = 0; attempt < 40; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 250));
        const refreshed = await base44.asServiceRole.agents.getConversation(conversationId);
        messages = refreshed.messages || [];
        if (messages.filter(m => m.role === 'assistant').length > priorAssistantCount) break;
      }
      const assistantMessages = messages.filter(m => m.role === 'assistant');
      const lastReply = assistantMessages[assistantMessages.length - 1];
      replyText = lastReply?.content || "Let me check on that for you fam!";
    }
    let spokenReply = replyText;

    // Smashie emits a structured token only after collecting all message details.
    const messageMatch = replyText.match(/\[\[PHONE_MESSAGE:(\{[\s\S]*?\})\]\]/i);
    if (messageMatch) {
      try {
        const messageData = JSON.parse(messageMatch[1]);
        if (!messageData.caller_name || !messageData.recipient || !messageData.message) {
          throw new Error('Incomplete phone message details');
        }
        await base44.asServiceRole.entities.PhoneMessage.create({
          caller_name: messageData.caller_name,
          caller_phone: callerFrom,
          recipient: messageData.recipient,
          message: messageData.message,
          conversation_id: conversationId,
          call_sid: callSid,
          channel: 'voice',
          status: 'new',
        });
        spokenReply = replyText.replace(messageMatch[0], '').trim() || "Got it — I'll make sure they get your message.";
      } catch (messageError) {
        console.error('Phone message save failed:', messageError.message);
        spokenReply = "I'm sorry, I couldn't save that message. Please try that one more time.";
      }
    }

    // Persist a clean, admin-readable transcript independent of agent ownership.
    const existing = await base44.asServiceRole.entities.SmsConversation.filter({ conversation_id: conversationId });
    if (existing[0]) {
      const timestamp = new Date().toISOString();
      const transcript = [
        ...(existing[0].transcript || []),
        { role: 'user', content: speechResult, timestamp },
        { role: 'assistant', content: spokenReply.replace(/\[\[TRANSFER\]\]/gi, '').trim(), timestamp },
      ];
      await base44.asServiceRole.entities.SmsConversation.update(existing[0].id, {
        last_message_at: timestamp,
        message_count: (existing[0].message_count || 0) + 2,
        transcript,
      });
    }

    // Check if order was completed (Smashie says goodbye/confirmed)
    const isOrderComplete = /thank you|enjoy your meal|order.*confirmed|that's everything|goodbye|have a great|all set|we're all good/i.test(spokenReply);
    const atTurnCap = turn >= MAX_TURNS;

    // Smashie can request a live transfer to the counter by including the
    // [[TRANSFER]] token in his reply. We strip the token, speak the rest, then
    // <Dial> the counter number (COUNTER_PHONE_NUMBER env). If no counter
    // number is configured, we fall through to the normal flow so Smashie can
    // take a message instead.
    const wantsTransfer = /\[\[TRANSFER\]\]/i.test(spokenReply);
    const counterNumber = Deno.env.get('COUNTER_PHONE_NUMBER');
    if (wantsTransfer && counterNumber) {
      const cleanReply = spokenReply.replace(/\[\[TRANSFER\]\]/gi, '').trim();
      const transferTwiml = new VoiceResponse();
      await speak(transferTwiml, cleanReply || "Bet — let me get you over to the counter, hold tight fam!");
      const dial = transferTwiml.dial({ timeout: 20 });
      dial.number(counterNumber);
      return new Response(transferTwiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

    const twiml = new VoiceResponse();
    await speak(twiml, spokenReply.replace(/\[\[TRANSFER\]\]/gi, '').trim());

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
        speechTimeout: '1',
        language: 'en-US',
        timeout: 8,
      });
      await speak(twiml, "You still there fam? Hit us back if we got disconnected!");
      twiml.hangup();
    }

    console.log(`Smashie replied to ${callerFrom} (turn ${turn}): ${spokenReply.substring(0, 100)}`);

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
}