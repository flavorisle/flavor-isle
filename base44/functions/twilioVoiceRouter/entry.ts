import { secrets } from 'base44:runtime';
import { fastGreetingResponse } from '../../shared/smashieFastGreeting.ts';

export default async function(req) {
  try {
    const incomingUrl = new URL(req.url);
    const appId = secrets.get('BASE44_APP_ID');
    const upstreamUrl = new URL(`https://base44.app/api/apps/${appId}/functions/twilioVoiceWebhook`);
    incomingUrl.searchParams.forEach((value, key) => upstreamUrl.searchParams.set(key, value));

    const body = await req.text();
    const params = req.headers.get('content-type')?.includes('application/json')
      ? new URLSearchParams(JSON.parse(body || '{}'))
      : new URLSearchParams(body);
    const greeting = fastGreetingResponse(incomingUrl, params);
    if (greeting) return greeting;
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });

    const twiml = await upstream.text();
    const internalCallback = `https://base44-dispatcher-production.base44.workers.dev/api/apps/${appId}/functions/twilioVoiceWebhook`;
    const publicCallback = 'https://flavor-isle.com/functions/twilioVoiceRouter';
    const routedTwiml = twiml.replaceAll(internalCallback, publicCallback);

    return new Response(routedTwiml, {
      status: upstream.status,
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    });
  } catch (error) {
    console.error('twilioVoiceRouter error:', error.message);
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say>We are having trouble connecting your call. Please try again shortly.</Say><Hangup/></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml; charset=utf-8' },
    });
  }
}