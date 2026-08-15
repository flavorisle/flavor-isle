import { secrets } from 'base44:runtime';

export async function generateSmashieVoice(base44, text) {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secrets.get('OPENAI_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      voice: 'ash',
      input: text,
      instructions: 'Sound like a friendly, energetic young adult American man. Speak naturally and conversationally with warmth, confidence, varied pacing, and subtle enthusiasm. Never sound like an announcer, automated phone tree, or robot.',
      response_format: 'mp3',
      speed: 1.04,
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