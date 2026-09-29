// TwiML for the counter-transfer path of the Live (SIP) phone pipeline.
//
// When Smashie hands a caller to the counter, OpenAI sends a SIP REFER to our
// Twilio SIP domain and Twilio fetches this TwiML to place the call. The domain
// URI is what SIP_TRANSFER_TARGET points at; this endpoint is the piece that
// actually dials the counter phone.
//
// Twilio also POSTs back to this same URL with DialCallStatus once the dial
// finishes, so a counter that nobody picks up gets a spoken fallback instead of
// dead air.
const COUNTER_FALLBACK =
  'Nobody could pick up at the counter right now. Please call us back at (270) 563-4618, or text us and we will help you out.';

function twiml(xml: string) {
  return new Response(xml, { headers: { 'Content-Type': 'text/xml' } });
}

function escapeXml(value: string) {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function say(message: string) {
  return twiml(
    `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Matthew">${escapeXml(message)}</Say></Response>`
  );
}

export default async function (req: Request) {
  try {
    const rawCounterPhone = Deno.env.get('COUNTER_PHONE_NUMBER');
    const params = new URLSearchParams(await req.text());

    if (!rawCounterPhone) {
      console.error('Counter transfer unavailable: COUNTER_PHONE_NUMBER is not set.');
      return say(COUNTER_FALLBACK);
    }

    // Coming back from the dial — if the counter didn't answer, say something
    // useful before the call ends.
    const dialStatus = params.get('DialCallStatus');
    if (dialStatus && dialStatus !== 'completed') {
      console.log(`Counter transfer dial finished with status ${dialStatus}`);
      return say(COUNTER_FALLBACK);
    }

    const digits = String(rawCounterPhone).replace(/\D/g, '');
    const counter = digits.length === 10 ? `+1${digits}` : `+${digits}`;

    // The action URL must be absolute and public, so Twilio can report the dial
    // result back here.
    const selfUrl = 'https://flavor-isle.com/functions/counterTransferTwiml';

    return twiml(
      `<?xml version="1.0" encoding="UTF-8"?><Response><Dial timeout="20" answerOnBridge="true" action="${selfUrl}"><Number>${escapeXml(counter)}</Number></Dial></Response>`
    );
  } catch (error) {
    console.error('counterTransferTwiml error:', error.message);
    return say(COUNTER_FALLBACK);
  }
}