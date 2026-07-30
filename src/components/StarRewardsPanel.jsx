import React from 'react';
import { Zap, TrendingUp, Star, Phone, Gift } from 'lucide-react';

// Rewards tab — shows live Square "Flavor Isle Star Rewards" balance, lifetime
// stars, accrual rule, and the reward tiers configured in the in-store Square
// loyalty program (redeemable at the register).
export default function StarRewardsPanel({ status, loading, onAddPhone }) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
      </div>
    );
  }

  const programName = status?.programName || 'Flavor Isle Star Rewards';
  const balance = status?.balance || 0;
  const lifetime = status?.lifetimePoints || 0;
  const tiers = status?.rewardTiers || [];
  const earnText = status?.earnText;

  if (!status || status.programStatus !== 'ACTIVE') {
    return (
      <div className="card-diner p-8 text-center">
        <Star size={40} className="mx-auto mb-3 text-midnight-cherry" />
        <h2 className="font-heading text-2xl text-obsidian-roast mb-2">{programName}</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Star Rewards sync with your in-store Flavor Isle rewards. Your live balance and rewards will appear here once Square loyalty is connected.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-2 bg-midnight-cherry/10 text-midnight-cherry rounded-full px-3 py-1 mb-2">
          <Star size={14} />
          <span className="text-xs font-heading tracking-widest uppercase">{programName}</span>
        </div>
        <h2 className="font-heading text-2xl text-obsidian-roast">Your Star Rewards</h2>
        <p className="text-sm text-muted-foreground mt-1">
          The same rewards you earn in-store — synced to your online account{earnText ? `. ${earnText}.` : '.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-diner p-6 bg-gradient-to-br from-midnight-cherry/10 to-red-50 border-2 border-midnight-cherry/20">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-midnight-cherry/20 rounded-full flex items-center justify-center">
              <Zap size={24} className="text-midnight-cherry" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Stars Balance</p>
              <p className="font-heading text-4xl text-midnight-cherry mt-1">{Number(balance).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="card-diner p-6 bg-gradient-to-br from-patina-mint/10 to-teal-50 border-2 border-patina-mint/20">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 bg-patina-mint/20 rounded-full flex items-center justify-center">
              <TrendingUp size={24} className="text-patina-mint" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Lifetime Stars</p>
              <p className="font-heading text-4xl text-patina-mint mt-1">{Number(lifetime).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {status.needsPhone && (
        <div className="card-diner p-5 flex items-center gap-3 border-2 border-amber-200 bg-amber-50">
          <Phone size={20} className="text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-heading text-sm text-obsidian-roast">Add a phone number to join Star Rewards</p>
            <p className="text-xs text-muted-foreground mt-0.5">Star Rewards is linked to your phone number, just like in-store. Add one in your profile to start earning.</p>
          </div>
          <button onClick={onAddPhone} className="btn-cherry chrome-hover px-4 py-2 text-sm font-heading whitespace-nowrap tap-44">Add Phone</button>
        </div>
      )}

      <div>
        <h3 className="font-heading text-lg text-obsidian-roast mb-1">Available Rewards</h3>
        <p className="text-sm text-muted-foreground mb-4">Redeem these at the Flavor Isle register right from your Star Rewards balance.</p>
        <div className="space-y-3">
          {tiers.length === 0 ? (
            <div className="card-diner p-6 text-center">
              <Gift size={22} className="mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground italic">No reward tiers are configured in the Square loyalty program yet.</p>
            </div>
          ) : (
            tiers.map((t) => (
              <div key={t.id} className="card-diner p-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-obsidian-roast">{t.name}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{t.description} · {t.scope === 'ITEM' ? 'item' : 'order'} reward</p>
                </div>
                <span className="flex items-center gap-1.5 flex-shrink-0 text-sm font-heading px-3 py-1.5 rounded-lg bg-patina-mint/15 text-patina-mint">
                  <Star size={14} /> {Number(t.points).toLocaleString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}