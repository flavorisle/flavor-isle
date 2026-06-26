import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import twilio from 'npm:twilio@5.3.3';

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

    console.log(`Voice call ${callSid} from ${from}, speech: "${speechResult}"`);

    const base44 = createClientFromRequest(req);
    const VoiceResponse = twilio.twiml.VoiceResponse;

    // --- Initial greeting (no speech yet) ---
    if (!isCallback && !speechResult) {
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
          last_message_at: new Date().toISOString(),
          message_count: 0,
          status: 'active',
        });
        conversationId = convo.id;
      }

      const twiml = new VoiceResponse();
      twiml.say(
        { voice: 'Polly.Joanna', language: 'en-US' },
        "Hey there, welcome to Flavor Isle! This is Smashie. What can I get started for you today?"
      );
      twiml.gather({
        input: 'speech',
        action: `${url.origin}/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/twilioVoiceWebhook?callback=1&from=${encodeURIComponent(from)}&convId=${conversationId}`,
        speechTimeout: 'auto',
        language: 'en-US',
        timeout: 8,
      });
      twiml.say({ voice: 'Polly.Joanna' }, "Sorry, I didn't catch that. Give us a call back and we'll get your order sorted!");
      twiml.hangup();

      return new Response(twiml.toString(), {
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    // --- Handle speech callback ---
    const conversationId = url.searchParams.get('convId') || '';
    const callerFrom = url.searchParams.get('from') || from;

    if (!speechResult || !conversationId) {
      const twiml = new VoiceResponse();
      twiml.say({ voice: 'Polly.Joanna' }, "I didn't catch that. Please call back and try again!");
      twiml.hangup();
      return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
    }

    // Get conversation and send message to Smashie
    const conversation = await base44.asServiceRole.agents.getConversation(conversationId);
    const updatedConversation = await base44.asServiceRole.agents.addMessage(conversation, {
      role: 'user',
      content: speechResult,
    });

    // Get Smashie's reply
    const messages = updatedConversation.messages || [];
    const assistantMessages = messages.filter(m => m.role === 'assistant');
    const lastReply = assistantMessages[assistantMessages.length - 1];
    const replyText = lastReply?.content || "Let me check on that for you!";

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
    const isOrderComplete = /thank you|enjoy your meal|order.*confirmed|that's everything|goodbye|have a great/i.test(replyText);

    const twiml = new VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna', language: 'en-US' }, forTTS(replyText));

    if (isOrderComplete) {
      twiml.hangup();
    } else {
      // Keep listening
      twiml.gather({
        input: 'speech',
        action: `${url.origin}/api/apps/${Deno.env.get('BASE44_APP_ID')}/functions/twilioVoiceWebhook?callback=1&from=${encodeURIComponent(callerFrom)}&convId=${conversationId}`,
        speechTimeout: 'auto',
        language: 'en-US',
        timeout: 8,
      });
      twiml.say({ voice: 'Polly.Joanna' }, "Are you still there? Give us a call back if you get disconnected!");
      twiml.hangup();
    }

    console.log(`Smashie replied to ${callerFrom}: ${replyText.substring(0, 100)}`);

    return new Response(twiml.toString(), {
      headers: { 'Content-Type': 'text/xml' },
    });
  } catch (error) {
    console.error('twilioVoiceWebhook error:', error.message);
    const twilio_twiml = twilio.twiml;
    const twiml = new twilio_twiml.VoiceResponse();
    twiml.say({ voice: 'Polly.Joanna' }, "Sorry, we're having a technical issue. Please call back in a moment!");
    twiml.hangup();
    return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
  }
});