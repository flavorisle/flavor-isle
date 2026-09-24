import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Find Smashie — public state for the hunt banner + sprite.
// Returns whether the game is active, today's open/close hours,
// and today's winner (if any) for the "found by" announcement.

const TZ = 'America/Chicago';

function storeNow() {
  const parts = {};
  for (const p of new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())) parts[p.type] = p.value;
  const hour = parseInt(parts.hour, 10) % 24;
  return {
    dateStr: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: hour * 60 + parseInt(parts.minute, 10),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const settings = (await base44.asServiceRole.entities.FindSmashieSettings.list())[0] || {
      active: true, start_date: '2026-10-01', end_date: '2026-10-31',
    };
    const { dateStr, minutes } = storeNow();

    // Today's business hours from the store settings.
    let hours = null;
    try {
      const ms = (await base44.asServiceRole.entities.MenuSetting.list())[0];
      const dayIdx = new Date().toLocaleDateString('en-US', { timeZone: TZ, weekday: 'long' }).toLowerCase();
      const bh = ms?.business_hours?.[dayIdx];
      if (bh && !bh.closed) hours = { open: bh.open, close: bh.close };
    } catch (e) { /* hours stay null; client falls back to defaults */ }

    // Today's winner, if claimed already.
    let todayWinner = null;
    try {
      const winners = await base44.asServiceRole.entities.FindSmashieWinner
        .filter({ game_date: dateStr });
      const w = winners?.[0];
      if (w) {
        const found = new Date(w.found_at || w.created_date);
        todayWinner = {
          name: w.winner_name || 'a lucky finder',
          time: found.toLocaleTimeString('en-US', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }),
          phase: w.phase,
        };
      }
    } catch (e) { /* winner board stays empty */ }

    return Response.json({
      active: !!settings.active,
      start_date: settings.start_date || '2026-10-01',
      end_date: settings.end_date || '2026-10-31',
      in_hours: hours ? (minutes >= toMin(hours.open) && minutes < toMin(hours.close)) : null,
      hours,
      today_winner: todayWinner,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function toMin(t) {
  const [h, m] = (t || '0:0').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
