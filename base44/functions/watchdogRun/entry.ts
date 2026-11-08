// Flavor Isle watchdog — deterministic health sweep.
//
// Wesley approved option C on Nov 8 2026: move the watchdog off the agent
// workflow and into a scheduled backend function. The old shape ended in an
// agent step, and the platform forces an agent step to return a closing message
// that it delivers to Wesley's chat, so a ten-minute schedule texted him 96
// times a day. A backend function has no agent step: nothing reaches his phone
// except the email this function itself chooses to send.
//
// Every check below is deterministic and read-only. The only two entities this
// function writes are WatchdogIncident (one row per condition, open/cleared) and
// WatchdogRun (one row per sweep). It never modifies an order, a text log, a
// newsletter, a push record or a customer.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { Resend } from 'npm:resend@3.2.0';
import { maintenanceCaller, maintenanceGate } from '../../shared/maintenanceGate.ts';

const OWNER_EMAIL = 'wesleyrbooker1@gmail.com';
const FROM_ADDRESS = 'Wesley Booker <wesley@order.flavor-isle.com>';
const USER_AGENT = 'FlavorIsleAgent/1.0';
const STORE_TZ = 'America/Chicago';
// The menu setting the store actually edits. Read by id out of a newest-first
// page, never with a bare limit-1 read that could pick up a stray record.
const LIVE_MENU_SETTING_ID = '6a619923321f89b8d1cf8b3f';

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const HOURS_PADDING_MIN = 30; // still counting 30 min past closing
const QUIET_HOURS = 24 * HOUR; // signature umbrellas clear after a quiet day
const UNALERTED_AFTER_MIN = 15;
const RECEIPT_FROM_MIN = 20;
const RECEIPT_TO_MIN = 90;
const ORDER_LOOKBACK = 6 * HOUR;
const RUN_WINDOW_MS = 9 * MIN;

const CHECK_IDS = [
  'syncHeartbeat',
  'unalertedPaid',
  'cardFailures',
  'syncErrors',
  'customerTexts',
  'missingReceipts',
  'customerUnnotified',
  'bulkSends',
  'push',
  'twilioProbe',
];

// TIER_1 keys are the checks where a named paying customer is worse off inside
// the hour. Everything else is TIER_2 and never emails on its own.
const TIER_1_KEYS = new Set(['unalerted_paid', 'card_failures', 'receipt_missing', 'customer_unnotified']);
// These clear on recovery (the condition simply stops), not on a quiet window:
// the store is counting again, or the Twilio account is active again.
const RECOVERY_CLEAR_KEYS = new Set(['sync_heartbeat', 'twilio']);
// Text incidents clear on delivery: their own rows stop failing.
const DELIVERY_CLEAR_KEYS = new Set(['sms_failed', 'sms_queued']);

function rows(page) {
  if (!page) return [];
  return Array.isArray(page) ? page : page.items || [];
}

