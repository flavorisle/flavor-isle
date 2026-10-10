// Issue #93 (D1) — the counter hand-off, rebuilt as ONE endpoint with modes.
//
// Every counter hand-off lands here: Smashie's transfer_to_counter SIP REFER
// (the URI in SmashieSettings / SIP_TRANSFER_TARGET points at this function) and
// the pass-through route from the Twilio webhook both use the entry mode below.
// Twilio fetches the same URL again, with query params, for each leg.
//
//   entry         Dial the counter for up to HOLD_WINDOW_SECONDS, with hold
//                 music for the caller and a press-1 screen on the counter leg.
//   ?mode=hold    the wait music (Twilio loops it, so the caller never gets
//                 dead air while the counter rings).
//   ?mode=screen  what the counter phone hears: a person must press 1. A
//                 voicemail machine or an answering bot cannot, so the caller
//                 only ever bridges to a human. Callers never hear this.
//   ?mode=screenResult  digit 1 bridges; anything else / timeout hangs up that
//                 leg, so the dial fails and the caller lands in the fallback.
//   ?action=done  DialCallStatus back from the dial: completed ends the call,
//                 anything else offers the voicemail below.
//   ?mode=leaveMessage  after the fallback prompt: record up to 120 seconds.
//   ?mode=messageSaved  save the recording as a PhoneMessage so it lands in the
//                 same Message Log the crew already reads.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const HOLD_WINDOW_SECONDS = 180;
const HOLD_MUSIC_URL = 'https://flavor-isle.com/hold-music.mp3';
const CALLBACK_NUMBER = '(270) 563-4618';
const SELF_URL = 'https://flavor-isle.com/functions/counterTransferTwiml';

function twiml(xml: string) {
  return new Response(xml, { headers: { 'Content-Type': 'text/xml' } });
}

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function say(message: string) {
  return `<Say voice="Polly.Matthew">${escapeXml(message)}</Say>`;
}

function response(body: string) {
  return twiml(`<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`);
}

function emptyResponse() {
  return twiml('<?xml version="1.0" encoding="UTF-8"?><Response/>');
}

// Nobody picked up at the counter: offer a recorded message instead of dead air.
function voicemailOffer() {
  return response(
    `<Gather numDigits="1" action="${SELF_URL}?mode=leaveMessage" actionOnEmptyResult="true">${say(`Nobody could pick up at the counter right now. Press 1 to leave a message for the crew, or hang up and call us back at ${CALLBACK_NUMBER}.`)}</Gather><Hangup/>`
  );
}

function readParam(url: URL, params: URLSearchParams, key: string) {
  return url.searchParams.get(key) || params.get(key) || '';
}

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);

    const params = new URLSearchParams(await req.text());
    const url = new URL(req.url);
    const mode = readParam(url, params, 'mode');
    const action = readParam(url, params, 'action');

    // ── Hold music while the counter rings ──
    if (mode === 'hold') {
      return response(`<Play>${HOLD_MUSIC_URL}</Play>`);
    }

    // ── Screening on the counter leg: a person has to press 1 ──
    if (mode === 'screen') {
      return response(`<Gather numDigits="1" action="${SELF_URL}?mode=screenResult">${say('Flavor Isle counter — press 1 to take the call.')}</Gather><Hangup/>`);
    }

    if (mode === 'screenResult') {
      // Digit 1 bridges the caller. Anything else (or no input) hangs up the
      // counter leg, which fails the dial and sends the caller to the offer below.
      return (params.get('Digits') || '') === '1' ? emptyResponse() : response('<Hangup/>');
    }

    // ── After the voicemail prompt ──
    if (mode === 'leaveMessage') {
      // Only a pressed 1 starts a recording; an empty result means the caller
      // never chose to leave a message, so the call ends.
      if ((params.get('Digits') || '') !== '1') return response('<Hangup/>');
      return response(
        `${say("Record your message after the tone — press any key when you're done.")}<Record maxLength="120" finishOnKey="any" action="${SELF_URL}?mode=messageSaved" />`
      );
    }

    if (mode === 'messageSaved') {
      const recordingUrl = params.get('RecordingUrl') || '';
      if (recordingUrl) {
        try {
          await base44.asServiceRole.entities.PhoneMessage.create({
            caller_name: 'Counter voicemail',
            caller_phone: params.get('From') || '',
            recipient: 'management',
            message: recordingUrl,
            call_sid: params.get('CallSid') || '',
            channel: 'voicemail',
            status: 'new',
          });
        } catch (error) {
          console.error('Counter voicemail save failed:', error.message);
        }
      } else {
        console.warn('Counter voicemail finished with no recording to save.');
      }
      return response(`${say('Got it — the crew will get your message. Thanks for calling Flavor Isle!')}<Hangup/>`);
    }

    // ── Back from the dial ──
    if (action === 'done') {
      const dialStatus = params.get('DialCallStatus') || '';
      if (dialStatus === 'completed') {
        // The counter picked up and the call ran its course.
        return emptyResponse();
      }
      console.log(`Counter transfer dial finished with status ${dialStatus || 'unknown'}`);
      return voicemailOffer();
    }

    // ── Entry: dial the counter, hold music while it rings, screen the leg ──
    const rawCounterPhone = Deno.env.get('COUNTER_PHONE_NUMBER');
    if (!rawCounterPhone) {
      console.error('Counter transfer unavailable: COUNTER_PHONE_NUMBER is not set.');
      return voicemailOffer();
    }

    const digits = String(rawCounterPhone).replace(/\D/g, '');
    const counter = digits.length === 10 ? `+1${digits}` : `+${digits}`;

    return response(
      `<Dial timeout="${HOLD_WINDOW_SECONDS}" answerOnBridge="true" action="${SELF_URL}?action=done" waitUrl="${SELF_URL}?mode=hold"><Number url="${SELF_URL}?mode=screen">${escapeXml(counter)}</Number></Dial>`
    );
  } catch (error) {
    console.error('counterTransferTwiml error:', error.message);
    return response(
      `${say(`Nobody could pick up at the counter right now. Please call us back at ${CALLBACK_NUMBER}, or text us and we will help you out.`)}<Hangup/>`
    );
  }
}