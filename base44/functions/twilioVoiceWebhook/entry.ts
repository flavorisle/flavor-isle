import twilio from 'npm:twilio@5.3.3';

Deno.serve(async (req) => {
  try {
    const VoiceResponse = twilio.twiml.VoiceResponse;
    const twiml = new VoiceResponse();
    twiml.say(
      { voice: 'Polly.Joanna', language: 'en-US' },
      "Hey, thanks for calling Flavor Isle! We don't take orders over the phone right now. Please visit our website at flavor isle dot com, or text us to place your order. Talk to you soon!"
    );
    twiml.hangup();
    return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
  } catch (error) {
    console.error('twilioVoiceWebhook error:', error.message);
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('Sorry, we are currently unavailable. Please try again later.');
    twiml.hangup();
    return new Response(twiml.toString(), { headers: { 'Content-Type': 'text/xml' } });
  }
});