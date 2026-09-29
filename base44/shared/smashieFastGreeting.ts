// Play the fixed introduction before any database reads or live audio generation.
// The follow-up request keeps the existing hours, abilities and ordering checks.
export const SMASHIE_HELLO = 'Hey fam, Smashie here at Flavor Isle!';
const HELLO_AUDIO = 'https://base44.app/api/apps/6a3d84f2fe4ae4efe7f629bf/files/mp/public/6a3d84f2fe4ae4efe7f629bf/bad9582b0_smashie-phone-hello.mp3';

export function fastGreetingResponse(url, params) {
  const flag = key => url.searchParams.get(key) || params.get(key);
  if (flag('callback') === '1' || flag('transfer') === '1' || flag('greetingStarted') === '1' || params.get('SpeechResult')) return null;
  const next = 'https://taste-isle-express.base44.app/functions/twilioVoiceWebhook?greetingStarted=1';
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response><Play>${HELLO_AUDIO}</Play><Redirect method="POST">${next}</Redirect></Response>`, {
    headers: { 'Content-Type': 'text/xml; charset=utf-8' },
  });
}