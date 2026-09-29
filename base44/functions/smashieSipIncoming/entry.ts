// Inbound SIP calls for the OpenAI-hosted (GPT-Live) phone pipeline.
//
// OpenAI POSTs each incoming call here; we accept it with Smashie's session
// config, then hold the sideband WebSocket that runs his tools and captures the
// transcript. Until OpenAI SIP is enabled for the project, a Twilio trunk is
// pointed at it, and "Live Phone Pipeline" is switched on in Admin →
// Communications, this endpoint rejects every call and the Twilio line keeps
// working exactly as it does today.
//
// 2026-09-29: re-written unchanged to force a redeploy. Every live-session row
// from the 08:26–08:49 UTC test calls was finalized 78–140 ms after creation
// with no description and call_status "completed" — the pre-sideband-fix
// finalizer's exact field set — so the crashed build was still serving those
// calls. No logic in this file was altered by that rewrite.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';
import { getSmashieSettings } from '../../shared/smashieSettings.ts';
import { getPhysicalStoreStatus } from '../../shared/storeClosure.ts';
import { getLiveBusyness } from '../../shared/liveBusyness.ts';
import { lookupCustomerByPhone } from '../../shared/squareCustomer.ts';
import { verifyOpenAIWebhookSignature } from '../../shared/openaiWebhookSignature.ts';
import {
  acceptLiveSession,
  rejectLiveSession,
  referLiveSession,
  hangupLiveSession,
  attachLiveSideband,
} from '../../shared/openaiLiveApi.ts';
import {
  VOICE_INSTRUCTIONS,
  BACKEND_INSTRUCTIONS,
  SMASHIE_LIVE_TOOLS,
  buildCallContext,
} from '../../shared/smashieLivePrompt.ts';
import { runSmashieTool } from '../../shared/smashieToolRunner.ts';
import { phoneIntro, smashieAdminContext, abilityEnabled } from '../../shared/smashieAdminContext.ts';

const LIVE_MODEL = 'gpt-live-1';
const BACKEND_MODEL = 'gpt-6-luna';
const VOICE = 'verse';
const HANDLED_EVENTS = ['live.transport.incoming', 'live.call.incoming'];
const TRANSCRIPT_DONE = /^session\.(input|output)_transcript\.(done|completed)$/;

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

