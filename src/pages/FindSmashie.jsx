import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { INSTAGRAM_URL, INSTAGRAM_HANDLE, phaseLabel } from '@/lib/findSmashie';

// Public rules + winner board for the Find Smashie game.
export default function FindSmashie() {
  const [winners, setWinners] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await base44.entities.FindSmashieWinner.list('-game_date', 31);
        if (!cancelled) setWinners(list);
      } catch (e) {
        if (!cancelled) setWinners([]);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="text-center mb-8">
        <img
          src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/923d1a767_pumpkin.png"
          alt="Smashie in his pumpkin costume"
          className="w-28 mx-auto mb-4"
        />
        <h1 className="font-heading uppercase text-4xl text-obsidian-roast mb-3">
          🎃 Find Smashie: Halloween Hide &amp; Seek
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Every day in October, Smashie hides somewhere on flavor-isle.com — dressed
          for Halloween and trying his best not to be spotted.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-10">
        <RuleCard step="1" title="Watch for Smashie">
          From open until 5 PM he hides as <strong>Pumpkin Smashie</strong>. If nobody
          finds him by 5 PM, he gets spooked, finds a brand-new spot, and reappears as
          <strong> Vampire Smashie</strong> until close. 🧛
        </RuleCard>
        <RuleCard step="2" title="Sign in to play">
          Anyone can spot him, but only signed-in players can claim the daily win.
          Spotted him? Tap him!
        </RuleCard>
        <RuleCard step="3" title="First finder wins">
          The first signed-in click each day wins. Pick your prize: <strong>100 Star
          Rewards points</strong> on your account, or a <strong>free milkshake</strong> on
          an order you place right then.
        </RuleCard>
        <RuleCard step="4" title="Follow the reveals">
          Each day's winner is posted on Instagram{' '}
          <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" className="underline font-semibold">
            {INSTAGRAM_HANDLE}
          </a>{' '}
          — follow so you don't miss the daily reveal.
        </RuleCard>
      </div>

      <h2 className="font-heading uppercase text-2xl text-obsidian-roast mb-4 text-center">
        🏆 Winner Board
      </h2>
      <div className="rounded-xl border overflow-hidden bg-card">
        {winners === null && (
          <p className="p-6 text-center text-muted-foreground">Loading winners…</p>
        )}
        {winners && winners.length === 0 && (
          <p className="p-6 text-center text-muted-foreground">
            No winners yet — the hunt begins October 1. Could you be first?
          </p>
        )}
        {winners && winners.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr className="text-left">
                <th className="p-3 font-semibold">Date</th>
                <th className="p-3 font-semibold">Found by</th>
                <th className="p-3 font-semibold">Time</th>
                <th className="p-3 font-semibold">Costume</th>
                <th className="p-3 font-semibold">Prize</th>
              </tr>
            </thead>
            <tbody>
              {winners.map((w) => (
                <tr key={w.id} className="border-t">
                  <td className="p-3">{w.game_date}</td>
                  <td className="p-3 font-semibold">{w.winner_name}</td>
                  <td className="p-3">{w.found_time || ''}</td>
                  <td className="p-3">{w.phase === 'vampire' ? '🧛' : '🎃'}</td>
                  <td className="p-3">
                    {w.prize_choice === 'milkshake' ? 'Free milkshake' : w.prize_choice === 'points' ? '100 Star Rewards points' : ''}
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

function RuleCard({ step, title, children }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className="w-6 h-6 rounded-full bg-midnight-cherry text-white text-xs font-bold flex items-center justify-center">
          {step}
        </span>
        <h3 className="font-heading uppercase text-lg text-obsidian-roast">{title}</h3>
      </div>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}