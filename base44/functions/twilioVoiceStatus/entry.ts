import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { lookupCustomerByPhone } from '../../shared/squareCustomer.ts';

// Twilio voice call status callback handler. Twilio POSTs URL-encoded form
// params here as a call moves through its lifecycle (ringing → in-progress →
// completed, or failed/busy/no-answer/canceled). We persist the full call
// details (status, direction, duration, start time) on the caller's voice
// conversation, resolve the Square customer name from the caller's phone, and
// mark the conversation completed when the call ends.
export default async function(req) {
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
    const direction = params.get('Direction') || '';
    const startTime = params.get('StartTime') || '';

    console.log(`Voice status: from=${from} status=${callStatus} dir=${direction} dur=${callDuration}s`);

    const base44 = createClientFromRequest(req);
    const existing = await base44.asServiceRole.entities.SmsConversation.filter(callSid
      ? { call_sid: callSid, channel: 'voice' }
      : { phone_number: from, status: 'active', channel: 'voice' });

    if (existing[0]) {
      const update = {
        call_status: callStatus,
        call_direction: direction.includes('inbound') ? 'inbound' : 'outbound',
      };
      if (callDuration) update.call_duration = parseInt(callDuration, 10) || 0;
      if (startTime) update.call_started_at = new Date(startTime).toISOString();

      const terminal = ['completed', 'failed', 'busy', 'no-answer', 'canceled'].includes(callStatus);
      if (terminal) {
        update.status = 'completed';
        update.last_message_at = new Date().toISOString();

        // Resolve the caller's Square customer name once, if not already known.
        if (!existing[0].customer_name) {
          try {
            const cust = await lookupCustomerByPhone(base44, from);
            if (cust) {
              update.customer_name = cust.name;
              update.square_customer_id = cust.id;
            }
          } catch (e) {
            console.error('Caller lookup failed:', (e as Error).message);
          }
        }
      }

      await base44.asServiceRole.entities.SmsConversation.update(existing[0].id, update);
      console.log(`Updated voice conversation ${existing[0].id} (${callStatus})`);
    }

    // Twilio only needs a 200; no TwiML body required for status callbacks.
    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('twilioVoiceStatus error:', error.message);
    return new Response('OK', { status: 200 });
  }
}