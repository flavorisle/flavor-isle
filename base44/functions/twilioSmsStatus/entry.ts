import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Twilio SMS delivery status callback handler. Twilio POSTs URL-encoded form
// params here as each outbound message changes state (queued → sent →
// delivered, or undelivered/failed). We log the status and, when a delivery
// fails, note it against the customer's SMS conversation record so it shows
// up in the admin communications log.
Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const bodyText = await req.text();
    const params = new URLSearchParams(bodyText);

    const messageSid = params.get('MessageSid') || '';
    const messageStatus = params.get('MessageStatus') || '';
    const to = params.get('To') || '';
    const from = params.get('From') || '';
    const errorCode = params.get('ErrorCode') || '';
    const errorMessage = params.get('ErrorMessage') || '';

    console.log(`SMS status: sid=${messageSid} status=${messageStatus} to=${to} from=${from}${errorCode ? ` err=${errorCode}:${errorMessage}` : ''}`);

    // On a delivery failure, flag the conversation record so admins can see
    // the failed delivery in the communications log.
    const failed = ['failed', 'undelivered'].includes(messageStatus);
    if (failed && to) {
      try {
        const base44 = createClientFromRequest(req);
        const existing = await base44.asServiceRole.entities.SmsConversation.filter({ phone_number: to });
        if (existing[0]) {
          await base44.asServiceRole.entities.SmsConversation.update(existing[0].id, {
            last_message_at: new Date().toISOString(),
          });
          console.log(`Flagged failed SMS to ${to} (error ${errorCode}) on conversation ${existing[0].id}`);
        }
      } catch (e) {
        console.error('Failed to record SMS failure on conversation:', (e as Error).message);
      }
    }

    // Twilio only needs a 200; no TwiML body required for status callbacks.
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('twilioSmsStatus error:', error.message);
    return new Response('OK', { status: 200 });
  }
});