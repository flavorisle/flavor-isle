import { secrets } from "base44:runtime";
import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

// Public TTS endpoint for Smashie's voice calls. Twilio <Play> GETs this with
// ?text=... and we return natural OpenAI TTS audio (young male "ash" voice) so
// Smashie never sounds robotic. Falls back to the platform's natural TTS if
// OpenAI is unavailable so the call never goes silent.
export default async function (req: Request): Promise<Response> {
  const url = new URL(req.url);
  const text = url.searchParams.get("text") || "";
  if (!text) return new Response("text required", { status: 400 });

  try {
    const res = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secrets.get("OPENAI_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "ash",
        input: text,
        response_format: "mp3",
      }),
    });
    if (!res.ok) throw new Error(`OpenAI TTS ${res.status}: ${await res.text()}`);
    const bytes = await res.arrayBuffer();
    return new Response(bytes, {
      headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("smashieTts OpenAI error:", e.message);
    try {
      const base44 = createClientFromRequest(req);
      const gs = await base44.asServiceRole.integrations.Core.GenerateSpeech({
        text,
        voice: "spark",
        language_code: "en",
      });
      if (gs?.url) return Response.redirect(gs.url, 302);
    } catch (e2) {
      console.error("smashieTts fallback error:", e2.message);
    }
    return new Response("TTS unavailable", { status: 503 });
  }
}