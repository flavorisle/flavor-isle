import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { Resend } from 'npm:resend@3.2.0';
import { requireAdmin } from '../../shared/requireAdmin.ts';
import { brandedEmailHtml } from '../../shared/sendOrderEmails.ts';
import { loadBlockFilter } from '../../shared/blockedContacts.ts';
import { getPhysicalStoreStatus } from '../../shared/storeState.ts';

// Issue #325 Part 4: a new in-store Star Rewards signup gets ONE create-account
// email.
//
// The sweep runs every 30 minutes and does nothing while the doors are closed.
// It looks at the Square customers created since its last watermark (a loyalty
// account at the counter always creates one, and the account's own email lives
// on that customer record), and for each one with an email and no site account
// it sends exactly one email.
//
// The claim comes first: the NewsletterSend row is written BEFORE Resend is
// called, so an overlapping run — or a retry — can never email the same person
// twice. Everything suppressed elsewhere is suppressed here too: unsubscribed or
// bounced subscribers, the block list, internal addresses, and anyone who
// already has a row.
const SQUARE_VERSION = '2026-09-16';
const FUNCTION_NAME = 'sendLoyaltySignupInvites';
const BROADCAST_ID = 'account_invite_auto';
const FROM = 'Smashie at Flavor Isle <smashie@flavor-isle.com>';
const SUBJECT = "You're in the Star Rewards now, neighbor";
const DEFAULT_LOOKBACK_MS = 24 * 60 * 60 * 1000;
// A watermark left behind for weeks never turns into a mass mailing: the sweep
// only ever looks back this far.
const MAX_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;
const PAGE = 500;

const BODY = `Hey neighbor,
Welcome to Star Rewards. Your Stars are already earning every time you eat with us, and they are waiting on you at flavor-isle.com.
Make your account in about a minute and everything follows you: your Star balance, your visits, and your past orders in one place. Use the same phone number you gave at the counter and the same email this message came to, and your Stars link right up.
You also get 100 Stars on your birthday, and ordering ahead puts you past the line at the walk-up window.
Create your account at flavor-isle.com/register
See you at the Isle,
Smashie and the Flavor Isle crew`;

function escapeHtml(value) {
  return String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// The approved body, line for line — nothing added, nothing shortened.
function bodyHtml() {
  return BODY.split('\n')
    .map((line) => `<p style="margin:0 0 14px;">${escapeHtml(line)}</p>`)
    .join('');
}

function isInternal(email) {
  return !email
    || email.endsWith('@flavorisle.com')
    || email.endsWith('@flavor-isle.com')
    || email === 'wesleyrbooker1@gmail.com'
    || email.endsWith('@base44.com')
    || email.endsWith('@testagent.base44.com');
}

function cleanEmail(value) {
  const email = String(value || '').trim().toLowerCase();
  return /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email) ? email : '';
}

// Every page of a table, by offset. It throws rather than quietly returning a
// short list: a suppression source that cannot be read must stop the sweep, not
// let it email someone it should have skipped.
async function readAll(entity: any, sort = '-created_date') {
  const out: any[] = [];
  for (let page = 0; page < 40; page++) {
    const rows = await entity.filter({}, sort, PAGE, page * PAGE);
    const items = Array.isArray(rows) ? rows : [];
    out.push(...items);
    if (items.length < PAGE) break;
  }
  return out;
}

