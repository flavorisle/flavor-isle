import React, { useState, useEffect } from 'react';
import { Star, Zap, TrendingUp, Gift, Phone, ArrowLeft, Sparkles, Award, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';

// Loyalty status tiers — derived from lifetime stars. Each tier grants a
// benefit multiplier (Nx) applied to stars earned on every order.
const LOYALTY_TIERS = [
  { min: 150, label: 'Big Burger Energy', multiplier: 5, color: 'from-amber-400 via-yellow-500 to-amber-600', text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
  { min: 120, label: 'Mega Flex', multiplier: 4, color: 'from-patina-mint to-[#0a1f33]', text: 'text-patina-mint', bg: 'bg-blue-50', border: 'border-blue-200' },
  { min: 70, label: 'Big Flex', multiplier: 3, color: 'from-midnight-cherry to-red-700', text: 'text-midnight-cherry', bg: 'bg-red-50', border: 'border-red-200' },
  { min: 40, label: 'Big Bite', multiplier: 2, color: 'from-smashie-yellow to-amber-500', text: 'text-amber-600', bg: 'bg-orange-50', border: 'border-orange-200' },
];

function deriveTier(lifetime) {
  for (const t of LOYALTY_TIERS) {
    if (lifetime >= t.min) return t;
  }
  return { min: 0, label: 'Starter', multiplier: 1, color: 'from-slate-300 to-slate-400', text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' };
}

export default function Rewards() {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Logged-out visitors get the public program definition (no personal
        // data); signed-in users get their live balance + reward tiers.
        const action = isAuthenticated ? 'status' : 'program';
        const res = await base44.functions.invoke('squareLoyalty', { action });
        if (!cancelled) setStatus(res.data);
      } catch (e) {
        if (!cancelled) setStatus(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const programName = status?.programName || 'Flavor Isle Star Rewards';
  const balance = status?.balance || 0;
  const lifetime = status?.lifetimePoints || 0;
  const tiers = status?.rewardTiers || [];
  const earnText = status?.earnText;
  const tier = deriveTier(lifetime);

  // Progress toward the next unreached reward tier
  const sortedTiers = [...tiers].sort((a, b) => a.points - b.points);
  const sortedRewardTiers = [...tiers].sort((a, b) => a.points - b.points);
  const nextTier = sortedTiers.find(t => t.points > balance);
  const nextTierProgress = nextTier ? Math.min(100, Math.round((balance / nextTier.points) * 100)) : 100;
  const starsToNext = nextTier ? Math.max(0, nextTier.points - balance) : 0;

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
        <Navbar />
        <CartDrawer />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
        </div>
        <Footer />
      </div>
    );
  }

  // ── Logged-out: program intro hero + tier ladder + reward catalog ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
        <Navbar />
        <CartDrawer />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
          {/* Hero */}
          <div className="rounded-3xl overflow-hidden shadow-float bg-gradient-to-br from-patina-mint to-[#0a1f33] text-white mb-8">
            <div className="p-8 sm:p-10">
              <div className="inline-flex items-center gap-2">
                <Star size={14} className="text-smashie-yellow" fill="currentColor" />
                <span className="text-xs font-heading tracking-widest uppercase text-white/70">{programName}</span>
              </div>
              <h1 className="font-heading text-4xl sm:text-5xl leading-none mt-4">Earn stars on every online order</h1>
              <p className="text-sm text-white/70 mt-3 max-w-md leading-relaxed">
                Join Star Rewards to stack up stars on every order, climb the tiers for bigger multipliers, and cash them in for free food at the register — just like in-store.
              </p>
              {earnText && (
                <div className="mt-4 inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1.5">
                  <Sparkles size={14} className="text-smashie-yellow" />
                  <span className="text-sm">{earnText}</span>
                </div>
              )}
              <div className="mt-6 flex flex-wrap gap-3">
                <Link to="/register" className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading inline-flex items-center gap-2">
                  Sign Up <ChevronRight size={16} />
                </Link>
                <Link to="/login" className="px-6 py-3 text-sm font-heading rounded-full border-2 border-white/30 text-white hover:bg-white/10 transition-colors inline-flex items-center gap-2">
                  Sign In
                </Link>
              </div>
            </div>
          </div>

          {/* Star Tiers ladder */}
          <div className="card-diner p-6 mb-8">
            <h3 className="font-heading text-lg text-obsidian-roast mb-1">Star Tiers</h3>
            <p className="text-sm text-muted-foreground mb-5">Earn more lifetime stars to unlock bigger multipliers on every order.</p>
            <div className="space-y-3">
              {[...LOYALTY_TIERS].reverse().map((t) => (
                <div key={t.label} className="flex items-center gap-4 rounded-2xl p-4 border-2 border-border bg-muted/40">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center flex-shrink-0 opacity-40 grayscale`}>
                    <Award size={22} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-obsidian-roast">{t.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {Number(t.min).toLocaleString()} lifetime stars to unlock
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 font-heading text-lg text-muted-foreground">
                    <Zap size={16} />
                    {t.multiplier}×
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Available Rewards catalog */}
          <div>
            <h3 className="font-heading text-xl text-obsidian-roast mb-1">Available Rewards</h3>
            <p className="text-sm text-muted-foreground mb-4">Redeem these at the Flavor Isle register right from your Star Rewards balance.</p>
            <div className="space-y-3">
              {sortedRewardTiers.length === 0 ? (
                <div className="card-diner p-8 text-center">
                  <Gift size={24} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground italic">Rewards list coming soon.</p>
                </div>
              ) : (
                sortedRewardTiers.map((t) => (
                  <div key={t.id} className="card-diner p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 bg-muted">
                        <Gift size={18} className="text-muted-foreground" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-heading text-obsidian-roast">{t.name}</p>
                        <p className="text-sm text-muted-foreground mt-0.5 truncate">{t.description} · {t.scope?.startsWith('ITEM') ? 'item' : 'order'} reward</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0 text-sm font-heading px-3 py-1.5 rounded-lg bg-patina-mint/15 text-patina-mint">
                      <Star size={14} /> {Number(t.points).toLocaleString()}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-10 text-center">
            <Link to="/menu" className="btn-cherry chrome-hover px-8 py-4 text-sm font-heading inline-flex items-center gap-2">
              Start Earning Stars <ChevronRight size={16} />
            </Link>
          </div>
        </div>

        <Footer />
      </div>
    );
  }

  // ── Signed-in view ──
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Link to="/account" className="inline-flex items-center gap-2 text-muted-foreground hover:text-midnight-cherry transition-colors text-sm mb-6">
          <ArrowLeft size={16} /> Back to Account
        </Link>

        {/* Header / tier badge */}
        <div className="card-diner overflow-hidden mb-8">
          <div className="bg-gradient-to-br from-patina-mint to-[#0a1f33] p-6 sm:p-8 text-white">
            <div className="inline-flex items-center gap-2 bg-white/15 rounded-full px-3 py-1 mb-3">
              <Star size={14} className="text-smashie-yellow" fill="currentColor" />
              <span className="text-xs font-heading tracking-widest uppercase">{programName}</span>
            </div>
            <h1 className="font-heading text-3xl sm:text-4xl leading-none">Your Star Rewards</h1>
            <p className="text-sm text-white/70 mt-2 max-w-md">
              The same rewards you earn in-store — synced to your online account{earnText ? `. ${earnText}.` : '.'}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3 bg-white/10 rounded-2xl p-3">
              <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${tier.color} flex items-center justify-center`}>
                <Award size={15} className="text-white" />
              </div>
              <span className="font-heading text-sm tracking-wide">{tier.label}</span>
              <span className="text-xs font-heading text-smashie-yellow bg-white/20 rounded-full px-2 py-0.5">{tier.multiplier}× stars</span>
              <span className="text-xs text-white/60">·</span>
              <span className="text-xs text-white/70">{Number(lifetime).toLocaleString()} lifetime</span>
            </div>
          </div>

          {earnText && (
            <div className="px-8 py-4 bg-midnight-cherry/5 flex items-center gap-2 text-sm text-obsidian-roast">
              <Sparkles size={15} className="text-midnight-cherry flex-shrink-0" />
              <span>{earnText}</span>
            </div>
          )}
        </div>

        {/* Needs phone nudge */}
        {status?.needsPhone && (
          <div className="card-diner p-5 flex items-center gap-3 border-2 border-amber-200 bg-amber-50 mb-8">
            <Phone size={20} className="text-amber-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-heading text-sm text-obsidian-roast">Add a phone number to join Star Rewards</p>
              <p className="text-xs text-muted-foreground mt-0.5">Star Rewards is linked to your phone number, just like in-store. Add one in your profile to start earning.</p>
            </div>
            <Link to="/account?tab=profile" className="btn-cherry chrome-hover px-4 py-2 text-sm font-heading whitespace-nowrap tap-44">Add Phone</Link>
          </div>
        )}

        {/* Not connected state */}
        {(!status || status.programStatus !== 'ACTIVE') && !status?.needsPhone && (
          <div className="card-diner p-10 text-center mb-8">
            <Star size={40} className="mx-auto mb-3 text-midnight-cherry" />
            <h2 className="font-heading text-2xl text-obsidian-roast mb-2">{programName}</h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Your live Star Rewards balance and tier status will appear here once Square loyalty is connected to your account.
            </p>
          </div>
        )}

        {/* Stats row */}
        {status?.hasAccount && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
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
        )}

        {/* Star Tiers ladder */}
        {status?.hasAccount && (
          <div className="card-diner p-6 mb-8">
            <h3 className="font-heading text-lg text-obsidian-roast mb-1">Star Tiers</h3>
            <p className="text-sm text-muted-foreground mb-5">Earn more lifetime stars to unlock bigger multipliers on every order.</p>
            <div className="space-y-3">
              {[...LOYALTY_TIERS].reverse().map((t) => {
                const reached = lifetime >= t.min;
                return (
                  <div key={t.label} className="flex items-center gap-4 rounded-2xl p-4 border-2 border-border bg-muted/40">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center flex-shrink-0 ${reached ? '' : 'opacity-40 grayscale'}`}>
                      <Award size={22} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-heading text-obsidian-roast">{t.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {Number(t.min).toLocaleString()} lifetime stars to unlock
                      </p>
                    </div>
                    <div className={`flex items-center gap-1.5 flex-shrink-0 font-heading text-lg ${reached ? 'text-midnight-cherry' : 'text-muted-foreground'}`}>
                      <Zap size={16} className={reached ? 'fill-smashie-yellow text-smashie-yellow' : ''} />
                      {t.multiplier}×
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Progress to next reward */}
        {status?.hasAccount && nextTier && (
          <div className="card-diner p-6 mb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading text-lg text-obsidian-roast">Next Reward</h3>
              <span className="text-sm text-muted-foreground">{Number(balance).toLocaleString()} / {Number(nextTier.points).toLocaleString()} stars</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden mb-3">
              <div
                className="h-full bg-gradient-to-r from-midnight-cherry to-smashie-yellow rounded-full transition-all duration-500"
                style={{ width: `${nextTierProgress}%` }}
              />
            </div>
            <div className="flex items-center gap-3">
              <Gift size={18} className="text-midnight-cherry flex-shrink-0" />
              <p className="text-sm text-obsidian-roast flex-1">
                <span className="font-heading">{nextTier.name}</span> — {nextTier.description}
              </p>
              <span className="text-sm font-heading text-midnight-cherry whitespace-nowrap">
                {starsToNext > 0 ? `${starsToNext} to go` : 'Ready!'}
              </span>
            </div>
          </div>
        )}

        {/* Available rewards */}
        {status?.hasAccount && (
          <div>
            <h3 className="font-heading text-xl text-obsidian-roast mb-1">Available Rewards</h3>
            <p className="text-sm text-muted-foreground mb-4">Redeem these at the Flavor Isle register right from your Star Rewards balance.</p>
            <div className="space-y-3">
              {tiers.length === 0 ? (
                <div className="card-diner p-8 text-center">
                  <Gift size={24} className="mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground italic">No reward tiers are configured in the Square loyalty program yet.</p>
                </div>
              ) : (
                sortedTiers.map((t) => {
                  const redeemable = balance >= t.points;
                  return (
                    <div
                      key={t.id}
                      className={`card-diner p-4 flex items-center justify-between gap-3 ${redeemable ? 'ring-2 ring-midnight-cherry/20' : ''}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${redeemable ? 'bg-midnight-cherry/15' : 'bg-muted'}`}>
                          <Gift size={18} className={redeemable ? 'text-midnight-cherry' : 'text-muted-foreground'} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-heading text-obsidian-roast">{t.name}</p>
                          <p className="text-sm text-muted-foreground mt-0.5 truncate">{t.description} · {t.scope?.startsWith('ITEM') ? 'item' : 'order'} reward</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {redeemable && (
                          <span className="text-xs font-heading text-white bg-midnight-cherry rounded-full px-3 py-1">Redeemable</span>
                        )}
                        <span className="flex items-center gap-1 text-sm font-heading px-3 py-1.5 rounded-lg bg-patina-mint/15 text-patina-mint">
                          <Star size={14} /> {Number(t.points).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}