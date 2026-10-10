import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

// Records admin presence for the Admin Dashboard's activity panel.
//
// Two callers share this one function:
//   source 'login'    — the "Admin Login Tracking" workflow, fired on every
//                       admin sign-in. Those requests carry no user token, so
//                       the account is verified against the User entity.
//   source 'presence' — the admin panel itself, while an admin has a page open.
//                       Those requests are made by the admin in person and are
//                       authorised from their own session.
//
// Only accounts whose role is 'admin' are ever recorded.

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const source = body.source === 'presence' ? 'presence' : 'login';
    const at = body.at || new Date().toISOString();
    const view = String(body.view || '').trim().slice(0, 80);

    let email = '';
    let name = '';

    if (source === 'presence') {
      const user = await base44.auth.me();
      if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
      if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
      email = normalizeEmail(user.email);
      name = user.full_name || '';
    } else {
      email = normalizeEmail(body.email);
      name = String(body.full_name || '').trim();
    }

    if (!email) return Response.json({ error: 'No admin email on the request' }, { status: 400 });

    // Confirm the account really is an admin before writing anything.
    const accounts = await base44.asServiceRole.entities.User.filter({ email });
    const account = accounts && accounts[0];
    if (!account || account.role !== 'admin') {
      return Response.json({ ok: true, recorded: false, reason: 'account is not an admin' });
    }

    const displayName = name || account.full_name || email;
    const rows = await base44.asServiceRole.entities.AdminActivity.filter({ admin_email: email });
    const existing = rows && rows[0];

    if (!existing) {
      const created = await base44.asServiceRole.entities.AdminActivity.create({
        admin_email: email,
        admin_name: displayName,
        last_login_at: at,
        login_count: source === 'login' ? 1 : 0,
        last_seen_at: at,
        last_view: source === 'presence' ? view : 'Just signed in',
      });
      return Response.json({ ok: true, recorded: true, id: created.id });
    }

    const patch = {
      admin_name: displayName || existing.admin_name,
      last_seen_at: at,
    };

    if (source === 'login') {
      patch.last_login_at = at;
      patch.login_count = (existing.login_count || 0) + 1;
      patch.last_view = 'Just signed in';
    } else if (view) {
      patch.last_view = view;
    }

    await base44.asServiceRole.entities.AdminActivity.update(existing.id, patch);
    return Response.json({ ok: true, recorded: true, id: existing.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}