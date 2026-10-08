// Inbound SIP calls for the OpenAI-hosted (GPT-Live) phone pipeline.
//
// OpenAI POSTs each incoming call here; we accept it with Smashie's session
// config, then hand the call to the sideband driver that runs his tools and
// captures the transcript. Until OpenAI SIP is enabled for the project, a
// Twilio trunk is pointed at it, and "Live Phone Pipeline" is switched on in
// Admin → Communications, this endpoint rejects every call and the Twilio line
// keeps working exactly as it does today.
//
// 2026-10-01: the session driver moved to shared/smashieLiveSession.ts. Calls
// were answering and playing the introduction but never running a single
// action — no menu lookup, no order, no message, no transfer — because the
// driver only recognised one of the two shapes a finished function call arrives
// in, and a missed call is never answered, so the caller heard silence. The
// driver now accepts both shapes, always asks for the next turn after a tool
// result, speaks a fallback instead of going quiet, and records every action on
// the call record.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { getSmashieSettings } from '../../shared/smashieSettings.ts';
import { getPhysicalStoreStatus } from '../../shared/storeClosure.ts';
import { getLiveBusyness } from '../../shared/liveBusyness.ts';
import { lookupCustomerByPhone } from '../../shared/squareCustomer.ts';
import { verifyOpenAIWebhookSignature } from '../../shared/openaiWebhookSignature.ts';
import { acceptLiveSession, rejectLiveSession } from '../../shared/openaiLiveApi.ts';
import { closeAbandonedVoiceCalls } from '../../shared/smashieLiveSession.ts';
import {
  VOICE_INSTRUCTIONS,
  BACKEND_INSTRUCTIONS,
  SMASHIE_LIVE_TOOLS,
  buildCallContext,
} from '../../shared/smashieLivePrompt.ts';
import { phoneIntro, smashieAdminContext, abilityEnabled } from '../../shared/smashieAdminContext.ts';
import { findBlock } from '../../shared/blockedContacts.ts';

const LIVE_MODEL = 'gpt-live-1';
const BACKEND_MODEL = 'gpt-6-luna';
const VOICE = 'verse';
const HANDLED_EVENTS = ['live.transport.incoming', 'live.call.incoming'];

// Which admin ability switch guards each tool.
const TOOL_ABILITIES = {
  place_order: 'orders',
  lookup_menu: 'menu',
  burger_toppings: 'menu',
  shake_menu: 'menu',
  take_message: 'messages',
  transfer_to_counter: 'transfer',
};

// The caller's number arrives as untrusted SIP metadata — good enough to
// resolve who is calling and where to text the payment link, never to authorize
// anything.
function extractCallerPhone(sipHeaders) {
  if (!sipHeaders || typeof sipHeaders !== 'object') return '';
  // OpenAI sends sip_headers as [{ name, value }] pairs; a plain object map is
  // tolerated too. Caller-ID headers are ranked first (From is the caller),
  // then every other header value, so the number is read deliberately rather
  // than from whatever digits happen to appear first.
  const headers = Array.isArray(sipHeaders)
    ? sipHeaders.map((h) => ({ name: String(h?.name || '').toLowerCase(), value: String(h?.value || '') }))
    : Object.entries(sipHeaders).map(([name, value]) => ({ name: name.toLowerCase(), value: String(value || '') }));

  const callerHeaders = ['from', 'p-asserted-identity', 'contact'];
  const candidates = [
    ...callerHeaders.map((name) => headers.find((h) => h.name === name)?.value || ''),
    ...headers.map((h) => h.value),
    JSON.stringify(sipHeaders),
  ].filter(Boolean);

  for (const raw of candidates) {
    const digits = (raw.match(/\d[\d\s().-]{8,}\d/) || [''])[0].replace(/\D/g, '');
    if (digits.length >= 10) return `+1${digits.slice(-10)}`;
  }
  return '';
}

