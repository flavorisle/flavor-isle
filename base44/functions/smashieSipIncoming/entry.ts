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
import { getSmashieSettings, phoneCashEnabled } from '../../shared/smashieSettings.ts';
import { getPhoneStoreStatus, getUnifiedStoreState } from '../../shared/storeState.ts';
import { getLiveBusyness } from '../../shared/liveBusyness.ts';
import { lookupCustomerByPhone } from '../../shared/squareCustomer.ts';
import { verifyOpenAIWebhookSignature } from '../../shared/openaiWebhookSignature.ts';
import { acceptLiveSession, rejectLiveSession, referLiveSession } from '../../shared/openaiLiveApi.ts';
import { closeAbandonedVoiceCalls } from '../../shared/smashieLiveSession.ts';
import {
  VOICE_INSTRUCTIONS,
  BACKEND_INSTRUCTIONS,
  SMASHIE_LIVE_TOOLS,
  buildCallContext,
} from '../../shared/smashieLivePrompt.ts';
import { phoneIntro, smashieAdminContext, abilityEnabled } from '../../shared/smashieAdminContext.ts';
import { findBlock } from '../../shared/blockedContacts.ts';
import { isPassThrough } from '../../shared/counterPassThrough.ts';

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

// Issue #93 (C1): the counter hand-off address, resolved exactly the way
// Smashie's transfer_to_counter tool resolves it — the admin-visible
// SmashieSettings field first, the SIP_TRANSFER_TARGET secret as the fallback.
// A plain phone number cannot receive a REFER, so it counts as no target at all
// rather than a hand-off that could never connect.
function resolveCounterTarget(settings) {
  const configured = String(settings?.sip_transfer_target || Deno.env.get('SIP_TRANSFER_TARGET') || '').trim();
  if (!configured) return '';
  if (/^tel:/i.test(configured) || /^\+?[\d\s().-]{7,}$/.test(configured)) return '';
  return /^sips?:/i.test(configured) ? configured : `sip:${configured}`;
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
    // Store state — closure, ordering on/off, the 24/7 override, today's early
    // close — comes from the shared module, so the phone line reads exactly what
    // the website does. The unified state also feeds the delivery range and fee,
    // the site notice, and the cash line into the call context below.
    const [storeStatus, storeState, busyness, customer] = await Promise.all([
      getPhoneStoreStatus(base44),
      getUnifiedStoreState(base44),
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
    // Issue #93 (C1): counter pass-through, checked in this exact order —
    // (1) the block lookup above always wins, so a number on BOTH lists stays
    // blocked; (2) pass-through applies only while the store is OPEN, so a
    // closed store runs the normal closed flow below. A listed caller is never
    // handed to Smashie's model: the session is accepted and handed to the
    // counter below, and if that hand-off fails the call falls through to a
    // normal Smashie call — a caller is never dropped.
    const counterPassThrough = !block && storeStatus.open && callerPhone
      ? await isPassThrough(base44, callerPhone)
      : false;
    const counterTarget = resolveCounterTarget(settings);
    if (counterPassThrough) {
      console.log(`Counter pass-through caller ${callerPhone}${counterTarget ? '' : ' — no counter routing address configured'}`);
    }

    const context = buildCallContext({ storeStatus, storeState, cashEnabled: phoneCashEnabled(settings), busyness, callerPhone, customer, blockedContact: block });

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

    // Issue #93 (C1): the pass-through hand-off. The session is accepted above
    // (so the call is never rejected), then immediately REFERred to the counter
    // — no Smashie conversation, no greeting, no model turn. If the REFER fails,
    // the code below continues as a normal Smashie call so the caller is never
    // dropped. The call record carries a `counter pass-through` note so the
    // Phone Log shows the route.
    if (counterPassThrough && counterTarget) {
      const refer = await referLiveSession(sessionId, apiKey, counterTarget);
      console.log(`Counter pass-through refer for ${callerPhone}: ${refer.ok ? 'accepted' : `failed (${refer.status})`}`);
      if (refer.ok) {
        await base44.asServiceRole.entities.SmsConversation.create({
          phone_number: callerPhone,
          conversation_id: sessionId,
          call_sid: sessionId,
          channel: 'voice',
          call_direction: 'inbound',
          call_started_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
          message_count: 0,
          status: 'active',
          transcript: [],
          tool_log: [{ at: new Date().toISOString(), name: 'counter_pass_through', ok: true, detail: `counter pass-through — REFER ${counterTarget}` }],
          customer_name: customer?.name || undefined,
          square_customer_id: customer?.id || undefined,
          customer_email: customer?.email || undefined,
        });
        return Response.json({ accepted: true, pass_through: true, session_id: sessionId });
      }
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

    // Answer OpenAI immediately, then start the first hop. Issue #86 (3.1): the
    // invoke only needs to START the hop and is deliberately
    // not awaited — the hop now holds its own request open for a 150-second slice,
    // far past this webhook's post-response lifetime, so waiting on its body would
    // never be useful. The waitUntil wrapper is kept so the launch is not cut off.
    waitUntil(
      base44.asServiceRole.functions.invoke('smashieLiveHop', {
        relayKey: webhookSecret,
        sessionId,
        conversationId: conversation.id,
        callerPhone,
        counterPhone: Deno.env.get('COUNTER_PHONE_NUMBER') || '',
        greeting: 'Greet the caller now in English. Follow the opening wording, STORE STATUS and admin ability switches in your voice instructions exactly. If open, use only the configured introduction; do not offer disabled abilities. Begin immediately, then pause and listen.',
        state: {},
      }).catch((err) => console.error('The first live hop could not be launched:', err.message)),
    );

    console.log(`Accepted Live call ${sessionId} from ${callerPhone || 'unknown caller'}`);
    return Response.json({ accepted: true, session_id: sessionId });
  } catch (error) {
    console.error('smashieSipIncoming error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}