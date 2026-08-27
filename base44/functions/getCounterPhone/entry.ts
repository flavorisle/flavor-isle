import { secrets } from 'base44:runtime';

// Returns the counter phone number so the in-app Smashie chat can offer a
// one-tap "Call the Counter" button when Smashie emits the [[TRANSFER]]
// token — mirroring what the phone voice flow does via Twilio <Dial>.
export default async function(req: Request): Promise<Response> {
  try {
    const phone = secrets.get('COUNTER_PHONE_NUMBER');
    if (!phone) {
      return Response.json({ error: 'Counter phone not configured' }, { status: 500 });
    }
    return Response.json({ phone });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}