// The addresses that already belong to a site account. A paged read that fails
// falls back to the plain list so a registered address is never mistaken for a
// new signup.
async function readRegisteredEmails(base44: any): Promise<Set<string>> {
  const set = new Set<string>();
  const add = (rows: any[]) => rows.forEach((u: any) => {
    const email = cleanEmail(u?.email);
    if (email) set.add(email);
  });
  try {
    add(await readAll(base44.asServiceRole.entities.User));
  } catch (error) {
    console.warn('sendLoyaltySignupInvites: paged account read failed, using the plain list:', (error as Error).message);
    const all = await base44.asServiceRole.entities.User.list();
    add(Array.isArray(all) ? all : []);
  }
  return set;
}

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireAdmin(base44);
    if (auth.error) return auth.error;

    // Only while the store is open.
    const store = await getPhysicalStoreStatus(base44);
    if (!store.open) {
      return Response.json({ ok: true, skipped: 'closed', store_message: store.message || '' });
    }

    const connection = await base44.asServiceRole.connectors.getConnection('square');
    if (!connection?.accessToken) {
      return Response.json({ ok: false, error: 'Square not connected' }, { status: 400 });
    }

    const runStart = new Date();
    const runs = await base44.asServiceRole.entities.MaintenanceRun
      .filter({ function_name: FUNCTION_NAME })
      .catch(() => []);
    const watermarkRow = (Array.isArray(runs) ? runs : [])[0] || null;
    const stored = watermarkRow?.last_run_at ? new Date(watermarkRow.last_run_at).getTime() : NaN;
    const floor = Date.now() - MAX_LOOKBACK_MS;
    const since = Number.isFinite(stored)
      ? new Date(Math.max(stored, floor))
      : new Date(Date.now() - DEFAULT_LOOKBACK_MS);

    // Square customers created since the watermark. A counter loyalty signup
    // creates one of these, and it carries the email the customer gave.
    const candidates: any[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 5; page++) {
      const res = await fetch('https://connect.squareup.com/v2/customers/search', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${connection.accessToken}`,
          'Content-Type': 'application/json',
          'Square-Version': SQUARE_VERSION,
        },
        body: JSON.stringify({
          limit: 100,
          query: { filter: { created_at: { start_at: since.toISOString(), end_at: runStart.toISOString() } } },
          ...(cursor ? { cursor } : {}),
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('sendLoyaltySignupInvites: Square customer search failed:', JSON.stringify(data));
        return Response.json({ ok: false, error: 'Square customer search failed' }, { status: 502 });
      }
      candidates.push(...(data.customers || []));
      cursor = data.cursor;
      if (!cursor) break;
    }

    // Suppression sources. The account list and this broadcast's own send log are
    // read once per run; a subscriber row is only looked up for a candidate that
    // is actually about to be emailed.
    let registeredEmails: Set<string>;
    let alreadyClaimed: Set<string>;
    try {
      registeredEmails = await readRegisteredEmails(base44);
      alreadyClaimed = new Set();
      for (let page = 0; page < 40; page++) {
        const rows = await base44.asServiceRole.entities.NewsletterSend
          .filter({ broadcast_id: BROADCAST_ID }, '-created_date', PAGE, page * PAGE);
        const items = Array.isArray(rows) ? rows : [];
        for (const row of items) {
          const email = cleanEmail(row?.email);
          if (email) alreadyClaimed.add(email);
        }
        if (items.length < PAGE) break;
      }
    } catch (error) {
      console.error('sendLoyaltySignupInvites: suppression lists unavailable — nothing sent:', (error as Error).message);
      return Response.json({ ok: false, error: 'suppression lists unavailable, nothing sent' }, { status: 500 });
    }
    if (registeredEmails.size === 0) {
      // Never send when we cannot tell an account holder from a new signup.
      console.error('sendLoyaltySignupInvites: no registered accounts could be read — nothing sent');
      return Response.json({ ok: false, error: 'no registered accounts could be read, nothing sent' }, { status: 500 });
    }

    let blockFilter: any = null;
    try {
      blockFilter = await loadBlockFilter(base44);
    } catch (error) {
      console.error('sendLoyaltySignupInvites: block list unavailable — nothing sent:', (error as Error).message);
      return Response.json({ ok: false, error: 'block list unavailable, nothing sent' }, { status: 500 });
    }

    const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
    const html = brandedEmailHtml(bodyHtml());
    const result = {
      ok: true,
      window_start: since.toISOString(),
      candidates: candidates.length,
      sent: 0,
      skipped: 0,
      failed: 0,
      detail: [] as string[],
    };

    const seen = new Set<string>();
    for (const customer of candidates) {
      const email = cleanEmail(customer?.email_address);
      if (!email || seen.has(email)) continue;
      seen.add(email);

      // A subscriber row that cannot be read means we cannot prove this person
      // has not opted out, so nothing is sent to them.
      let sub: any = null;
      try {
        const subRows = await base44.asServiceRole.entities.EmailSubscriber.filter({ email });
        sub = (Array.isArray(subRows) ? subRows : [])[0] || null;
      } catch (error) {
        result.skipped += 1;
        result.detail.push(`${email}: subscriber_lookup_failed`);
        continue;
      }

      const reason =
        isInternal(email) ? 'internal'
          : registeredEmails.has(email) ? 'has_site_account'
            : alreadyClaimed.has(email) ? 'already_emailed'
              : (sub && ['unsubscribed', 'bounced'].includes(sub.status)) ? `subscriber_${sub.status}`
                : blockFilter.hasEmail(email) ? 'blocked'
                  : null;
      if (reason) {
        result.skipped += 1;
        result.detail.push(`${email}: ${reason}`);
        continue;
      }

      // The claim goes in BEFORE the send. Anything that fails after this point
      // leaves a row behind, which is exactly what stops a second email.
      let claim: any = null;
      try {
        claim = await base44.asServiceRole.entities.NewsletterSend.create({
          broadcast_id: BROADCAST_ID,
          subscriber_id: sub?.id || '',
          email,
          subject: SUBJECT,
          status: 'sent',
          sent_at: new Date().toISOString(),
        });
      } catch (claimError) {
        result.failed += 1;
        result.detail.push(`${email}: claim_failed`);
        console.error(`sendLoyaltySignupInvites: could not claim ${email}:`, (claimError as Error).message);
        continue;
      }
      alreadyClaimed.add(email);

      const { error } = await resend.emails.send({
        from: FROM,
        to: email,
        subject: SUBJECT,
        html,
      });

      if (error) {
        result.failed += 1;
        result.detail.push(`${email}: send_failed`);
        console.error(`sendLoyaltySignupInvites: Resend refused ${email}:`, String(error.message || error));
        if (claim?.id) {
          await base44.asServiceRole.entities.NewsletterSend
            .update(claim.id, { status: 'failed', error: String(error.message || error) })
            .catch(() => {});
        }
        continue;
      }

      result.sent += 1;

      // Stamp the customer's profile so the send is visible on the customer.
      const profiles = await base44.asServiceRole.entities.CustomerProfile
        .filter({ email })
        .catch(() => []);
      const profile = (Array.isArray(profiles) ? profiles : []).find(
        (p: any) => cleanEmail(p?.email) === email,
      );
      if (profile?.id) {
        await base44.asServiceRole.entities.CustomerProfile
          .update(profile.id, { invite_email_sent_at: new Date().toISOString() })
          .catch((err: Error) => console.error(`sendLoyaltySignupInvites: profile stamp failed for ${email}:`, err.message));
      }
    }

    // The watermark moves only after a completed sweep, so a failure re-covers
    // the same window and the claims above keep it from double-sending.
    try {
      if (watermarkRow?.id) {
        await base44.asServiceRole.entities.MaintenanceRun.update(watermarkRow.id, {
          last_run_at: runStart.toISOString(),
          run_count: (Number(watermarkRow.run_count) || 0) + 1,
          last_caller: 'scheduled',
        });
      } else {
        await base44.asServiceRole.entities.MaintenanceRun.create({
          function_name: FUNCTION_NAME,
          last_run_at: runStart.toISOString(),
          run_count: 1,
          last_caller: 'scheduled',
        });
      }
    } catch (watermarkError) {
      console.error('sendLoyaltySignupInvites: watermark update failed:', (watermarkError as Error).message);
    }

    return Response.json(result);
  } catch (error) {
    console.error('sendLoyaltySignupInvites failed:', (error as Error).message);
    return Response.json({ ok: false, error: (error as Error).message }, { status: 500 });
  }
}