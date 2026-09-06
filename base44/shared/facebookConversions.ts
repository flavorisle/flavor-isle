// Facebook Conversions API — sends server-side events to Meta for ad attribution.
// Pairs with the browser Pixel in index.html; events are deduplicated via event_id.
// User data (email, phone, name, etc.) is SHA-256 hashed per Meta's spec.
// Client IP address and User Agent are NOT hashed (sent raw).

const API_VERSION = 'v21.0';
const GRAPH_ENDPOINT = `https://graph.facebook.com/${API_VERSION}`;

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Normalize + hash user data fields per Meta's Conversions API spec.
// Returns an object with hashed values ready for the API payload.
async function hashUserData(userData: Record<string, any>): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  if (userData.email) {
    result.em = [await sha256(String(userData.email).trim().toLowerCase())];
  }
  if (userData.phone) {
    const cleaned = String(userData.phone).replace(/[^0-9]/g, '');
    result.ph = [await sha256(cleaned)];
  }
  if (userData.first_name) {
    result.fn = [await sha256(String(userData.first_name).trim().toLowerCase())];
  }
  if (userData.last_name) {
    result.ln = [await sha256(String(userData.last_name).trim().toLowerCase())];
  }
  if (userData.city) {
    result.ct = [await sha256(String(userData.city).trim().toLowerCase())];
  }
  if (userData.state) {
    result.st = [await sha256(String(userData.state).trim().toLowerCase())];
  }
  if (userData.zip) {
    result.zp = [await sha256(String(userData.zip).trim().toLowerCase().replace(/\s/g, ''))];
  }
  if (userData.country) {
    result.country = [await sha256(String(userData.country).trim().toLowerCase())];
  }
  if (userData.external_id) {
    result.external_id = [await sha256(String(userData.external_id).trim())];
  }
  // Not hashed — sent raw per Meta spec
  if (userData.client_ip_address) {
    result.client_ip_address = userData.client_ip_address;
  }
  if (userData.client_user_agent) {
    result.client_user_agent = userData.client_user_agent;
  }
  if (userData.fbp) {
    result.fbp = userData.fbp;
  }
  if (userData.fbc) {
    result.fbc = userData.fbc;
  }
  return result;
}

export interface FacebookEvent {
  event_name: string;
  event_time: number; // unix seconds
  action_source: string; // 'website' | 'system' | 'chat' | 'physical_store' | 'phone_call'
  event_source_url?: string;
  event_id?: string; // for deduplication with the browser Pixel
  user_data: {
    email?: string;
    phone?: string;
    first_name?: string;
    last_name?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
    external_id?: string;
    client_ip_address?: string;
    client_user_agent?: string;
    fbp?: string; // browser cookie id
    fbc?: string; // click id
  };
  custom_data?: {
    currency?: string;
    value?: number;
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
    content_type?: string;
    contents?: Array<{ id: string; quantity: number; item_price: number }>;
    num_items?: number;
    search_string?: string;
    order_id?: string;
    [key: string]: any;
  };
}

// Send one or more events to the Meta Conversions API.
// Returns the API response, or null if secrets are missing / the call fails.
export async function sendFacebookEvents(events: FacebookEvent[]): Promise<any> {
  const pixelId = Deno.env.get('FACEBOOK_PIXEL_ID');
  const accessToken = Deno.env.get('FACEBOOK_ACCESS_TOKEN');

  if (!pixelId || !accessToken) {
    console.warn('Facebook CAPI: missing FACEBOOK_PIXEL_ID or FACEBOOK_ACCESS_TOKEN — skipping event send');
    return null;
  }

  // Hash user data for each event before sending
  const hashedEvents = await Promise.all(events.map(async (ev) => {
    const hashedUserData = await hashUserData(ev.user_data || {});
    const out: Record<string, any> = {
      event_name: ev.event_name,
      event_time: ev.event_time,
      action_source: ev.action_source,
      user_data: hashedUserData,
    };
    if (ev.event_source_url) out.event_source_url = ev.event_source_url;
    if (ev.event_id) out.event_id = ev.event_id;
    if (ev.custom_data) out.custom_data = ev.custom_data;
    return out;
  }));

  const payload = { data: hashedEvents };

  try {
    const url = `${GRAPH_ENDPOINT}/${pixelId}/events?access_token=${accessToken}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await res.json();
    if (!res.ok) {
      console.error('Facebook CAPI error:', JSON.stringify(result));
    } else {
      console.log(`Facebook CAPI: sent ${events.length} event(s) — ${events.map(e => e.event_name).join(', ')}`);
    }
    return result;
  } catch (err) {
    console.error('Facebook CAPI fetch failed:', err.message);
    return null;
  }
}

// Convenience: send a single event (fire-and-forget friendly).
export async function sendFacebookEvent(event: FacebookEvent): Promise<any> {
  return sendFacebookEvents([event]);
}