function ctParts(at) {
  const parts = {};
  for (const part of new Intl.DateTimeFormat('en-US', {
    timeZone: STORE_TZ,
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at)) {
    parts[part.type] = part.value;
  }
  const hour = Number(parts.hour) % 24;
  return {
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
    weekday: String(parts.weekday || '').toLowerCase(),
    hour,
    minute: Number(parts.minute),
    minutes: hour * 60 + Number(parts.minute),
  };
}

function clockMinutes(value) {
  const [h, m] = String(value || '').split(':').map(Number);
  if (!Number.isFinite(h)) return null;
  return h * 60 + (Number.isFinite(m) ? m : 0);
}

function minutesLabel(total) {
  const t = ((total % 1440) + 1440) % 1440;
  const h = Math.floor(t / 60);
  const m = t % 60;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`;
}

// The store's own hours for today, with a one-day early close honored.
function storeWindow(menuSetting, ct) {
  const day = (menuSetting?.business_hours || {})[ct.weekday] || {};
  if (day.closed === true) {
    return { open: false, opensAt: null, closesAt: null, label: `closed ${ct.weekday}` };
  }
  const opensAt = clockMinutes(day.open);
  let closesAt = clockMinutes(day.close);
  if (closesAt == null) closesAt = clockMinutes(menuSetting?.closing_time);
  const early = menuSetting?.early_close;
  if (early?.date && early.date === ct.dateKey) {
    const earlyClose = clockMinutes(early.close_time);
    if (earlyClose != null) closesAt = closesAt == null ? earlyClose : Math.min(closesAt, earlyClose);
  }
  if (opensAt == null || closesAt == null) {
    return { open: false, opensAt: null, closesAt: null, label: 'hours unknown' };
  }
  const open = ct.minutes >= opensAt && ct.minutes <= closesAt + HOURS_PADDING_MIN;
  return {
    open,
    opensAt,
    closesAt,
    label: `${minutesLabel(opensAt)}–${minutesLabel(closesAt)}`,
  };
}

function errorSignature(text) {
  const raw = String(text || '')
    .toLowerCase()
    .replace(/[0-9a-f]{8,}/g, '<id>')
    .replace(/\d+/g, '<n>')
    .replace(/\s+/g, ' ')
    .trim();
  return raw.slice(0, 90) || 'unknown';
}

function keySlug(text) {
  const slug = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40);
  return slug || 'unknown';
}

function realEmail(email) {
  const value = String(email || '').trim().toLowerCase();
  if (!value || !value.includes('@')) return false;
  if (value.endsWith('@flavorisle.com')) return false;
  if (value.endsWith('.local')) return false;
  return true;
}

function ageLabel(iso, now) {
  const at = Date.parse(iso || '');
  if (!Number.isFinite(at)) return 'unknown age';
  const mins = Math.max(0, Math.round((now - at) / MIN));
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 48) return `${hours} hr`;
  return `${Math.round(hours / 24)} d`;
}

function emailShell(title, inner) {
  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f1ea;font-family:Arial,Helvetica,sans-serif;color:#003366;">
  <div style="max-width:640px;margin:0 auto;padding:24px;">
    <div style="background:#003366;border-radius:16px 16px 0 0;padding:20px 24px;">
      <p style="margin:0;font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#F5A623;">Flavor Isle watchdog</p>
      <h1 style="margin:6px 0 0;font-size:22px;color:#ffffff;line-height:1.25;">${title}</h1>
    </div>
    <div style="background:#ffffff;border-radius:0 0 16px 16px;padding:20px 24px;font-size:15px;line-height:1.55;">${inner}</div>
    <p style="text-align:center;color:#8a8a8a;font-size:12px;margin:16px 0 0;">Automated watchdog · Flavor Isle · do not reply</p>
  </div></body></html>`;
}

function incidentBlock(incident, now) {
  return `<div style="border-left:4px solid ${incident.tier === 'TIER_1' ? '#CC3300' : '#F5A623'};padding:8px 0 8px 12px;margin:0 0 14px;">
    <p style="margin:0;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#6a7f93;">${incident.tier} · ${incident.key}</p>
    <p style="margin:2px 0 0;font-weight:bold;">${incident.summary || ''}</p>
    <p style="margin:4px 0 0;font-size:13px;color:#41556a;white-space:pre-line;">${incident.detail || ''}</p>
    <p style="margin:4px 0 0;font-size:12px;color:#8a8a8a;">open ${ageLabel(incident.first_seen_at, now)}</p>
  </div>`;
}

async function sendMail(subject, html) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.error('watchdogRun: RESEND_API_KEY is not set — no email sent');
    return false;
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: OWNER_EMAIL,
      subject,
      html,
      headers: { 'User-Agent': USER_AGENT },
    });
    if (error) {
      console.error('watchdogRun: Resend rejected the email', error);
      return false;
    }
    return true;
  } catch (err) {
    console.error('watchdogRun: email failed', err?.message);
    return false;
  }
}

