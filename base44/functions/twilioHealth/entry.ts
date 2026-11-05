import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { requireAdmin } from '../../shared/requireAdmin.ts';

// Read-only Twilio health probe (Wesley, Nov 4 2026): with Twilio offline he
// needs monitoring that alerts him automatically. This function ONLY reads the
// account record with the app's existing Twilio credentials — it never sends a
// message, never writes, never touches an entity, and accepts no customer data.
//
// Always answers HTTP 200 with JSON so a caller (or a scheduled monitor) can
// read the reason rather than parsing an HTTP error:
//   { ok, active, status, error_code, checked_at, message? }
//   ok          true only when Twilio answered and the account is active
//   active      account.status === 'active'
//   status      Twilio's account status string, null when unavailable
//   error_code  Twilio's numeric error code (e.g. 20003) when the call fails
export default async function (req: Request): Promise<Response> {
  const checkedAt = new Date().toISOString();

  const reply = (fields) => Response.json({
    ok: false,
    active: false,
    status: null,
    error_code: null,
    checked_at: checkedAt,
    ...fields,
  }, { status: 200 });

  try {
    const base44 = createClientFromRequest(req);
    const { error: authError } = await requireAdmin(base44);
    if (authError) return authError;

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    if (!accountSid || !authToken) {
      console.error('twilioHealth: Twilio credentials are not configured');
      return reply({ message: 'Twilio credentials are not configured' });
    }

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}.json`, {
      method: 'GET',
      headers: { Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`, Accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });

    const raw = await res.text();
    let data = {};
    try { data = JSON.parse(raw); } catch { /* non-JSON body: handled below */ }

    const status = typeof data?.status === 'string' ? data.status : null;
    const errorCode = Number.isFinite(Number(data?.code)) && data?.code !== null && data?.code !== undefined
      ? Number(data.code)
      : null;
    const active = status === 'active';

    if (!res.ok) {
      const message = data?.message || `Twilio responded ${res.status}`;
      console.error(`twilioHealth: ${res.status} code=${errorCode ?? 'none'} status=${status ?? 'unknown'} — ${message}`);
      return reply({ status, error_code: errorCode, message });
    }

    if (!status) {
      return reply({ message: 'Twilio returned no account status' });
    }
    if (!active) {
      console.error(`twilioHealth: account status is ${status}`);
      return reply({ status, error_code: errorCode, message: `Account status is ${status}` });
    }

    return Response.json({ ok: true, active: true, status, error_code: null, checked_at: checkedAt });
  } catch (error) {
    // Network failure, timeout or DNS problem: no Twilio code to report.
    console.error('twilioHealth probe failed:', error.message);
    return reply({ message: error.message || 'Twilio probe failed' });
  }
}