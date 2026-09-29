import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import twilio from 'npm:twilio@5.3.3';
import { waitUntil } from 'base44:runtime';
import { getSmashieSettings } from '../../shared/smashieSettings.ts';
import { phoneIntro, abilityEnabled, smashieAdminContext } from '../../shared/smashieAdminContext.ts';
import { processPhoneMessageTurn } from '../../shared/phoneMessage.ts';
import { lookupCustomerByPhone } from '../../shared/squareCustomer.ts';
import { todayChicago } from '../../shared/busynessTime.ts';
import { getPhysicalStoreStatus } from '../../shared/storeClosure.ts';
import { getBusynessStage, COOK_WINDOW_MINUTES } from '../../shared/busynessStages.ts';
import { fastGreetingResponse, SMASHIE_HELLO } from '../../shared/smashieFastGreeting.ts';
import { greetingAudio } from '../../shared/smashieGreetingAudio.ts';

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

// Compute the current live busyness level so Smashie's greeting and ongoing
// context reflect real kitchen load (same logic as the website busyness bar).
async function getBusynessLevel(base44) {
  try {
    const today = todayChicago();
    const [profiles, live] = await Promise.all([
      base44.asServiceRole.entities.BusynessProfile.filter({ weekday: today.weekday }),
      base44.asServiceRole.entities.HourlyCount.filter({ date: today.dateKey }),
    ]);
    const profMap = {};
    (profiles || []).forEach(p => { profMap[p.hour] = p; });
    const liveMap = {};
    (live || []).forEach(l => { liveMap[l.hour] = l.order_count; });

    const curHourCount = liveMap[today.hour] || 0;
    const minute = today.minute || 0;
    const prevHour = (today.hour + 23) % 24;
    const prevCount = liveMap[prevHour] || 0;

    // Active queue: orders in the last 20 min (cook time). Orders older than
    // this have been served and no longer contribute to kitchen load.
    let activeCount;
    if (minute >= COOK_WINDOW_MINUTES) {
      activeCount = Math.round((curHourCount * COOK_WINDOW_MINUTES) / minute);
    } else {
      const prevSlice = Math.round((prevCount * (COOK_WINDOW_MINUTES - minute)) / 60);
      activeCount = curHourCount + prevSlice;
    }

    const stage = getBusynessStage(activeCount);
    return stage.level === 'Slammed' ? 'Slammed — Expect a Wait' : stage.level;
  } catch (e) {
    console.error('getBusynessLevel failed:', e.message);
    return 'Running Smooth';
  }
}