// Twilio account resource — the only check that leaves the building.
async function twilioProbe() {
  const sid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
  const token = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
  if (!sid || !token) return { down: true, reason: 'Twilio credentials are not configured' };
  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: {
        Authorization: `Basic ${btoa(`${sid}:${token}`)}`,
        'User-Agent': USER_AGENT,
      },
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401 || res.status === 403) {
      // Twilio explains itself here, and that explanation is the umbrella reason
      // the refused texts carry ("account … is not active").
      const detail = await res
        .json()
        .then((d) => String(d?.message || '').replace(sid, '').replace(/\s+/g, ' ').trim())
        .catch(() => '');
      return { down: true, reason: `auth failed (${res.status})${detail ? ` — ${detail}` : ''}` };
    }
    if (!res.ok) return { down: true, reason: `account API returned ${res.status}` };
    const data = await res.json();
    const status = String(data?.status || 'unknown');
    if (status !== 'active') return { down: true, reason: `account status "${status}"` };
    return { down: false, reason: 'active' };
  } catch (err) {
    return { down: true, reason: `probe failed: ${err?.message || 'unknown error'}` };
  }
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const dryRun = body?.dry_run === true;

    // Called from the scheduled workflow with no user session. A signed-in
    // caller must be an admin; anyone else is treated as a scheduled run and held
    // to one real sweep per cadence window. A dry run only reads, so it may
    // repeat — that is how it gets verified against live data.
    if (dryRun) {
      const caller = await maintenanceCaller(base44, req, body);
      if (!caller.ok) return caller.error;
    } else {
      const gate = await maintenanceGate(base44, req, body, { functionName: 'watchdogRun', windowMs: RUN_WINDOW_MS });
      if (!gate.ok) return gate.error;
    }

    const now = Date.now();
    const nowIso = new Date(now).toISOString();
    const ct = ctParts(new Date(now));
    const db = base44.asServiceRole.entities;

    const menuRows = rows(await db.MenuSetting.filter({}, { sort: '-updated_date', limit: 5 }));
    const menuSetting = menuRows.find((r) => r.id === LIVE_MENU_SETTING_ID) || menuRows[0] || {};

    const since60 = new Date(now - HOUR).toISOString();
    const since90 = new Date(now - 90 * MIN).toISOString();
    const since6h = new Date(now - ORDER_LOOKBACK).toISOString();
    // A queued text only counts as stuck while it could still be delivered today:
    // the 200 rows left queued by the October outage are history, not a live incident.
    const since24h = new Date(now - DAY).toISOString();

    const [hourlyRes, lastOrderRes, orders6hRes, cardRes, syncRes, smsRes, queuedRes, orders90Res, newsletterRes, pushRes, subRes, prevRunRes] =
      await Promise.all([
        db.HourlyCount.filter({}, { sort: '-created_date', limit: 1 }),
        db.Order.filter({}, { sort: '-created_date', limit: 1 }),
        db.Order.filter({ created_date: { $gte: since6h } }, { sort: '-created_date', limit: 100 }),
        db.CardPaymentLog.filter({ created_date: { $gte: since60 } }, { sort: '-created_date', limit: 100 }),
        db.SquareSyncLog.filter({ created_date: { $gte: since60 } }, { sort: '-created_date', limit: 100 }),
        db.SmsDeliveryLog.filter({ created_date: { $gte: since60 } }, { sort: '-created_date', limit: 200 }),
        db.SmsDeliveryLog.filter({ status: 'queued', created_date: { $gte: since24h } }, { sort: '-created_date', limit: 100 }),
        db.Order.filter({ created_date: { $gte: since90 } }, { sort: '-created_date', limit: 100 }),
        db.NewsletterSend.filter({ created_date: { $gte: since60 } }, { sort: '-created_date', limit: 100 }),
        db.PushLog.filter({ created_date: { $gte: since60 } }, { sort: '-created_date', limit: 100 }),
        db.PushSubscription.filter({}, { limit: 200 }),
        db.WatchdogRun.filter({}, { sort: '-ran_at', limit: 1 }),
      ]);

    const candidates = [];
    const seenKeys = new Set();
    const flaggedChecks = [];
    const notes = [];
    const addCandidate = (key, tier, summary, detail, checkId) => {
      candidates.push({ key, tier, summary, detail });
      seenKeys.add(key);
      if (checkId && !flaggedChecks.includes(checkId)) flaggedChecks.push(checkId);
    };

    // ── a. SYNC HEARTBEAT ────────────────────────────────────────────────────
    const newestHourly = rows(hourlyRes)[0] || null;
    const newestOrder = rows(lastOrderRes)[0] || null;
    const hours = storeWindow(menuSetting, ct);
    const ordersIn90 = rows(orders90Res).filter((o) => Date.parse(o.created_date || '') >= now - 90 * MIN);
    const hourlyAgeMin = newestHourly ? Math.round((now - Date.parse(newestHourly.created_date || '')) / MIN) : null;
    const heartbeatGates = {
      ordering_enabled: menuSetting?.ordering_enabled !== false,
      store_hours: hours.open,
      order_activity: ordersIn90.length > 0,
      hourly_stale: hourlyAgeMin == null || hourlyAgeMin > 90,
    };
    const heartbeatFailing = Object.values(heartbeatGates).every(Boolean);
    const prevRun = rows(prevRunRes)[0] || null;
    const prevFlagged = String(prevRun?.checks_run || '').split('flagged:')[1] || '';
    const heartbeatConfirmed = prevFlagged.includes('syncHeartbeat');

    if (heartbeatFailing) {
      // Still counting as failing this run, so an open incident is kept alive.
      seenKeys.add('sync_heartbeat');
      if (heartbeatConfirmed) {
        addCandidate(
          'sync_heartbeat',
          'TIER_2',
          `Hourly counts have not updated in ${hourlyAgeMin == null ? 'over 90' : hourlyAgeMin} minutes while the store is taking orders`,
          `Orders in the last 90 minutes: ${ordersIn90.length}\nNewest hourly count: ${newestHourly?.created_date || 'none'}\nNewest order: ${newestOrder?.created_date || 'none'}\nStore hours today: ${hours.label}`,
          'syncHeartbeat',
        );
      } else {
        notes.push('Sync heartbeat failed once — holding for a second consecutive run before opening an incident.');
      }
    }

    // ── b. UNALERTED PAID ORDERS (TIER 1) ────────────────────────────────────
    const orders6h = rows(orders6hRes);
    const unalerted = orders6h.filter((o) => {
      if (o.payment_status !== 'paid' || o.order_source === 'in_store') return false;
      const age = now - Date.parse(o.created_date || '');
      return age > UNALERTED_AFTER_MIN * MIN && (!o.square_order_id || !o.staff_alert_sent_at);
    });
    if (unalerted.length) {
      addCandidate(
        'unalerted_paid',
        'TIER_1',
        `${unalerted.length} paid online order${unalerted.length === 1 ? '' : 's'} not confirmed into Square or not alerted to staff`,
        unalerted
          .slice(0, 6)
          .map((o) => `#${o.order_number || o.id} ${o.customer_name || ''} — ${!o.square_order_id ? 'no Square order' : 'no staff alert'} (${ageLabel(o.created_date, now)} old)`)
          .join('\n'),
        'unalertedPaid',
      );
    }

    // ── c. CARD FAILURES (TIER 1) ────────────────────────────────────────────
    const cardFails = rows(cardRes).filter((r) => ['declined', 'unsettled', 'error'].includes(r.outcome));
    if (cardFails.length) {
      const byOutcome = cardFails.reduce((acc, r) => {
        acc[r.outcome] = (acc[r.outcome] || 0) + 1;
        return acc;
      }, {});
      addCandidate(
        'card_failures',
        'TIER_1',
        `${cardFails.length} card payment failure${cardFails.length === 1 ? '' : 's'} in the last hour`,
        `${Object.entries(byOutcome).map(([k, v]) => `${k}: ${v}`).join(' · ')}\nLatest: ${cardFails[0].response_message || cardFails[0].detail || 'no message'} (order #${cardFails[0].order_number || '—'})`,
        'cardFailures',
      );
    }

    // ── d. SYNC ERRORS, one incident per error signature ─────────────────────
    const syncFails = rows(syncRes).filter((r) => r.status === 'failed');
    const syncBySignature = new Map();
    for (const row of syncFails) {
      const sig = errorSignature(row.error_message);
      const entry = syncBySignature.get(sig) || { count: 0, orders: [], sample: row.error_message || sig };
      entry.count += 1;
      if (row.order_number) entry.orders.push(`#${row.order_number}`);
      syncBySignature.set(sig, entry);
    }
    for (const [sig, entry] of syncBySignature) {
      addCandidate(
        `square_sync_${keySlug(sig)}`,
        'TIER_2',
        `${entry.count} Square sync failure${entry.count === 1 ? '' : 's'} in the last hour`,
        `Signature: ${sig}\nLatest message: ${String(entry.sample).slice(0, 200)}${entry.orders.length ? `\nOrders: ${entry.orders.slice(0, 8).join(', ')}` : ''}`,
        'syncErrors',
      );
    }

    // ── e. CUSTOMER TEXTS ────────────────────────────────────────────────────
    const textFails = rows(smsRes).filter((r) => ['failed', 'undelivered'].includes(r.status));
    const twilioUmbrella = textFails.filter(
      (r) => /is not active/i.test(String(r.reason || '')) || String(r.error_code || '') === '20003',
    );
    const perRecordFails = textFails.filter((r) => !twilioUmbrella.includes(r));
    if (perRecordFails.length) {
      addCandidate(
        'sms_failed',
        'TIER_2',
        `${perRecordFails.length} customer text${perRecordFails.length === 1 ? '' : 's'} failed to send in the last hour`,
        `${perRecordFails
          .slice(0, 6)
          .map((r) => `#${r.order_number || r.order_id} ${r.milestone} — ${r.reason || `error ${r.error_code || 'unknown'}`}`)
          .join('\n')}\nids: ${perRecordFails.slice(0, 40).map((r) => r.id).join(',')}`,
        'customerTexts',
      );
    }
    const stuckQueued = rows(queuedRes).filter((r) => now - Date.parse(r.created_date || '') > HOUR);
    if (stuckQueued.length) {
      addCandidate(
        'sms_queued',
        'TIER_2',
        `${stuckQueued.length} customer text${stuckQueued.length === 1 ? '' : 's'} stuck in queue for over an hour`,
        `${stuckQueued
          .slice(0, 6)
          .map((r) => `#${r.order_number || r.order_id} ${r.milestone} — queued ${ageLabel(r.created_date, now)}`)
          .join('\n')}\nids: ${stuckQueued.slice(0, 40).map((r) => r.id).join(',')}`,
        'customerTexts',
      );
    }

    // ── f. MISSING RECEIPTS (TIER 1) ─────────────────────────────────────────
    const orders90 = rows(orders90Res);
    const receiptWindow = orders90.filter((o) => {
      const ageMin = (now - Date.parse(o.created_date || '')) / MIN;
      return ageMin >= RECEIPT_FROM_MIN && ageMin <= RECEIPT_TO_MIN;
    });
    const receiptMissing = receiptWindow.filter(
      (o) =>
        (o.payment_status === 'paid' || o.pay_cash_on_pickup === true) &&
        o.order_source !== 'in_store' &&
        !['in_store', 'dine_in'].includes(o.order_type) &&
        realEmail(o.customer_email) &&
        !o.confirmation_email_sent_at,
    );
    if (receiptMissing.length) {
      addCandidate(
        'receipt_missing',
        'TIER_1',
        `${receiptMissing.length} order${receiptMissing.length === 1 ? '' : 's'} went ${RECEIPT_FROM_MIN}–${RECEIPT_TO_MIN} minutes with no confirmation email`,
        receiptMissing
          .slice(0, 6)
          .map((o) => `#${o.order_number || o.id} ${o.customer_name || ''} <${o.customer_email}> — ${ageLabel(o.created_date, now)} old`)
          .join('\n'),
        'missingReceipts',
      );
    }

    // ── g. CUSTOMER UNNOTIFIED (TIER 1) ──────────────────────────────────────
    if (receiptMissing.length) {
      const ids = receiptMissing.map((o) => o.id);
      const smsForOrders = rows(
        await db.SmsDeliveryLog.filter({ order_id: { $in: ids } }, { sort: '-created_date', limit: 200 }),
      );
      const unnotified = receiptMissing.filter((o) => {
        const row = smsForOrders.find((s) => s.order_id === o.id && s.milestone === 'confirmed');
        if (!row) return true; // no status text at all — the channel was skipped
        if (['failed', 'undelivered'].includes(row.status)) return true;
        return ['failed', 'skipped'].includes(row.email_fallback);
      });
      if (unnotified.length) {
        addCandidate(
          'customer_unnotified',
          'TIER_1',
          `${unnotified.length} customer${unnotified.length === 1 ? '' : 's'} heard from no channel at all`,
          unnotified
            .slice(0, 6)
            .map((o) => `#${o.order_number || o.id} ${o.customer_name || ''} <${o.customer_email}> — no confirmation email, status text failed or skipped (${ageLabel(o.created_date, now)} old)`)
            .join('\n'),
          'customerUnnotified',
        );
      }
    }

    // ── h. BULK SENDS ────────────────────────────────────────────────────────
    const bulkFails = rows(newsletterRes).filter((r) => r.status === 'failed' || String(r.error || '').trim());
    if (bulkFails.length) {
      const subjects = [...new Set(bulkFails.map((r) => r.subject || '(no subject)'))];
      addCandidate(
        'newsletter_bulk',
        'TIER_2',
        `${bulkFails.length} newsletter send${bulkFails.length === 1 ? '' : 's'} failed in the last hour`,
        `Subjects: ${subjects.slice(0, 4).join(' · ')}\nLatest error: ${String(bulkFails[0].error || 'unknown').slice(0, 200)}`,
        'bulkSends',
      );
    }

    // ── i. PUSH ──────────────────────────────────────────────────────────────
    const pushFails = rows(pushRes).filter(
      (r) => r.status === 'failed' || r.status === 'partial' || Number(r.error_count || 0) > 0,
    );
    const ownerEmails = new Set([OWNER_EMAIL, 'wesley@flavor-isle.com']);
    const customerSubs = rows(subRes).filter((s) => {
      const email = String(s.email || '').toLowerCase();
      return email && !ownerEmails.has(email) && !email.endsWith('@flavorisle.com');
    });
    if (pushFails.length && customerSubs.length > 0) {
      addCandidate(
        'push_failures',
        'TIER_2',
        `${pushFails.length} push broadcast${pushFails.length === 1 ? '' : 's'} failed in the last hour`,
        `Customer subscriptions: ${customerSubs.length}\nLatest: ${pushFails[0].title || '(untitled)'} — ${pushFails[0].sent_count ?? 0} of ${pushFails[0].recipient_count ?? 0} delivered`,
        'push',
      );
    } else if (pushFails.length) {
      notes.push(
        `Push is failing (${pushFails.length} broadcasts in the last hour) but no customer is subscribed — informational only, no incident.`,
      );
    }

    // ── j. TWILIO PROBE (merged with the text umbrella) ──────────────────────
    const twilio = await twilioProbe();
    if (twilio.down || twilioUmbrella.length) {
      addCandidate(
        'twilio',
        'TIER_2',
        twilio.down ? `Twilio account is not usable (${twilio.reason})` : `${twilioUmbrella.length} customer texts refused by Twilio`,
        `${twilio.down ? `Account probe: ${twilio.reason}` : 'Account probe: active'}\n${
          twilioUmbrella.length
            ? `Refused texts in the last hour: ${twilioUmbrella.length}\nLatest reason: ${twilioUmbrella[0].reason || 'error 20003'}`
            : 'No refused texts in the last hour.'
        }`,
        'twilioProbe',
      );
    }

    // ── incidents: open, refresh, clear ──────────────────────────────────────
    const openRows = rows(await db.WatchdogIncident.filter({ status: 'open' }, { sort: '-first_seen_at', limit: 200 }));
    const openByKey = new Map(openRows.map((r) => [r.key, r]));

    const openedKeys = [];
    const clearedKeys = [];
    const newTier1 = [];
    const recoveredTier1 = [];
    const openedIncidents = [];

    for (const candidate of candidates) {
      const tier = TIER_1_KEYS.has(candidate.key) ? 'TIER_1' : candidate.tier || 'TIER_2';
      const existing = openByKey.get(candidate.key);
      if (existing) {
        if (!dryRun) {
          await db.WatchdogIncident.update(existing.id, {
            tier,
            summary: candidate.summary,
            detail: candidate.detail,
            last_seen_at: nowIso,
          });
        }
        existing.summary = candidate.summary;
        existing.detail = candidate.detail;
        existing.tier = tier;
        existing.last_seen_at = nowIso;
      } else {
        openedKeys.push(candidate.key);
        openedIncidents.push({ key: candidate.key, tier, summary: candidate.summary, detail: candidate.detail });
        if (!dryRun) {
          const created = await db.WatchdogIncident.create({
            key: candidate.key,
            tier,
            status: 'open',
            summary: candidate.summary,
            detail: candidate.detail,
            first_seen_at: nowIso,
            last_seen_at: nowIso,
          });
          if (tier === 'TIER_1' && created?.id) newTier1.push({ ...candidate, tier, id: created.id });
        } else if (tier === 'TIER_1') {
          newTier1.push({ ...candidate, tier });
        }
      }
    }

    for (const incident of openRows) {
      if (seenKeys.has(incident.key)) continue;
      let shouldClear = false;
      let reason = '';

      if (RECOVERY_CLEAR_KEYS.has(incident.key)) {
        shouldClear = true;
        reason = incident.key === 'twilio' ? 'Twilio answered again' : 'hourly counts are landing again';
      } else if (DELIVERY_CLEAR_KEYS.has(incident.key)) {
        const ids = (String(incident.detail || '').match(/ids: ([a-z0-9_,\s]+)/i)?.[1] || '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (!ids.length) {
          shouldClear = true;
          reason = 'no failing rows recorded';
        } else {
          const still = rows(await db.SmsDeliveryLog.filter({ id: { $in: ids } }, { limit: 100 })).filter((r) =>
            incident.key === 'sms_queued' ? r.status === 'queued' : ['failed', 'undelivered'].includes(r.status),
          );
          shouldClear = still.length === 0;
          reason = shouldClear ? 'every recorded text reached a final delivered state' : '';
        }
      } else {
        const quietFor = now - Date.parse(incident.last_seen_at || incident.first_seen_at || nowIso);
        shouldClear = quietFor >= QUIET_HOURS;
        reason = shouldClear ? `${Math.round(quietFor / HOUR)} quiet hours` : '';
      }

      if (!shouldClear) continue;
      clearedKeys.push(incident.key);
      if (incident.tier === 'TIER_1') recoveredTier1.push(incident);
      if (!dryRun) {
        await db.WatchdogIncident.update(incident.id, { status: 'cleared', cleared_at: nowIso });
      }
      if (reason) notes.push(`Cleared ${incident.key} — ${reason}.`);
    }

    // ── email ────────────────────────────────────────────────────────────────
    let emailSent = false;
    let emailKind = 'none';
    let emailNote = 'none sent';

    if (dryRun) {
      emailNote = newTier1.length || recoveredTier1.length
        ? `dry run — would have emailed: ${newTier1.length} new TIER 1, ${recoveredTier1.length} TIER 1 recovered`
        : 'dry run — nothing to email';
    } else {
      const blocks = [];
      if (newTier1.length) {
        blocks.push(
          `${newTier1.map((i) => incidentBlock(i, now)).join('')}`,
        );
      }
      if (recoveredTier1.length) {
        blocks.push(
          `<p style="margin:18px 0 6px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#6a7f93;">Recovered</p>${recoveredTier1
            .map((i) => `<p style="margin:0 0 8px;"><strong>${i.key}</strong> cleared after ${ageLabel(i.first_seen_at, now)} — ${i.summary || ''}</p>`)
            .join('')}`,
        );
      }

      if (blocks.length) {
        const subject = newTier1.length
          ? `Flavor Isle watchdog: ${newTier1.length} new TIER 1 issue${newTier1.length === 1 ? '' : 's'}`
          : 'Flavor Isle watchdog: TIER 1 recovered';
        const sent = await sendMail(subject, emailShell(subject, blocks.join('\n')));
        if (sent) {
          emailSent = true;
          emailKind = newTier1.length ? 'alert' : 'recovery';
          emailNote = `${emailKind} email sent`;
          for (const incident of newTier1) {
            if (!incident.id) continue;
            await db.WatchdogIncident.update(incident.id, { last_alert_at: nowIso });
          }
        } else {
          emailNote = 'email failed to send';
        }
      }

      // Daily summary: 9:00–10:00 AM store time, once a day, and never instead of
      // an incident email in the same run (the next run inside the hour catches it).
      if (!emailSent && ct.hour === 9) {
        const dayStart = new Date(now - (ct.hour * 60 + ct.minute) * MIN).toISOString();
        const already = rows(await db.WatchdogRun.filter({ email_kind: 'daily' }, { sort: '-ran_at', limit: 5 })).some(
          (r) => Date.parse(r.ran_at || '') >= Date.parse(dayStart),
        );
        if (!already) {
          const openNow = rows(await db.WatchdogIncident.filter({ status: 'open' }, { sort: '-first_seen_at', limit: 200 }));
          const cleared24 = rows(
            await db.WatchdogIncident.filter({ status: 'cleared' }, { sort: '-cleared_at', limit: 200 }),
          ).filter((r) => Date.parse(r.cleared_at || '') >= now - DAY);

          const inner = [
            `<p style="margin:0 0 10px;">${openNow.length} open incident${openNow.length === 1 ? '' : 's'} right now.</p>`,
            openNow.length
              ? openNow.map((i) => incidentBlock(i, now)).join('')
              : `<p style="margin:0 0 14px;color:#41556a;">Nothing open — every check is quiet.</p>`,
            `<p style="margin:18px 0 6px;font-size:11px;letter-spacing:1.5px;text-transform:uppercase;color:#6a7f93;">Recovered in the last 24 hours</p>`,
            cleared24.length
              ? cleared24.map((i) => `<p style="margin:0 0 8px;"><strong>${i.key}</strong> (${i.tier}) cleared ${ageLabel(i.cleared_at, now)} ago</p>`).join('')
              : `<p style="margin:0;color:#41556a;">Nothing recovered.</p>`,
          ].join('\n');

          const sent = await sendMail('Flavor Isle watchdog: daily summary', emailShell('Daily watchdog summary', inner));
          if (sent) {
            emailSent = true;
            emailKind = 'daily';
            emailNote = 'daily summary sent';
          } else {
            emailNote = 'daily summary failed to send';
          }
        }
      }
    }

    // ── the run record ───────────────────────────────────────────────────────
    const summaryLine = [
      dryRun ? 'DRY RUN (no incidents written, no email).' : '',
      `${candidates.length} live finding${candidates.length === 1 ? '' : 's'}: ${candidates.map((c) => `${c.key} (${c.tier})`).join(', ') || 'none'}.`,
      openedKeys.length ? `Opened: ${openedKeys.join(', ')}.` : 'Opened: none.',
      clearedKeys.length ? `Cleared: ${clearedKeys.join(', ')}.` : 'Cleared: none.',
      `Email: ${emailNote}.`,
      ...notes,
    ]
      .filter(Boolean)
      .join(' ');

    const checksRun = `ran:${CHECK_IDS.join(',')}; flagged:${flaggedChecks.join(',')}`;

    // The run record is written on dry runs too — it is the account of what was
    // seen, and a dry run never writes an incident or sends an email.
    const run = await db.WatchdogRun.create({
      ran_at: nowIso,
      checks_run: checksRun,
      opened: dryRun ? '' : openedKeys.join(', '),
      cleared: dryRun ? '' : clearedKeys.join(', '),
      email_sent: emailSent,
      email_kind: emailKind,
      note: summaryLine,
    });
    const runId = run?.id || null;

    return Response.json({
      ok: true,
      dry_run: dryRun,
      ran_at: nowIso,
      store_local: `${ct.dateKey} ${minutesLabel(ct.minutes)} CT`,
      store_hours: hours.label,
      heartbeat_gates: heartbeatGates,
      checks: {
        sync_heartbeat: { failing: heartbeatFailing, confirmed_by_previous_run: heartbeatConfirmed, newest_hourly_age_min: hourlyAgeMin },
        unalerted_paid: unalerted.length,
        card_failures: cardFails.length,
        square_sync_failures: syncFails.length,
        text_failures: perRecordFails.length,
        twilio_umbrella_texts: twilioUmbrella.length,
        text_stuck_queued: stuckQueued.length,
        orders_in_receipt_window: receiptWindow.length,
        receipts_missing: receiptMissing.length,
        newsletter_failures: bulkFails.length,
        push_failures: pushFails.length,
        customer_push_subscriptions: customerSubs.length,
        twilio: twilio.down ? 'down' : 'active',
        twilio_reason: twilio.reason,
      },
      counts: {
        findings: candidates.length,
        opened: openedKeys.length,
        cleared: clearedKeys.length,
        open_now: openByKey.size + openedKeys.length - clearedKeys.length,
        tier1_new: newTier1.length,
        tier1_recovered: recoveredTier1.length,
        email_sent: emailSent,
        email_kind: emailKind,
      },
      opened: openedKeys,
      cleared: clearedKeys,
      findings: candidates.map((c) => ({ key: c.key, tier: TIER_1_KEYS.has(c.key) ? 'TIER_1' : 'TIER_2', summary: c.summary })),
      open_incidents: candidates.map((c) => c.key),
      notes,
      checks_run: checksRun,
      run_id: runId,
      note: summaryLine,
    });
  } catch (error) {
    console.error('watchdogRun failed', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}