import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Sends the branded "Welcome" email template to one app user. Called by the
// Welcome Email workflow when a new account signs up. Workflow steps run as an
// app admin, so the endpoint refuses anyone else.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch((e: any) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim();
    if (!email) return Response.json({ error: 'email is required' }, { status: 400 });

    const fullName = String(body.full_name || '').trim();
    const firstName = fullName ? fullName.split(/\s+/)[0] : 'friend';

    const result = await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      template_name: 'Welcome',
      category: 'marketing',
      variables: {
        first_name: firstName,
        cta_url: 'https://flavor-isle.com/menu',
      },
    });

    console.log('sendWelcomeEmail:', email, JSON.stringify(result));
    return Response.json({ ok: result?.success !== false, result });
  } catch (error) {
    console.log('sendWelcomeEmail error:', error?.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
}