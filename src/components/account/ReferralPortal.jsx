import React, { useEffect, useState } from 'react';
import { Share2, Copy, Check, Gift, Star, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { formatChicagoDate } from '@/lib/chicagoTime';

// Referral tab — the customer's own referral code, share link, Stars earned and
// the friends they brought in (GitHub issue #95 follow-up). Everything shown
// here comes from getMyReferralPortal; the reward line quotes the Stars that
// function reports, which mirrors the grant in shared/webOrderLoyaltyBonuses.ts.
export default function ReferralPortal() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await base44.functions.invoke('getMyReferralPortal', {});
        if (active) setData(res?.data || null);
      } catch (error) {
        console.error('Referral portal load failed:', error);
        if (active) setFailed(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const copyLink = async () => {
    if (!data?.share_url) return;
    try {
      await navigator.clipboard.writeText(data.share_url);
    } catch {
      // Clipboard can be blocked (older iOS, in-app browsers) — the link is
      // still on screen and selectable, so nothing is lost.
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (!data?.share_url) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Flavor Isle',
          text: 'Order some flavor with me at Flavor Isle in Smiths Grove.',
          url: data.share_url,
        });
        return;
      } catch {
        // The customer dismissed the share sheet — fall through to copying.
      }
    }
    copyLink();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
      </div>
    );
  }

  if (failed || !data) {
    return (
      <div className="card-diner p-8 text-center">
        <Gift size={40} strokeWidth={1} className="mx-auto mb-3 text-midnight-cherry" />
        <p className="font-heading text-lg text-obsidian-roast mb-2">Couldn't load your referral code</p>
        <p className="text-sm text-muted-foreground">Refresh the page and it'll come right up.</p>
      </div>
    );
  }

  const starsPerReferral = Number(data.stars_per_referral || 0);
  const referrals = data.referrals || [];

  return (
    <div className="space-y-6">
      <div className="card-diner p-6 sm:p-8">
        <div className="flex items-center gap-2 mb-1">
          <Gift size={18} className="text-midnight-cherry" />
          <h2 className="font-heading text-2xl text-obsidian-roast">Your Referral Code</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-6">
          {starsPerReferral > 0
            ? `Get ${starsPerReferral} Stars when a friend places their first order with your code.`
            : 'Share your code and earn Stars when a friend places their first order.'}
        </p>

        {data.code ? (
          <>
            <div className="rounded-2xl border-2 border-dashed border-midnight-cherry/40 bg-midnight-cherry/5 px-4 py-6 text-center mb-5">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Your code</p>
              <p className="font-heading text-3xl sm:text-4xl text-midnight-cherry tracking-[0.2em] select-all break-all">{data.code}</p>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Share link</p>
                <p className="text-sm text-patina-mint break-all select-all bg-muted rounded-xl px-3 py-2.5">{data.share_url}</p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={copyLink}
                  className="btn-mint chrome-hover flex items-center gap-2 px-5 py-3 text-sm tap-44"
                >
                  {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copied' : 'Copy link'}
                </button>
                <button
                  onClick={shareLink}
                  className="btn-cherry chrome-hover flex items-center gap-2 px-5 py-3 text-sm tap-44"
                >
                  <Share2 size={16} /> Share
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-2xl bg-muted p-5">
            <p className="text-sm text-obsidian-roast font-semibold mb-1">Add your phone number to get a code</p>
            <p className="text-sm text-muted-foreground">
              Your referral code is tied to the phone number on your account. Add it under Profile &amp; Preferences and your code appears here right away.
            </p>
          </div>
        )}
      </div>

      <div className="card-diner p-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Stars earned from referrals</p>
          <p className="font-heading text-3xl text-midnight-cherry">{data.stars_earned || 0}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {referrals.length === 0
              ? 'No referrals yet'
              : `${referrals.length} friend${referrals.length === 1 ? '' : 's'} brought in`}
          </p>
        </div>
        <div className="w-12 h-12 rounded-full bg-smashie-yellow/20 flex items-center justify-center flex-shrink-0">
          <Star size={22} className="text-smashie-yellow" />
        </div>
      </div>

      <div className="card-diner p-6">
        <h3 className="font-heading text-lg text-obsidian-roast mb-4">Friends you've brought in</h3>
        {referrals.length === 0 ? (
          <div className="text-center py-10">
            <Users size={40} strokeWidth={1} className="mx-auto mb-3 text-muted-foreground" />
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Share your link and your first friend shows up here as soon as their order comes through.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {referrals.map((referral, i) => (
              <div key={`${referral.order_number || 'referral'}-${i}`} className="flex items-center justify-between gap-3 border-b border-border last:border-0 pb-3 last:pb-0">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-obsidian-roast truncate">{referral.referee_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {referral.order_number ? `Order #${referral.order_number}` : 'Referral bonus'}
                    {referral.awarded_at ? ` · ${formatChicagoDate(referral.awarded_at, { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                  </p>
                </div>
                <span className="font-heading text-sm text-midnight-cherry flex-shrink-0">+{referral.points_awarded} Stars</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}