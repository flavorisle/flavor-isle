import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { SMASHIE_VOICE, SMASHIE_VOICE_STYLE } from '../../shared/smashieVoiceConfig.ts';

// Public TTS endpoint for Smashie's voice calls. Twilio <Play> GETs this with
// ?text=... and we return natural OpenAI TTS audio (young male "verse" voice) so
// Smashie never sounds robotic. Falls back to the platform's natural TTS if
// OpenAI is unavailable, always returning audio bytes (never a redirect) so
// Twilio <Play> reliably gets something to play.
export default async function (req: Request): Promise<Response> {
  const url = new URL(req.url);
  let text = url.searchParams.get('text') || '';
  // Also accept JSON { text } so the endpoint is testable via the function tester.
  if (!text) {
    try {
      const j = await req.clone().json();
      text = j.text || '';
    } catch {}
  }
  if (!text) return new Response('text required', { status: 400 });

  // OpenAI TTS — natural young male "verse" voice.
  try {
    const res = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini-tts',
        voice: SMASHIE_VOICE,
        input: text,
        instructions: SMASHIE_VOICE_STYLE,
        response_format: 'mp3',
        speed: 1.02,
      }),
    });
    if (res.ok) {
      // Forward the stream immediately instead of buffering the entire speech.
      return new Response(res.body, {
        headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
      });
    }
    console.error('smashieTts OpenAI status:', res.status, await res.text());
  } catch (e) {
    console.error('smashieTts OpenAI error:', e.message);
  }

  // Fallback: platform natural TTS — fetch its hosted URL and stream the bytes
  // back so Twilio <Play> always receives audio (no redirect).
  try {
    const base44 = createClientFromRequest(req);
    const gs = await base44.asServiceRole.integrations.Core.GenerateSpeech({
      text,
      voice: 'spark',
      language_code: 'en',
    });
    if (gs?.url) {
      const audioRes = await fetch(gs.url);
      if (audioRes.ok) {
        return new Response(audioRes.body, {
          headers: { 'Content-Type': 'audio/mpeg', 'Cache-Control': 'no-store' },
        });
      }
    }
  } catch (e) {
    console.error('smashieTts fallback error:', e.message);
  }

  return new Response('TTS unavailable', { status: 503 });
}