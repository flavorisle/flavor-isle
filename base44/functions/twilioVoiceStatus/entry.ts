import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Twilio voice call status callback handler. Twilio POSTs URL-encoded form
// params here as a call moves through its lifecycle (ringing → in-progress →
// completed, or failed/busy/no-answer/canceled). We log the outcome and, when
// a call ends, mark the caller's active voice conversation as completed so the
// admin Phone Log reflects finished calls instead of leaving them open.
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const callSid = params.get('CallSid') || '';
    const callStatus = params.get('CallStatus') || '';
    const callDuration = params.get('CallDuration') || '';
    const from = params.get('From') || '';
    const to = params.get('To') || '';
    const direction = params.get('Direction') || '';

    console.log(`Voice status: sid=${callSid} status=${callStatus} from=${from} to=${to} dir=${direction} dur=${callDuration}s`);

    // When a call reaches a terminal state, close out the active voice
    // conversation for this caller so it shows as completed in the admin log.
    const terminal = ['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(callStatus);
    if (terminal && from) {
      try {
        const base44 = createClientFromRequest(req);
        const existing = await base44.asServiceRole.entities.SmsConversation.filter({
          phone_number: from,
          status: 'active',
          channel: 'voice',
        });
        if (existing[0]) {
          await base44.asServiceRole.entities.SmsConversation.update(existing[0].id, {
            status: 'completed',
            last_message_at: new Date().toISOString(),
          });
          console.log(`Closed voice conversation ${existing[0].id} for ${from} (${callStatus})`);
        }
      } catch (e) {
        console.error('Failed to close voice conversation on call end:', (e as Error).message);
      }
    }

    // Twilio only needs a 200; no TwiML body required for status callbacks.
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('twilioVoiceStatus error:', error.message);
    return new Response('OK', { status: 200 });
  }
});