import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendFacebookEvent, getFacebookAccessToken } from '../../shared/facebookConversions.ts';

// Client-callable Facebook Conversions API endpoint.
// The frontend invokes this for browser-side events (AddToCart, InitiateCheckout,
// ViewContent, Search, Contact, etc.) so they're sent server-side with the
// visitor's real IP + User Agent (which can't be read from the browser).
// Server-only events (Purchase, Subscribe) are sent directly from their
// respective backend functions instead.
//
// It forwards to the store's ad account with the store's own access token, so it
// accepts only the events this app actually sends, clamps the money fields, and
// throttles each caller — otherwise anyone could feed the ad account fabricated
// conversions and skew bidding and reporting.
const ALLOWED_EVENTS = new Set([
  // Meta's own names.
  'PageView',
  'ViewContent',
  'AddToCart',
  'RemoveFromCart',
  'InitiateCheckout',
  'AddPaymentInfo',
  'ViewCart',
  'Search',
  'Contact',
  'Lead',
  'Subscribe',
  'CompleteRegistration',
  'CustomizeProduct',
  // The GA4-style names the site's ecommerce helpers use.
  'page_view',
  'view_item',
  'view_item_list',
  'select_item',
  'add_to_cart',
  'remove_from_cart',
  'view_cart',
  'begin_checkout',
  'add_payment_info',
  'search',
  'contact',
  'generate_lead',
  'sign_up',
  'purchase',
]);

const MAX_EVENT_VALUE = 5000;
const RATE_WINDOW_MS = 60 * 1000;
const RATE_MAX_PER_WINDOW = 40;
const eventHits = new Map();

function allowEvent(req: Request): boolean {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unknown';
  const now = Date.now();
  const recent = (eventHits.get(ip) || []).filter((at) => now - at < RATE_WINDOW_MS);
  if (recent.length >= RATE_MAX_PER_WINDOW) {
    eventHits.set(ip, recent);
    return false;
  }
  recent.push(now);
  eventHits.set(ip, recent);
  if (eventHits.size > 1000) {
    for (const [key, hits] of eventHits) {
      if (!hits.some((at) => now - at < RATE_WINDOW_MS)) eventHits.delete(key);
    }
  }
  return true;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event_name, event_source_url, event_id, user_data = {}, custom_data = {} } = body;

    if (!ALLOWED_EVENTS.has(String(event_name || ''))) {
      return Response.json({ error: 'Unsupported event' }, { status: 400 });
    }
    if (!allowEvent(req)) {
      return Response.json({ error: 'Too many events' }, { status: 429 });
    }

    const value = Number(custom_data?.value);
    const safeCustomData = {
      ...custom_data,
      ...(Number.isFinite(value) ? { value: Math.max(0, Math.min(MAX_EVENT_VALUE, value)) } : {}),
      currency: 'USD',
    };

    // Capture the visitor's IP and User Agent from the request headers —
    // these are NOT hashed per Meta's spec and dramatically improve attribution.
    const forwarded = req.headers.get('x-forwarded-for');
    const clientIp = forwarded ? forwarded.split(',')[0].trim() : '';
    const userAgent = req.headers.get('user-agent') || '';

    const accessToken = await getFacebookAccessToken(base44);
    await sendFacebookEvent({
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      action_source: 'website',
      event_source_url: event_source_url || '',
      event_id,
      user_data: {
        ...user_data,
        client_ip_address: clientIp,
        client_user_agent: userAgent,
      },
      custom_data: safeCustomData,
    }, accessToken);

    return Response.json({ sent: true });
  } catch (error) {
    console.error('trackFacebookEvent error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}