export default async function (req) {
  try {
    const apiKey = Deno.env.get('OPENAI_API_KEY');
    const webhookSecret = Deno.env.get('OPENAI_WEBHOOK_SECRET');
    const rawBody = await req.text();

    if (!apiKey || !webhookSecret) {
      console.error('Live SIP pipeline is not configured: OPENAI_API_KEY and OPENAI_WEBHOOK_SECRET are both required.');
      return Response.json({ error: 'Live phone pipeline is not configured' }, { status: 503 });
    }

    if (!(await verifyOpenAIWebhookSignature(req, rawBody, webhookSecret))) {
      console.error('Rejected a Live webhook with a missing or invalid signature.');
      return Response.json({ error: 'Invalid signature' }, { status: 400 });
    }

    const event = JSON.parse(rawBody || '{}');
    const type = event?.type || '';
    const data = event.data || {};
    // Log every arrival: without this line, "OpenAI never dispatched a webhook"
    // and "the app received one it does not handle" look identical in the logs.
    console.log(`Live webhook ${type} (data.type=${data.type || 'none'}, session=${data.session_id || data.call_id || 'none'})`);

    if (!HANDLED_EVENTS.includes(type)) {
      // The same pending call can also arrive as a Realtime webhook. Accepting
      // through both APIs loses the race, so we only answer the Live events.
      return Response.json({ ignored: type });
    }

    const sessionId = data.session_id;
    if (!sessionId) return Response.json({ error: 'Webhook carried no session_id' }, { status: 400 });

    const base44 = createClientFromRequest(req);

    // Duplicate deliveries (and our own retries) must not accept the same call
    // twice — the first accept decision wins at OpenAI, which errors afterwards.
    const existing = await base44.asServiceRole.entities.SmsConversation.filter({ call_sid: sessionId });
    if (existing && existing.length > 0) {
      return Response.json({ duplicate: true, session_id: sessionId });
    }

    const settings = await getSmashieSettings(base44);
    if (!settings.realtime_sip_enabled || !settings.voice_ordering_enabled) {
      await rejectLiveSession(sessionId, apiKey, 486);
      console.log(`Rejected call ${sessionId} — live pipeline ${settings.realtime_sip_enabled ? 'on, voice ordering off' : 'off'}.`);
      return Response.json({ rejected: 'live pipeline disabled' });
    }

    const callerPhone = extractCallerPhone(data.sip_headers);
    // Openness — including the admin's 24/7 override window (MenuSetting
    // open_all_day_date / open_all_day_until) — comes from the shared store
    // status helper, so the phone line reads exactly what the website does.
    const [storeStatus, busyness, customer] = await Promise.all([
      getPhysicalStoreStatus(base44),
      getLiveBusyness(base44),
      callerPhone ? lookupCustomerByPhone(base44, callerPhone).catch(() => null) : Promise.resolve(null),
    ]);

    // Blocked callers are declined on the Live pipeline too; they may still leave
    // a message for the crew. A failed lookup must never stop the call from being
    // answered; logPhoneOrder re-checks the block before any order is placed.
    const block = await findBlock(base44, { phone: callerPhone, email: customer?.email }).catch((e) => {
      console.error('Blocked-contact lookup failed, answering anyway:', e.message);
      return null;
    });
    const context = buildCallContext({ storeStatus, busyness, callerPhone, customer, blockedContact: block });

    const enabledTools = SMASHIE_LIVE_TOOLS.filter((tool) => {
      const ability = TOOL_ABILITIES[tool.name];
      return !ability || abilityEnabled(settings, ability);
    });

    const accepted = await acceptLiveSession(sessionId, apiKey, {
      type: 'live',
      model: LIVE_MODEL,
      instructions: `${VOICE_INSTRUCTIONS}\n\n${context}\n\n${smashieAdminContext(settings)}\n\nWhen OPEN use this introduction after the welcome, without saying your name: ${phoneIntro(settings)}`,
      audio: { output: { voice: VOICE } },
      delegation: {
        type: 'responses',
        responses: {
          model: BACKEND_MODEL,
          instructions: `${BACKEND_INSTRUCTIONS}\n\n${context}\n\n${smashieAdminContext(settings)}`,
          tools: enabledTools,
          tool_choice: 'auto',
          // One action at a time: every result is returned as its own answer,
          // so sequential calls always get a complete reply.
          parallel_tool_calls: false,
        },
      },
    });

    if (!accepted.ok) {
      console.error(`Accept failed for ${sessionId} (${accepted.status}): ${accepted.body}`);
      return Response.json({ error: 'Accept failed', status: accepted.status, detail: accepted.body }, { status: 502 });
    }

    // Housekeeping before the call starts: a call whose app connection died
    // never reports a close, and those records would stay "active" forever.
    await closeAbandonedVoiceCalls(base44).catch((e) => console.error('Stale voice call sweep failed:', e.message));

    const conversation = await base44.asServiceRole.entities.SmsConversation.create({
      phone_number: callerPhone || 'unknown',
      conversation_id: sessionId,
      call_sid: sessionId,
      channel: 'voice',
      call_direction: 'inbound',
      call_started_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
      message_count: 0,
      status: 'active',
      transcript: [],
      tool_log: [],
      customer_name: customer?.name || undefined,
      square_customer_id: customer?.id || undefined,
      customer_email: customer?.email || undefined,
    });

    // Answer OpenAI immediately, then start the first hop. One worker cannot
    // hold the call's socket for a whole conversation — the platform takes a
    // function down about twenty seconds after it answers — so the hop drives
    // the call for a short window and passes it to the next one.
    waitUntil(base44.asServiceRole.functions.invoke('smashieLiveHop', {
      relayKey: webhookSecret,
      sessionId,
      conversationId: conversation.id,
      callerPhone,
      counterPhone: Deno.env.get('COUNTER_PHONE_NUMBER') || '',
      greeting: 'Greet the caller now in English. Follow the opening wording, STORE STATUS and admin ability switches in your voice instructions exactly. If open, use only the configured introduction; do not offer disabled abilities. Begin immediately, then pause and listen.',
      state: {},
    }));

    console.log(`Accepted Live call ${sessionId} from ${callerPhone || 'unknown caller'}`);
    return Response.json({ accepted: true, session_id: sessionId });
  } catch (error) {
    console.error('smashieSipIncoming error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}