// Holds the sideband socket for the life of the call: appends spoken turns to
// the admin transcript as they finish, runs each delegated tool call, and hands
// the counter transfer to SIP.
async function driveLiveSession({ base44, sessionId, apiKey, conversationId, callerPhone }) {
  const startedAt = Date.now();
  const transcript = [];
  let userText = '';
  let assistantText = '';
  let userSegment = null;
  let assistantSegment = null;
  let finalized = false;
  let sideband = null;
  let sessionClosed = false;
  let finishConnection;
  const connectionClosed = new Promise<void>((resolve) => { finishConnection = resolve; });
  // Events arrive faster than the writes they trigger — every write goes
  // through this chain so the transcript keeps the caller's order.
  let chain = Promise.resolve();

  const queue = (work: () => Promise<any>) => {
    chain = chain.then(work).catch((err) => console.error('Live session task failed:', err.message));
  };

  const persist = async () => {
    await base44.asServiceRole.entities.SmsConversation.update(conversationId, {
      transcript,
      last_message_at: new Date().toISOString(),
      message_count: transcript.length,
    });
  };

  const flush = async (role: 'user' | 'assistant') => {
    const text = (role === 'user' ? userText : assistantText).trim();
    if (role === 'user') userText = ''; else assistantText = '';
    if (!text) return;
    transcript.push({ role, content: text, timestamp: new Date().toISOString() });
    await persist();
  };

  const finalize = async (failure = '') => {
    if (finalized) return;
    finalized = true;
    await flush('user');
    await flush('assistant');
    await base44.asServiceRole.entities.SmsConversation.update(conversationId, {
      transcript,
      last_message_at: new Date().toISOString(),
      message_count: transcript.length,
      status: 'completed',
      call_status: failure ? 'failed' : 'completed',
      description: failure ? failure.slice(0, 1000) : 'Live session ended normally.',
      call_duration: Math.round((Date.now() - startedAt) / 1000),
    });
  };

  const handleDelegation = (envelope) => {
    const nested = envelope?.event || {};
    if (nested.type !== 'response.output_item.done') return;
    const item = nested.item || {};
    if (item.type !== 'function_call' || !item.name || !item.call_id) return;

    queue(async () => {
      await flush('user');
      let args = {};
      if (item.arguments) {
        try {
          args = JSON.parse(item.arguments);
        } catch (e) {
          console.error('Tool arguments were not valid JSON:', e.message);
        }
      }
      console.log(`Live tool call: ${item.name}`);
      const result = await runSmashieTool(base44, { name: item.name, args, callerPhone, sessionId });

      let output = result.output;
      if (result.transferTargetUri) {
        const refer = await referLiveSession(sessionId, apiKey, result.transferTargetUri);
        console.log(`Counter transfer refer: ${refer.ok ? 'accepted' : `failed (${refer.status})`}`);
        if (!refer.ok) {
          output = JSON.stringify({
            transfer_available: false,
            note: 'The counter line could not take the transfer. Offer (270) 563-4618 or take a message for the crew.',
          });
        }
      }

      sideband?.send({ type: 'response.item.create', item: { type: 'function_call_output', call_id: item.call_id, output } });
      sideband?.send({ type: 'response.create' });
    });
  };

  const onEvent = (event) => {
    const type = event?.type || '';

    if (type === 'session.input_transcript.delta' || type === 'session.output_transcript.delta') {
      const isUser = type.includes('input');
      const key = event.item_id || event.event_id || null;
      if (isUser) {
        if (userSegment && key && key !== userSegment) queue(() => flush('user'));
        userSegment = key || userSegment;
        userText += event.delta ?? event.text ?? '';
      } else {
        if (assistantSegment && key && key !== assistantSegment) queue(() => flush('assistant'));
        assistantSegment = key || assistantSegment;
        assistantText += event.delta ?? event.text ?? '';
      }
      return;
    }

    if (TRANSCRIPT_DONE.test(type)) {
      queue(() => flush(type.includes('input') ? 'user' : 'assistant'));
      return;
    }

    if (type === 'response.event') {
      handleDelegation(event);
      return;
    }

    if (type === 'session.closed') {
      sessionClosed = true;
      queue(async () => {
        await finalize();
        sideband?.close();
      });
      return;
    }

    if (type === 'error') console.error('Live session error event:', JSON.stringify(event).slice(0, 400));
  };

  try {
    sideband = await attachLiveSideband(sessionId, apiKey, {
      onEvent,
      onClose: (code, reason) => {
        console.log(`Live sideband closed (${code}) for session ${sessionId}: ${reason || ''}`);
        queue(() => finalize(sessionClosed ? '' : `Sideband disconnected before session.closed (${code}): ${reason || 'no reason supplied'}`));
        finishConnection();
      },
    });
    console.log(`Live sideband attached for session ${sessionId}`);
    // Acceptance has already started the session. Explicitly request the
    // opening turn rather than waiting for the caller to speak first.
    sideband.send({
      type: 'session.instructions.append',
      delegation_id: null,
      content: 'Greet the caller now in English. Follow the opening wording, STORE STATUS and admin ability switches in your voice instructions exactly. If open, use only the configured introduction; do not offer disabled abilities. Begin immediately, then pause and listen.',
    });
    // Keep waitUntil pending for the entire connection, not just the handshake.
    await connectionClosed;
    await chain;
  } catch (e) {
    console.error(`Live sideband failed for ${sessionId}:`, e.message);
    sideband?.close();
    await chain;
    await finalize(`Live sideband failed: ${e.message}`);
    await hangupLiveSession(sessionId, apiKey);
  }
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
    const [storeStatus, busyness, customer] = await Promise.all([
      getPhysicalStoreStatus(base44),
      getLiveBusyness(base44),
      callerPhone ? lookupCustomerByPhone(base44, callerPhone).catch(() => null) : Promise.resolve(null),
    ]);

    const context = buildCallContext({ storeStatus, busyness, callerPhone, customer });

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
          tools: SMASHIE_LIVE_TOOLS.filter(tool => ({ place_order: 'orders', lookup_menu: 'menu', burger_toppings: 'menu', shake_menu: 'menu', take_message: 'messages', transfer_to_counter: 'transfer' }[tool.name] ? abilityEnabled(settings, { place_order: 'orders', lookup_menu: 'menu', burger_toppings: 'menu', shake_menu: 'menu', take_message: 'messages', transfer_to_counter: 'transfer' }[tool.name]) : true)),
          tool_choice: 'auto',
        },
      },
    });

    if (!accepted.ok) {
      console.error(`Accept failed for ${sessionId} (${accepted.status}): ${accepted.body}`);
      return Response.json({ error: 'Accept failed', status: accepted.status, detail: accepted.body }, { status: 502 });
    }

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
      customer_name: customer?.name || undefined,
      square_customer_id: customer?.id || undefined,
      customer_email: customer?.email || undefined,
    });

    // Answer OpenAI immediately and keep the sideband running after the
    // response, so a long call never holds up the webhook delivery.
    waitUntil(driveLiveSession({
      base44,
      sessionId,
      apiKey,
      conversationId: conversation.id,
      callerPhone,
    }));

    console.log(`Accepted Live call ${sessionId} from ${callerPhone || 'unknown caller'}`);
    return Response.json({ accepted: true, session_id: sessionId });
  } catch (error) {
    console.error('smashieSipIncoming error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}