import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';
import { inHuntWindow, HUNT_START_DATE, HUNT_END_DATE } from '../../shared/smashieHuntWindow.ts';


// Find Smashie — claim the daily win. The FIRST signed-in caller
// of the day becomes the winner. Repeat calls by the same winner
// just record their prize choice. Everyone else gets already_found.

const TZ = 'America/Chicago';
const VAMPIRE_SWITCH = 17 * 60; // 5:00 PM

function storeNow() {
  const parts = {};
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())) parts[p.type] = p.value;
  const hour = parseInt(parts.hour, 10) % 24;
  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    month: `${parts.year}-${parts.month}`,
    minutes: hour * 60 + parseInt(parts.minute, 10),
  };
}

function toMin(t) {
  const [h, m] = (t || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

// The name the winner board, the site banner and the Instagram reveal all show.
//
// An account whose name did not resolve to a real one arrives here as an email
// username or a single run-together token ("wesleyrbooker1"), and that is not
// something to put in front of the town. Only a name that looks like a name is
// used; anything else becomes "A lucky finder".
function displayInitial(user) {
  const full = (user?.full_name || user?.name || '').trim();
  if (!full || full.includes('@') || !/\s/.test(full)) {
    const single = full.split(/\s+/)[0] || '';
    // Letters, apostrophes and hyphens only, no digits — a real single-word name.
    if (/^[A-Za-z][A-Za-z'-]*$/.test(single)) {
      return single.charAt(0).toUpperCase() + single.slice(1).toLowerCase();
    }
    return 'A lucky finder';
  }
  const parts = full.split(/\s+/);
  const first = parts[0];
  const last = parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : '';
  return `${first}${last}`;
}

// Does this stored win belong to the caller? A win is written with the service
// role on the player's behalf, so the record's own owner fields belong to the
// service account — the player is identified by winner_user_id, which is what
// makes "same winner, updating their prize" and the monthly win limit work.
function isMine(winner, user) {
  if (winner?.winner_user_id) return winner.winner_user_id === user?.id;
  if (winner?.created_by_id && user?.id) return winner.created_by_id === user.id;
  return !!winner?.created_by && winner.created_by === user?.email;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Must be signed in to play' }, { status: 401 });

    const { prize_choice } = await req.json().catch(() => ({}));
    const { dateStr, month, minutes } = storeNow();

    const settings = (await base44.asServiceRole.entities.FindSmashieSettings.list())[0] || {
      active: true, start_date: HUNT_START_DATE, end_date: HUNT_END_DATE,
      win_limit_per_customer: 1, preview_mode: true,
    };
    if (!settings.active) return Response.json({ off: true });
    // Wins only count inside the locked official window (Oct 15 – Oct 31), so a
    // stale saved date range can never open the game early or run it late. Test
    // mode (the admin Preview switch) extends it before the hunt opens, but never
    // past the last hunt day — a switch left on cannot take wins in November.
    const previewing = !!settings.preview_mode && dateStr <= HUNT_END_DATE;
    if (!inHuntWindow(dateStr) && !previewing) {
      return Response.json({ off: true });
    }

    // Only claims count during open hours.
    let hours = null;
    try {
      const ms = (await base44.asServiceRole.entities.MenuSetting.list())[0];
      const dayIdx = new Date().toLocaleDateString('en-US', { timeZone: TZ, weekday: 'long' }).toLowerCase();
      const bh = ms?.business_hours?.[dayIdx];
      if (bh && !bh.closed) hours = bh;
    } catch (e) { /* defaults below */ }
    if (!settings.preview_mode) {
      const open = toMin(hours?.open || '10:30');
      const close = toMin(hours?.close || '20:00');
      if (minutes < open || minutes >= close) return Response.json({ off: true });
    }

    const phase = minutes < VAMPIRE_SWITCH ? 'pumpkin' : 'vampire';
    const validChoice = ['points', 'milkshake'].includes(prize_choice) ? prize_choice : null;

    // Existing winner today?
    const existing = await base44.asServiceRole.entities.FindSmashieWinner
      .filter({ game_date: dateStr });

    if (existing && existing.length > 0) {
      const w = existing[0];
      // Same winner updating their prize choice — allowed.
      if (isMine(w, user) && validChoice) {
        await base44.asServiceRole.entities.FindSmashieWinner.update(w.id, { prize_choice: validChoice });
        return Response.json({ you_won: true, prize_choice: validChoice });
      }
      return Response.json({ already_found: true, winner_name: w.winner_name });
    }

    // Win limit: has this user already won this month?
    const limit = Number(settings.win_limit_per_customer ?? 1);
    if (limit > 0) {
      const all = await base44.asServiceRole.entities.FindSmashieWinner.list('-game_date', 200);
      const mine = all.filter((w) => isMine(w, user) && (w.game_date || '').startsWith(month));
      if (mine.length >= limit) return Response.json({ limit_reached: true });
    }

    // This user is today's winner.
    const foundAt = new Date();
    await base44.asServiceRole.entities.FindSmashieWinner.create({
      game_date: dateStr,
      phase,
      winner_name: displayInitial(user),
      // The player this win belongs to — the record's own owner fields are the
      // service account's, so this is the only link back to the winner.
      winner_user_id: user.id,
      prize_choice: validChoice || '',
      // The moment of the find, for the winner board's Time column and the
      // "found by ... at ..." announcement.
      found_at: foundAt.toISOString(),
      found_time: foundAt.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }),
    });

    return Response.json({ you_won: true, prize_choice: validChoice || '' });
  } catch (error) {
    console.error('claimSmashieFind error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});