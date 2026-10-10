import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  getHuntSpot, phaseLabel, todayStr, inDateRange, formatHuntDate,
  resolveHuntWindow, HUNT_START_DATE, HUNT_END_DATE,
} from '@/lib/findSmashie';

// Admin panel for the Find Smashie Halloween Hide & Seek game:
// master toggle, date range, win limit, today's hiding spots,
// and the winners log.
export default function FindSmashiePanel() {
  const [settings, setSettings] = useState(null);
  const [winners, setWinners] = useState([]);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const list = await base44.entities.FindSmashieSettings.list();
      const s = list[0] || null;
      if (!cancelled) setSettings(s || {
        active: true, start_date: HUNT_START_DATE, end_date: HUNT_END_DATE,
        win_limit_per_customer: 1, preview_mode: true,
      });
      try {
        const w = await base44.entities.FindSmashieWinner.list('-game_date', 31);
        if (!cancelled) setWinners(w || []);
      } catch (e) { /* entity may not exist yet */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const todaySpots = {
    pumpkin: getHuntSpot({ dateStr: todayStr(), phase: 'pumpkin' }),
    vampire: getHuntSpot({ dateStr: todayStr(), phase: 'vampire' }),
  };

  async function save() {
    setSaving(true);
    try {
      // Dates are saved clamped to the official window, so what's stored always
      // matches what the hunt actually uses (Oct 15 – Nov 1 at the widest).
      const { start, end } = resolveHuntWindow(settings.start_date, settings.end_date);
      const payload = {
        active: settings.active,
        preview_mode: !!settings.preview_mode,
        start_date: start,
        end_date: end,
        win_limit_per_customer: Number(settings.win_limit_per_customer),
      };
      let id = settings.id;
      if (id) {
        await base44.entities.FindSmashieSettings.update(id, payload);
      } else {
        const created = await base44.entities.FindSmashieSettings.create(payload);
        id = created.id;
      }
      setSettings((s) => ({ ...s, id, start_date: start, end_date: end }));
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <p className="text-muted-foreground">Loading game settings…</p>;

  // Saved dates that sit outside the official window — the game ignores them,
  // so the stored record should be brought back in line.
  const datesOffOfficial =
    settings.start_date !== HUNT_START_DATE || settings.end_date !== HUNT_END_DATE;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-heading uppercase text-xl text-obsidian-roast mb-4">
          🎃 Find Smashie — Halloween Hide &amp; Seek
        </h3>

        <div className="rounded-lg border-l-4 border-midnight-cherry bg-midnight-cherry/5 p-3 mb-4">
          <p className="font-semibold text-obsidian-roast">
            Official game window: {formatHuntDate(HUNT_START_DATE)} – {formatHuntDate(HUNT_END_DATE)}, {HUNT_END_DATE.slice(0, 4)}
          </p>
          <p className="text-xs text-muted-foreground">
            The hunt opens {formatHuntDate(HUNT_START_DATE)} and stops after {formatHuntDate(HUNT_END_DATE)} (that last day is
            included). Smashie never hides outside these dates, whatever the date fields below say.
          </p>
        </div>

        {datesOffOfficial && (
          <div className="rounded-lg border border-smashie-yellow bg-smashie-yellow/10 p-3 mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm">
              Saved dates are <strong>{settings.start_date}</strong> → <strong>{settings.end_date}</strong>, outside the
              official window. The game is locked to {HUNT_START_DATE} → {HUNT_END_DATE}.
            </p>
            <button
              className="rounded-md border bg-background px-3 py-1.5 text-sm font-semibold hover:bg-muted"
              onClick={() => setSettings((s) => ({ ...s, start_date: HUNT_START_DATE, end_date: HUNT_END_DATE }))}
            >
              Use official dates
            </button>
          </div>
        )}

        <div className="grid sm:grid-cols-2 gap-4 mb-4">
          <label className="text-sm space-y-1">
            <span className="font-semibold">Game</span>
            <select
              className="w-full rounded-md border bg-background p-2"
              value={settings.active ? 'on' : 'off'}
              onChange={(e) => setSettings({ ...settings, active: e.target.value === 'on' })}
            >
              <option value="off">Off</option>
              <option value="on">On</option>
            </select>
          </label>
          <label className="text-sm space-y-1">
            <span className="font-semibold">Win limit per customer / month (0 = unlimited)</span>
            <input
              type="number" min="0" max="31"
              className="w-full rounded-md border bg-background p-2"
              value={settings.win_limit_per_customer ?? 1}
              onChange={(e) => setSettings({ ...settings, win_limit_per_customer: e.target.value })}
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="font-semibold">Preview mode (ignore open/close hours)</span>
            <select
              className="w-full rounded-md border bg-background p-2"
              value={settings.preview_mode ? 'on' : 'off'}
              onChange={(e) => setSettings({ ...settings, preview_mode: e.target.value === 'on' })}
            >
              <option value="on">On — for testing only</option>
              <option value="off">Off — hide only during open hours</option>
            </select>
            <span className="text-xs text-muted-foreground">Turn OFF before the live October launch.</span>
          </label>
          <label className="text-sm space-y-1">
            <span className="font-semibold">Game opens — first hunt day</span>
            <input
              type="date"
              min={HUNT_START_DATE}
              max={HUNT_END_DATE}
              className="w-full rounded-md border bg-background p-2"
              value={settings.start_date}
              onChange={(e) => setSettings({ ...settings, start_date: e.target.value })}
            />
            <span className="text-xs text-muted-foreground">
              Locked to the official window: the game can't open before {HUNT_START_DATE}.
            </span>
          </label>
          <label className="text-sm space-y-1">
            <span className="font-semibold">Game closes — last hunt day (included)</span>
            <input
              type="date"
              min={HUNT_START_DATE}
              max={HUNT_END_DATE}
              className="w-full rounded-md border bg-background p-2"
              value={settings.end_date}
              onChange={(e) => setSettings({ ...settings, end_date: e.target.value })}
            />
            <span className="text-xs text-muted-foreground">
              Can't run past {HUNT_END_DATE}. Narrowing inside the window is fine — dates save clamped to it.
            </span>
          </label>
        </div>

        <button
          className="rounded-md bg-midnight-cherry text-white px-4 py-2 font-semibold disabled:opacity-50"
          onClick={save} disabled={saving}
        >
          {saving ? 'Saving…' : 'Save game settings'}
        </button>
        {savedAt && <span className="ml-3 text-green-600 text-sm">Saved ✓</span>}
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h4 className="font-semibold mb-3">Today's hiding spots ({todayStr()})</h4>
        {!inDateRange(todayStr(), settings.start_date, settings.end_date) && (
          <p className="text-xs text-muted-foreground mb-3">
            Preview only — the hunt runs {formatHuntDate(HUNT_START_DATE)} – {formatHuntDate(HUNT_END_DATE)}, so Smashie is
            not hidden on the site today.
          </p>
        )}
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted p-3">
            <p className="font-semibold">🎃 {phaseLabel('pumpkin')} <span className="font-normal text-muted-foreground">(open – 5:00 PM)</span></p>
            <p>{todaySpots.pumpkin.page.name} page ({todaySpots.pumpkin.page.path}) — roughly {todaySpots.pumpkin.topPct}% down, {todaySpots.pumpkin.leftPct}% across</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="font-semibold">🧛 {phaseLabel('vampire')} <span className="font-normal text-muted-foreground">(5:00 PM – close, only if unfound)</span></p>
            <p>{todaySpots.vampire.page.name} page ({todaySpots.vampire.page.path}) — roughly {todaySpots.vampire.topPct}% down, {todaySpots.vampire.leftPct}% across</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5">
        <h4 className="font-semibold mb-3">Winners log</h4>
        {winners.length === 0 ? (
          <p className="text-muted-foreground text-sm">No winners yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="p-2">Date</th><th className="p-2">Winner</th><th className="p-2">Costume</th>
                <th className="p-2">Prize</th><th className="p-2">Fulfilled</th>
              </tr>
            </thead>
            <tbody>
              {winners.map((w) => (
                <tr key={w.id} className="border-t">
                  <td className="p-2">{w.game_date}</td>
                  <td className="p-2 font-semibold">{w.winner_name}</td>
                  <td className="p-2">{w.phase === 'vampire' ? '🧛 Vampire' : '🎃 Pumpkin'}</td>
                  <td className="p-2">{w.prize_choice === 'milkshake' ? 'Free milkshake' : w.prize_choice === 'points' ? '100 points' : '—'}</td>
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={!!w.prize_fulfilled}
                      onChange={async (e) => {
                        await base44.entities.FindSmashieWinner.update(w.id, { prize_fulfilled: e.target.checked });
                        setWinners((ws) => ws.map((x) => x.id === w.id ? { ...x, prize_fulfilled: e.target.checked } : x));
                      }}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}