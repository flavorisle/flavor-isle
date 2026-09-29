import { secrets } from 'base44:runtime';
import { SMASHIE_VOICE, SMASHIE_VOICE_STYLE } from './smashieVoiceConfig.ts';

export async function generateSmashieVoice(base44, text) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secrets.get('OPENAI_API_KEY')}`,
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

  if (!response.ok) {
    throw new Error(`OpenAI speech failed with status ${response.status}`);
  }

  const audio = await response.arrayBuffer();
  const blob = new Blob([audio], { type: 'audio/mpeg' });
  const file = new File([blob], `smashie-${crypto.randomUUID()}.mp3`, { type: 'audio/mpeg' });
  const uploaded = await base44.asServiceRole.integrations.Core.UploadFile({ file });

  if (!uploaded?.file_url) {
    throw new Error('OpenAI speech upload did not return a public URL');
  }

  return uploaded.file_url;
}