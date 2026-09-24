import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

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

function displayInitial(user) {
  const full = (user?.full_name || user?.name || '').trim();
  if (!full) return 'A lucky finder';
  const parts = full.split(/\s+/);
  const first = parts[0];
  const last = parts.length > 1 ? ` ${parts[parts.length - 1][0]}.` : '';
  return `${first}${last}`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Must be signed in to play' }, { status: 401 });

    const { prize_choice } = await req.json().catch(() => ({}));
    const { dateStr, month, minutes } = storeNow();

    const settings = (await base44.asServiceRole.entities.FindSmashieSettings.list())[0] || {
      active: true, start_date: '2026-10-01', end_date: '2026-10-31', win_limit_per_customer: 1,
    };
    if (!settings.active) return Response.json({ off: true });
    if (dateStr < (settings.start_date || '2026-10-01') || dateStr > (settings.end_date || '2026-10-31')) {
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
    const open = toMin(hours?.open || '10:30');
    const close = toMin(hours?.close || '20:00');
    if (minutes < open || minutes >= close) return Response.json({ off: true });

    const phase = minutes < VAMPIRE_SWITCH ? 'pumpkin' : 'vampire';
    const validChoice = ['points', 'milkshake'].includes(prize_choice) ? prize_choice : null;

    // Existing winner today?
    const existing = await base44.asServiceRole.entities.FindSmashieWinner
      .filter({ game_date: dateStr });

    if (existing && existing.length > 0) {
      const w = existing[0];
      // Same winner updating their prize choice — allowed.
      if (w.created_by === user.id && validChoice) {
        await base44.asServiceRole.entities.FindSmashieWinner.update(w.id, { prize_choice: validChoice });
        return Response.json({ you_won: true, prize_choice: validChoice });
      }
      return Response.json({ already_found: true, winner_name: w.winner_name });
    }

    // Win limit: has this user already won this month?
    const limit = Number(settings.win_limit_per_customer ?? 1);
    if (limit > 0) {
      const all = await base44.asServiceRole.entities.FindSmashieWinner.list('-game_date', 200);
      const mine = all.filter((w) => w.created_by === user.id && (w.game_date || '').startsWith(month));
      if (mine.length >= limit) return Response.json({ limit_reached: true });
    }

    // This user is today's winner.
    const created = await base44.asServiceRole.entities.FindSmashieWinner.create({
      game_date: dateStr,
      phase,
      winner_name: displayInitial(user),
      prize_choice: validChoice || '',
    });

    return Response.json({ you_won: true, prize_choice: validChoice || '' });
  } catch (error) {
    console.error('claimSmashieFind error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
