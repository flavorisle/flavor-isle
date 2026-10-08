// Thin client for OpenAI's Live (GPT-Live) session API, used by the SIP phone
// pipeline: accept/reject an inbound call, transfer or hang it up, and hold the
// "sideband" WebSocket that drives Smashie's tools and captures the transcript.
//
// Direct-SIP model: Twilio exchanges the call audio with OpenAI, so this code
// never touches audio — it only controls the session and does the business
// logic. Docs: developers.openai.com/api/docs/guides/voice-sip
const SESSIONS_URL = 'https://api.openai.com/v1/live/sessions';
const ATTACH_URL = 'https://api.openai.com/v1/live/sessions';

function authHeaders(apiKey: string) {
  return { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' };
}

async function sessionAction(sessionId: string, action: string, apiKey: string, payload?: object) {
  const res = await fetch(`${SESSIONS_URL}/${sessionId}/${action}`, {
    method: 'POST',
    headers: authHeaders(apiKey),
    body: payload ? JSON.stringify(payload) : undefined,
  });
  // Success is 200 with an empty body; anything else carries the reason.
  const text = await res.text();
  return { ok: res.ok, status: res.status, body: text };
}

// Accept the call and configure the session: the live model speaks, the
// delegated backend model answers menu/order questions. SIP negotiates audio,
// so no audio.format is sent.
export function acceptLiveSession(sessionId: string, apiKey: string, session: object) {
  return sessionAction(sessionId, 'accept', apiKey, { session });
}

// Busy signal — used when the pipeline (or voice ordering) is switched off.
export function rejectLiveSession(sessionId: string, apiKey: string, statusCode = 486) {
  return sessionAction(sessionId, 'reject', apiKey, { status_code: statusCode });
}

// Hand the caller to the counter over SIP. The target comes from
// SIP_TRANSFER_TARGET (our Twilio SIP domain) — see the environment variables.
export function referLiveSession(sessionId: string, apiKey: string, targetUri: string) {
  return sessionAction(sessionId, 'refer', apiKey, { target_uri: targetUri });
}

export function hangupLiveSession(sessionId: string, apiKey: string) {
  return sessionAction(sessionId, 'hangup', apiKey);
}

export interface SidebandHandlers {
  onEvent: (event: any) => void;
  onClose: (code?: number, reason?: string) => void;
}

export interface Sideband {
  send: (message: object) => void;
  close: () => void;
}

// Return one finished function call's result to the session. The documented
// pair is this event followed by response.create; neither takes a delegation_id.
export function sendFunctionCallOutput(sideband: Sideband, callId: string, output: string) {
  sideband.send({
    type: 'response.item.create',
    item: { type: 'function_call_output', call_id: callId, output },
  });
}

// Ask the backend to continue after a tool result, so a finished action is
// always spoken instead of leaving the caller in silence.
export function requestBackendTurn(sideband: Sideband) {
  sideband.send({ type: 'response.create' });
}

// Context appends steer the live model directly. `instructions` is quiet
// context, `commentary` is spoken to the caller.
export function appendInstruction(sideband: Sideband, content: string) {
  sideband.send({ type: 'session.instructions.append', delegation_id: null, content });
}

export function appendSpeakableNote(sideband: Sideband, content: string) {
  sideband.send({ type: 'session.commentary.append', delegation_id: null, content });
}

// The worker runtime supports authenticated outbound sockets through fetch's
// Upgrade handshake, not the browser build of the Node `ws` package.
export async function attachLiveSideband(sessionId: string, apiKey: string, handlers: SidebandHandlers): Promise<Sideband> {
  const response = await fetch(`${ATTACH_URL}/${sessionId}/attach`, {
    headers: { Authorization: `Bearer ${apiKey}`, Upgrade: 'websocket' },
  });
  const socket = response.webSocket;
  if (!socket) {
    // The exact HTTP status and error body are carried in the message: issue #82
    // needs the line's own refusal reason on the call record, so the very next
    // real call names why a socket was turned away instead of only that it was.
    const detail = (await response.text()).slice(0, 400);
    throw new Error(`Live sideband upgrade failed — HTTP ${response.status}: ${detail}`);
  }
  socket.addEventListener('message', (event) => {
    try {
      handlers.onEvent(JSON.parse(event.data));
    } catch (error) {
      console.error('Live sideband event failed:', error.message);
    }
  });
  socket.addEventListener('close', (event) => handlers.onClose(event.code, event.reason));
  socket.addEventListener('error', () => {
    console.error('Live sideband transport error');
    socket.close(1011, 'Sideband transport error');
  });
  socket.accept();
  return {
    send: (message: object) => socket.send(JSON.stringify(message)),
    close: () => socket.close(1000, 'Session finished'),
  };
}