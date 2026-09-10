import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Sends the public Contact form message to the store inbox.
// Moved server-side so the SendEmail integration (a restricted, credit-using
// Core call) is never exposed to the client.
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const name = (body.name || '').toString().trim();
    const email = (body.email || '').toString().trim();
    const message = (body.message || '').toString().trim();

    if (!name || !email || !message) {
      return Response.json({ error: 'Name, email, and message are required.' }, { status: 400 });
    }
    if (name.length > 100 || email.length > 200 || message.length > 4000) {
      return Response.json({ error: 'Message too long.' }, { status: 400 });
    }

    await base44.integrations.Core.SendEmail({
      to: 'hello@order.flavor-isle.com',
      subject: `Website Message from ${name}`,
      body: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}