// Email admins when a counter transfer bounces right back (phone off hook).
async function sendAdminPhoneOffHookAlert(base44, callerFrom, conversationId, dialCallStatus) {
  try {
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    const emails = (admins || []).map(a => a.email).filter(Boolean);
    // Extra alert recipients who aren't admin users in the app.
    const extraAlertEmails = ['ashleybooker29@gmail.com'];
    for (const email of [...emails, ...extraAlertEmails]) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        from_name: 'Smashie',
        subject: 'Flavor Isle — Counter phone off hook',
        body: [
          `A caller (${callerFrom}) asked to be transferred to the counter, but the call bounced right back to Smashie.`,
          ``,
          `DialCallStatus: ${dialCallStatus}`,
          `Conversation: ${conversationId}`,
          ``,
          `The counter phone may be off the hook or unattended — please check the counter line.`,
        ].join('\n'),
      });
    }
  } catch (e) {
    console.error('Admin phone-off-hook alert failed:', e.message);
  }
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
    const greeting = fastGreetingResponse(url, params);
    if (greeting) return greeting;
    const greetingStarted = url.searchParams.get('greetingStarted') === '1' || params.get('greetingStarted') === '1';
    const isCallback = url.searchParams.get('callback') === '1' || params.get('callback') === '1';
    const isTransferCallback = url.searchParams.get('transfer') === '1' || params.get('transfer') === '1';
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
      const recorded = greetingAudio(cleanText);
      if (recorded) {
        twiml.play({}, recorded);
        return;
      }
      const audioUrl = new URL('https://taste-isle-express.base44.app/functions/smashieTts');
      audioUrl.searchParams.set('text', cleanText);
      twiml.play({}, audioUrl.toString());
    };

    console.log(`Voice call ${callSid} from ${from}, speech: "${speechResult}"`);

    const base44 = createClientFromRequest(req);
    const VoiceResponse = twilio.twiml.VoiceResponse;

    // --- Transfer callback (counter didn't answer / phone off hook) ---
    if (isTransferCallback) {
      const dialCallStatus = params.get('DialCallStatus') || '';
      const transferConvId = url.searchParams.get('convId') || params.get('convId') || '';
      const transferFrom = url.searchParams.get('from') || params.get('from') || from;

      if (dialCallStatus === 'completed') {
        const endTwiml = new VoiceResponse();
        endTwiml.hangup();
        return new Response(endTwiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
      }

      // Counter didn't answer — alert admins and re-enter the Smashie conversation.
      await sendAdminPhoneOffHookAlert(base44, transferFrom, transferConvId, dialCallStatus);

      try {
        const existing = await base44.asServiceRole.entities.SmsConversation.filter({ conversation_id: transferConvId });
        if (existing[0]) {
          const ts = new Date().toISOString();
          await base44.asServiceRole.entities.SmsConversation.update(existing[0].id, {
            last_message_at: ts,
            message_count: (existing[0].message_count || 0) + 1,
            transcript: [
              ...(existing[0].transcript || []),
              { role: 'assistant', content: `[Counter transfer bounced back — ${dialCallStatus}. Admins alerted.] Yo fam, looks like the counter's tied up right now — but I'm still here! What can I help you with?`, timestamp: ts },
            ],
          });
        }
      } catch (e) {
        console.error('Transcript update for transfer bounce-back failed:', e.message);
      }

      const bounceTwiml = new VoiceResponse();
      await speak(bounceTwiml, "Yo fam, looks like the counter's tied up right now — but I'm still here! What can I help you with?");
      const bounceCallback = new URL(`https://base44.app/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/twilioVoiceWebhook`);
      bounceCallback.searchParams.set('callback', '1');
      bounceCallback.searchParams.set('from', transferFrom);
      bounceCallback.searchParams.set('convId', transferConvId);
      bounceCallback.searchParams.set('turn', '1');
      bounceTwiml.gather({
        input: 'speech',
        action: bounceCallback.toString(),
        speechTimeout: '1',
        language: 'en-US',
        timeout: 8,
      });
      await speak(bounceTwiml, "No worries fam — hit us back when you're ready. Bet!");
      bounceTwiml.hangup();
      return new Response(bounceTwiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

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
      const [storeStatus, busynessLevel, convo] = await Promise.all([
        getPhysicalStoreStatus(base44),
        getBusynessLevel(base44),
        base44.asServiceRole.agents.createConversation({
          agent_name: 'smashie',
          metadata: {
            name: `Voice Call - ${from}`,
            description: `Voice call from ${from}`,
            channel: 'voice',
            phone: from,
            call_sid: callSid,
          },
        }),
      ]);
      const closedToday = !storeStatus.open;
      const busynessLine = busynessLevel === 'Slammed — Expect a Wait'
        ? "Heads up fam, we're slammed right now — expect up to an hour wait!"
        : busynessLevel === 'Busy'
          ? "We're busy right now — expect about a 35 to 40 minute wait!"
          : busynessLevel === 'A Little Busy'
            ? "We're a little busy right now but we got you — about a 30 minute wait!"
            : "We're running smooth right now, no wait at all!";
      const headsUp = storeStatus.message.startsWith('we open at')
        ? `Just a heads up — ${storeStatus.message}.`
        : `Just a heads up — we're ${storeStatus.message}.`;
      const voiceGreeting = closedToday
        ? `Hey fam, Smashie here at Flavor Isle! ${headsUp} ${abilityEnabled(settings, 'hours') ? 'I can tell you when we open next. ' : ''}${abilityEnabled(settings, 'messages') ? 'I can take a message for the crew. ' : ''}What do you need today?`
        : `Hey fam, Smashie here at Flavor Isle! ${abilityEnabled(settings, 'wait') ? `${busynessLine} ` : ''}${phoneIntro(settings)}`;
      const conversationId = convo.id;
      const callRecordPromise = base44.asServiceRole.entities.SmsConversation.create({
        phone_number: from,
        conversation_id: conversationId,
        call_sid: callSid,
        channel: 'voice',
        last_message_at: startedAt,
        message_count: 0,
        status: 'active',
        transcript: [{ role: 'assistant', content: voiceGreeting, timestamp: startedAt }],
      });

      // Caller lookup is useful for later turns, but must never hold up the greeting.
      waitUntil((async () => {
        try {
          const callRecord = await callRecordPromise;
          const squareCust = await lookupCustomerByPhone(base44, from);
          if (squareCust) {
            await base44.asServiceRole.entities.SmsConversation.update(callRecord.id, {
              customer_name: squareCust.name,
              square_customer_id: squareCust.id,
              customer_email: squareCust.email,
            });
          }
        } catch (e) {
          console.error('Caller Square lookup failed:', e.message);
        }
      })());

      const twiml = new VoiceResponse();
      const greetingGather = twiml.gather({
        input: 'speech',
        action: buildCallbackUrl(from, conversationId, 1),
        speechTimeout: '1',
        language: 'en-US',
        timeout: 8,
      });
      // The fixed hello has already played while this request prepared the call.
      // Keep the full greeting in the transcript, without saying his name twice.
      const remainingGreeting = greetingStarted && voiceGreeting.startsWith(SMASHIE_HELLO)
        ? voiceGreeting.slice(SMASHIE_HELLO.length).trim()
        : voiceGreeting;
      // Keep live wait information, but play each fixed greeting segment directly.
      // Changing the admin intro or ability switches still uses its exact live text.
      if (greetingStarted && !closedToday) {
        if (abilityEnabled(settings, 'wait')) await speak(greetingGather, busynessLine);
        await speak(greetingGather, phoneIntro(settings));
      } else {
        await speak(greetingGather, remainingGreeting);
      }
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
        const retryGather = twiml.gather({
          input: 'speech',
          action: callbackUrl(turn + 1),
          speechTimeout: '1',
          language: 'en-US',
          timeout: 8,
        });
        await speak(retryGather, "Yo, I didn't catch that — run that back for me?");
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

    const [callRecords, liveBusyness, storeStatus, settings] = await Promise.all([
      base44.asServiceRole.entities.SmsConversation.filter({ conversation_id: conversationId }),
      getBusynessLevel(base44),
      getPhysicalStoreStatus(base44),
      getSmashieSettings(base44),
    ]);

    // Inject the caller's phone (and their resolved Square name/email) so
    // Smashie can take an order and text the payment link without asking.
    const callerRecord = callRecords[0] || {};
    const callerInfo = `[CALLER INFO: Caller phone number: ${callerFrom}. Pass this exact number to logPhoneOrder as customer_phone — the payment link is texted there. ${callerRecord.customer_email
      ? `Name: ${callerRecord.customer_name || 'Unknown'}, Email: ${callerRecord.customer_email} (resolved automatically from the caller's phone via Square). Pass the email to logPhoneOrder as customer_email too — do NOT ask the caller for it.`
      : callerRecord.customer_name
        ? `Name: ${callerRecord.customer_name}. No email on file in Square. The link is texted to the number above, so the email is optional — ask for one only if the caller wants it emailed as well.`
        : `Caller not found in Square. Ask for the caller's name. The link is texted to the number above, so an email is optional.`}]`;
    const closedToday = !storeStatus.open;
    const statusContext = closedToday
      ? `[STORE STATUS: CLOSED. Flavor Isle is completely closed right now (${storeStatus.message}). The caller already heard Smashie's introduction. Do not introduce yourself again. When CLOSED: only share history if enabled, opening information if enabled, or save a message if enabled. Never discuss the menu, recommend food, take or build an order, give directions, offer a counter transfer, or quote busyness or wait times. Never say we are open.]\n${callerInfo}`
      : `[STORE STATUS: OPEN. Follow the admin ability switches. The caller already heard Smashie's introduction. Respond directly without repeating it.]\n[BUSYNESS: ${abilityEnabled(settings, 'wait') ? `${liveBusyness}. If the caller asks how busy you are, tell them this.` : 'Do not quote busyness or wait times.'}]\n${callerInfo}`;

    const messageTurn = abilityEnabled(settings, 'messages') ? await processPhoneMessageTurn(
      base44,
      callRecords[0],
      speechResult,
      callerFrom,
      callSid,
      conversationId,
    ) : null;

    let replyText;
    if (messageTurn) {
      replyText = messageTurn.reply;
    } else {
      const conversation = await base44.asServiceRole.agents.getConversation(conversationId);
      const priorAssistantCount = (conversation.messages || []).filter(m => m.role === 'assistant').length;
      await base44.asServiceRole.agents.addMessage(conversation, {
        role: 'user',
        content: `${statusContext}\n${smashieAdminContext(settings)}\nCaller said: ${speechResult}`,
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
    if (messageMatch && abilityEnabled(settings, 'messages')) {
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

    // Never read a disabled message action token aloud or show it in the transcript.
    spokenReply = spokenReply.replace(/\[\[PHONE_MESSAGE:\{[\s\S]*?\}\]\]/gi, '').trim() || (abilityEnabled(settings, 'messages') ? "I couldn't save that message. Please try again." : "I can't take a message right now.");

    // Persist a clean, admin-readable transcript independent of agent ownership.
    if (callRecords[0]) {
      const timestamp = new Date().toISOString();
      const transcript = [
        ...(callRecords[0].transcript || []),
        { role: 'user', content: speechResult, timestamp },
        { role: 'assistant', content: spokenReply.replace(/\[\[TRANSFER\]\]/gi, '').trim(), timestamp },
      ];
      waitUntil(base44.asServiceRole.entities.SmsConversation.update(callRecords[0].id, {
        last_message_at: timestamp,
        message_count: (callRecords[0].message_count || 0) + 2,
        transcript,
      }).catch(e => console.error('Voice transcript update failed:', e.message)));
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
    if (wantsTransfer && counterNumber && abilityEnabled(settings, 'transfer') && !closedToday) {
      const cleanReply = spokenReply.replace(/\[\[TRANSFER\]\]/gi, '').trim();
      const transferTwiml = new VoiceResponse();
      // A failed audio download aborts Twilio's entire response before <Dial>.
      // Use Twilio's built-in voice for this announcement so transfers do not
      // depend on the separate TTS endpoint being available.
      transferTwiml.say({ voice: 'Polly.Matthew', language: 'en-US' }, cleanReply || "Bet — let me get you over to the counter, hold tight fam!");
      const transferCallback = new URL(`https://base44.app/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/twilioVoiceWebhook`);
      transferCallback.searchParams.set('transfer', '1');
      transferCallback.searchParams.set('from', callerFrom);
      transferCallback.searchParams.set('convId', conversationId);
      const dial = transferTwiml.dial({ timeout: 20, action: transferCallback.toString(), method: 'POST' });
      dial.number(counterNumber);
      return new Response(transferTwiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

    const twiml = new VoiceResponse();
    if (isOrderComplete || atTurnCap) {
      await speak(twiml, spokenReply.replace(/\[\[TRANSFER\]\]/gi, '').trim());
      if (atTurnCap && !isOrderComplete) {
        await speak(twiml, "Aight fam, let's wrap this up — hit us back if you need anything else. We got you!");
      }
      twiml.hangup();
    } else {
      // Keep listening while speaking, so callers can cut in mid-sentence.
      const replyGather = twiml.gather({
        input: 'speech',
        action: callbackUrl(turn + 1),
        speechTimeout: '1',
        language: 'en-US',
        timeout: 8,
      });
      await speak(replyGather, spokenReply.replace(/\[\[TRANSFER\]\]/gi, '').trim());
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