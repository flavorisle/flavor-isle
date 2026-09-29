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

// The worker runtime supports authenticated outbound sockets through fetch's
// Upgrade handshake, not the browser build of the Node `ws` package.
export async function attachLiveSideband(sessionId: string, apiKey: string, handlers: SidebandHandlers): Promise<Sideband> {
  const response = await fetch(`${ATTACH_URL}/${sessionId}/attach`, {
    headers: { Authorization: `Bearer ${apiKey}`, Upgrade: 'websocket' },
  });
  const socket = response.webSocket;
  if (!socket) {
    const detail = (await response.text()).slice(0, 400);
    throw new Error(`Live sideband upgrade failed (${response.status}): ${detail}`);
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