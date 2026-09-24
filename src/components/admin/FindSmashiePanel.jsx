import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import {
  getHuntSpot, phaseLabel, todayStr,
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
        active: false, start_date: '2026-10-01', end_date: '2026-10-31', win_limit_per_customer: 1,
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
      if (settings.id) {
        await base44.entities.FindSmashieSettings.update(settings.id, {
          active: settings.active,
          start_date: settings.start_date,
          end_date: settings.end_date,
          win_limit_per_customer: Number(settings.win_limit_per_customer),
        });
      } else {
        const created = await base44.entities.FindSmashieSettings.create({
          active: settings.active,
          start_date: settings.start_date,
          end_date: settings.end_date,
          win_limit_per_customer: Number(settings.win_limit_per_customer),
        });
        setSettings({ ...settings, id: created.id });
      }
      setSavedAt(new Date());
    } finally {
      setSaving(false);
    }
  }

  if (!settings) return <p className="text-muted-foreground">Loading game settings…</p>;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card p-5">
        <h3 className="font-heading uppercase text-xl text-obsidian-roast mb-4">
          🎃 Find Smashie — Halloween Hide &amp; Seek
        </h3>

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
            <span className="font-semibold">Start date</span>
            <input
              type="date"
              className="w-full rounded-md border bg-background p-2"
              value={settings.start_date}
              onChange={(e) => setSettings({ ...settings, start_date: e.target.value })}
            />
          </label>
          <label className="text-sm space-y-1">
            <span className="font-semibold">End date</span>
            <input
              type="date"
              className="w-full rounded-md border bg-background p-2"
              value={settings.end_date}
              onChange={(e) => setSettings({ ...settings, end_date: e.target.value })}
            />
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
