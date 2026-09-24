import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { sendFacebookEvent, getFacebookAccessToken } from '../../shared/facebookConversions.ts';

// Client-callable Facebook Conversions API endpoint.
// The frontend invokes this for browser-side events (AddToCart, InitiateCheckout,
// ViewContent, Search, Contact, etc.) so they're sent server-side with the
// visitor's real IP + User Agent (which can't be read from the browser).
// Server-only events (Purchase, Subscribe) are sent directly from their
// respective backend functions instead.

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { event_name, event_source_url, event_id, user_data = {}, custom_data = {} } = body;

    if (!event_name) {
      return Response.json({ error: 'event_name required' }, { status: 400 });
    }

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
      custom_data,
    }, accessToken);

    return Response.json({ sent: true });
  } catch (error) {
    console.error('trackFacebookEvent error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}