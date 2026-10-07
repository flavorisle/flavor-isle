import React, { useState, useEffect } from 'react';
import { Star, Zap, TrendingUp, Gift, Phone, ArrowLeft, Sparkles, Award, ChevronRight, HelpCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Link } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import BonusStars from '@/components/rewards/BonusStars';

// Subtitle for a reward tier card — "Free item · item reward" for item-scoped
// rewards, "{pct}% off · order reward" for percentage order rewards.
function rewardSubtitle(t) {
  if (t.scope && t.scope.startsWith('ITEM')) return 'Free item · item reward';
  if (t.discountType === 'FIXED_PERCENTAGE') return `${t.percentage || 0}% off · order reward`;
  if (t.discountType === 'FIXED_AMOUNT') return `$${Math.round((t.fixedAmountCents || 0) / 100)} off · order reward`;
  return 'order reward';
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

  // Progress toward the next unreached reward tier
  const sortedTiers = [...tiers].sort((a, b) => a.points - b.points);
  const nextTier = sortedTiers.find(t => t.points > balance);
  const nextTierProgress = nextTier ? Math.min(100, Math.round((balance / nextTier.points) * 100)) : 100;
  const starsToNext = nextTier ? Math.max(0, nextTier.points - balance) : 0;

  if (loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
        <Seo
          title="Star Rewards — Earn Points on Every Order | Flavor Isle"
          description="Join Star Rewards and earn points on every Flavor Isle order. Sign up online, order ahead, and redeem points for free food at the register."
          ogTitle="Star Rewards — Earn Points on Every Order | Flavor Isle"
          ogDescription="Join Star Rewards and earn points on every Flavor Isle order. Sign up online, order ahead, and redeem points for free food."
          ogImage="https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/3121a3df2_card-rewards.png"
          ogImageAlt="Flavor Isle Star Rewards share card"
        />
        <Navbar />
        <CartDrawer />
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
        </div>
        <Footer />
      </div>
    );
  }

  // ── Reward card ──
  // redeemable = balance meets the reward's star cost; those show a READY badge.
  const renderRewardCard = (t) => {
    const redeemable = balance >= t.points;
    return (
      <div key={t.id} className="card-diner p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: redeemable ? '#F3DCCB' : '#EBEBEB' }}
          >
            <Gift size={18} style={{ color: redeemable ? '#D65B36' : '#9ca3af' }} />
          </div>
          <div className="min-w-0">
            <p className="font-heading text-obsidian-roast uppercase">{t.name}</p>
            <p className="text-sm text-muted-foreground mt-0.5 truncate">{rewardSubtitle(t)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {redeemable && (
            <span className="text-xs font-heading text-white rounded-full px-3 py-1" style={{ backgroundColor: '#D65B36' }}>READY</span>
          )}
          <span className="flex items-center gap-1 text-sm font-heading px-3 py-1.5 rounded-lg text-obsidian-roast" style={{ backgroundColor: '#EBEBEB' }}>
            <Star size={14} /> {Number(t.points).toLocaleString()}
          </span>
        </div>
      </div>
    );
  };

  const RewardsList = () => (
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
          sortedTiers.map(renderRewardCard)
        )}
      </div>
    </div>
  );

  // ── How It Works: 3-step explainer shown to logged-out visitors ──
  const HowItWorks = () => (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {[
        { icon: Star, title: 'Earn Stars', text: 'Earn 1 Star per $1 when you use your member phone number.' },
        { icon: Zap, title: 'Order Direct', text: '+10% bonus Stars on every flavor-isle.com order.' },
        { icon: Gift, title: 'Redeem Rewards', text: 'Choose a reward from the live Square program when you have enough Stars.' },
      ].map((s, i) => (
        <div key={s.title} className="card-diner p-5 text-center">
          <div className="w-12 h-12 rounded-full bg-midnight-cherry/10 flex items-center justify-center mx-auto mb-3">
            <s.icon size={22} className="text-midnight-cherry" />
          </div>
          <div className="text-xs font-heading text-smashie-yellow mb-1 tracking-widest">STEP {i + 1}</div>
          <p className="font-heading text-obsidian-roast mb-1">{s.title}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
        </div>
      ))}
    </div>
  );

  // ── FAQ — common questions about how Star Rewards works ──
  const FAQS = [
    {
      q: 'How do I earn stars?',
      a: 'Just provide your phone number at checkout (in-store or online). Stars are added automatically to your Star Rewards balance on every eligible purchase — no app or punch card needed.',
    },
    {
      q: 'Do I get anything extra for ordering online?',
      a: 'Yes. Online orders earn a 10% Star bonus, your second online order scores 50 bonus Stars, and 3 online orders within 30 days earn a 50-Star streak bonus. Order at flavor-isle.com.',
    },
    {
      q: 'Is there a birthday bonus?',
      a: 'Yes. 100 bonus Stars land on your account on your birthday. Add your birthday (month and day) in your account profile so we know when it is.',
    },
    {
      q: "I haven't ordered in a while. Any reason to come back?",
      a: 'Yes. After 30 days away, your next online order lands 100 welcome-back bonus Stars in your account.',
    },
    {
      q: 'Can I use more than one reward on an order?',
      a: "No. One reward per order, and rewards can't be stacked with other offers or discounts.",
    },
    {
      q: 'Do my stars expire?',
      a: 'Stars and lifetime stars follow the program rules set by Flavor Isle. We may change expiration policies at any time, so check the terms below for the latest details.',
    },
    {
      q: 'What are the star tiers?',
      a: 'Square sets the live reward tiers. Your current balance and available rewards appear above when your member phone number is linked.',
    },
    {
      q: 'How do I redeem a reward?',
      a: 'When your balance reaches a reward\u2019s star cost, that reward shows a READY badge. Redeem it right at the Flavor Isle register, or during online checkout when eligible.',
    },
    {
      q: 'Can I share or transfer my stars?',
      a: 'No. Star Rewards accounts are linked to a single phone number and can\u2019t be shared, transferred, or merged. Rewards can\u2019t be exchanged for cash.',
    },
    {
      q: 'What if I lose my phone number or change it?',
      a: 'You\u2019re responsible for keeping your phone number accurate so stars track correctly. Update it in your account profile, or contact us and we\u2019ll help reconnect your rewards.',
    },
    {
      q: 'Can I earn stars by entering my number on someone else\u2019s order?',
      a: 'No. Stars belong to the rewards account that earned them — the account tied to the phone number used at checkout. Dropping your number onto another customer\u2019s purchase doesn\u2019t transfer their stars to you. If we catch someone claiming stars on a purchase that wasn\u2019t theirs, we may pause or close that rewards account and void its stars. Questions or a dispute? Email rewards@flavor-isle.com.',
    },
    {
      q: 'Is automatic card recognition at the register the same as signing in online?',
      a: 'Nope — it\u2019s a convenience so your stars track in-store without extra steps. Signing in to your account on this website is how you manage your profile, see your balance, and update your info. They work together, but they\u2019re not the same thing.',
    },
  ];

  const RewardsFAQ = () => (
    <div className="mt-10 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <HelpCircle size={20} className="text-midnight-cherry" />
        <h3 className="font-heading text-xl text-obsidian-roast">Star Rewards FAQ</h3>
      </div>
      <div className="space-y-3">
        {FAQS.map((f, i) => (
          <details key={i} className="card-diner p-4 group">
            <summary className="font-heading text-sm text-obsidian-roast cursor-pointer list-none flex items-center justify-between gap-3">
              <span>{f.q}</span>
              <ChevronRight size={16} className="text-muted-foreground transition-transform group-open:rotate-90 flex-shrink-0" />
            </summary>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );

  // ── Terms & Conditions — collapsible, shown on both views ──
  const RewardsTerms = () => (
    <div className="mt-10 mb-4">
      <details className="card-diner p-5">
        <summary className="font-heading text-sm text-obsidian-roast cursor-pointer list-none flex items-center justify-between">
          Star Rewards Terms &amp; Conditions
          <ChevronRight size={16} className="text-muted-foreground" />
        </summary>
        <div className="mt-4 text-xs text-muted-foreground leading-relaxed space-y-4">
          <p>Star Rewards is Flavor Isle's loyalty program, operated and managed by Flavor Isle through our Square point-of-sale system. The program allows customers to earn Stars on qualifying purchases and redeem them for available rewards. By participating in Star Rewards, you agree to the terms outlined in this section.</p>
          <div>
            <p className="font-heading text-obsidian-roast mb-1">Eligibility</p>
            <p>To participate in Star Rewards, you must provide a valid phone number at checkout or link your phone number to your online account. Only one Star Rewards account may be associated with a single phone number. Accounts cannot be shared, transferred, or merged.</p>
            <p className="mt-1">Flavor Isle reserves the right to deny enrollment, suspend participation, or remove accounts that violate program rules, provide false information, or attempt to misuse the program.</p>
            <p className="mt-1">Star Rewards is intended for individual customer use. Commercial, automated, or bulk participation is not permitted.</p>
          </div>
          <div>
            <p className="font-heading text-obsidian-roast mb-1">Earning Stars</p>
            <p>Stars are earned at a rate of 1 Star per $1 on eligible in-store and online purchases when your phone number is provided at checkout or linked to your online account. Orders placed directly on flavor-isle.com earn an additional 10% Star bonus. Flavor Isle may also award one-time bonus Stars under promotional rules, such as a second-order bonus, birthday bonus, welcome-back bonus, or order streak bonus; each bonus is granted once under its stated rules. Flavor Isle may change earning rates, qualifying items, or promotional bonuses at any time without notice. Stars have no cash value, are non-transferable, and may expire or change according to program rules.</p>
          </div>
          <div>
            <p className="font-heading text-obsidian-roast mb-1">Redeeming Stars</p>
            <p>Stars may be redeemed for available rewards at the register or during online checkout when eligible. Reward availability may vary based on inventory, seasonal offerings, or program updates. Flavor Isle may modify, suspend, or discontinue any reward, tier, or benefit at any time without notice.</p>
            <p className="mt-1">Rewards cannot be transferred, combined across accounts, or exchanged for cash. Only one reward may be applied per order, and rewards cannot be combined with other offers, promotions, or discounts.</p>
          </div>
          <div>
            <p className="font-heading text-obsidian-roast mb-1">Account &amp; Phone Number Responsibility</p>
            <p>Your Star Rewards account is linked directly to your phone number and synced with our in-store Square loyalty system. You are responsible for keeping your phone number and account information accurate so Stars and rewards are tracked correctly.</p>
            <p className="mt-1">Flavor Isle is not liable for missed Stars, untracked purchases, or unavailable rewards caused by incorrect, outdated, or unverified contact information.</p>
          </div>
          <div>
            <p className="font-heading text-obsidian-roast mb-1">Fraud &amp; Misuse</p>
            <p>Flavor Isle may suspend or terminate your participation in Star Rewards if we detect or suspect fraudulent activity, misuse, manipulation of earning or redemption mechanics, creation of duplicate accounts, or any attempt to obtain Stars or rewards dishonestly.</p>
            <p className="mt-1">Examples of misuse include, but are not limited to:</p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              <li>Using multiple phone numbers to accumulate Stars</li>
              <li>Attempting to redeem rewards not legitimately earned</li>
              <li>Providing false or misleading account information</li>
              <li>Abusing promotions, loopholes, or system errors</li>
              <li>Harassing staff or attempting to force unauthorized reward redemption</li>
            </ul>
            <p className="mt-1">Flavor Isle reserves the right to revoke Stars, cancel rewards, or close accounts involved in fraudulent or abusive behavior.</p>
          </div>
          <div>
            <p className="font-heading text-obsidian-roast mb-1">Program Changes &amp; Limitations</p>
            <p>Flavor Isle may modify, suspend, or discontinue the Star Rewards program — including earning rules, reward tiers, expiration policies, and promotional bonuses — at any time without notice. Continued participation after changes means you accept the updated terms.</p>
            <p className="mt-1">Participation in Star Rewards does not guarantee the availability of any specific reward, earning rate, or benefit. Flavor Isle may limit reward quantities, restrict eligibility, or adjust program mechanics as needed.</p>
          </div>
        </div>
      </details>
    </div>
  );

  // ── Logged-out: program intro hero + tier ladder + reward catalog ──
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
        <Seo
          title="Star Rewards — Earn Points on Every Order | Flavor Isle"
          description="Join Star Rewards and earn points on every Flavor Isle order. Sign up online, order ahead, and redeem points for free food at the register."
          ogTitle="Star Rewards — Earn Points on Every Order | Flavor Isle"
          ogDescription="Join Star Rewards and earn points on every Flavor Isle order. Sign up online, order ahead, and redeem points for free food."
          ogImage="https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/3121a3df2_card-rewards.png"
          ogImageAlt="Flavor Isle Star Rewards share card"
        />
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
                Earn 1 Star per $1 and redeem your Stars for rewards set by the live Square program. +10% bonus Stars on every flavor-isle.com order, with your member phone number.
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

          <HowItWorks />
          <BonusStars />
          <RewardsList />

          <RewardsFAQ />

          {/* CTA */}
          <div className="mt-10 text-center">
            <Link to="/menu" className="btn-cherry chrome-hover px-8 py-4 text-sm font-heading inline-flex items-center gap-2">
              Start Earning Stars <ChevronRight size={16} />
            </Link>
          </div>

          <RewardsTerms />
        </div>

        <Footer />
      </div>
    );
  }

  // ── Signed-in view ──
  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Seo
        ogTitle="Star Rewards — Earn Points on Every Order | Flavor Isle"
        ogDescription="Join Star Rewards and earn points on every Flavor Isle order. Sign up online, order ahead, and redeem points for free food."
        ogImage="https://base44.app/api/apps/6a95fe085a23d5fd44d8cc53/files/mp/public/6a95fe085a23d5fd44d8cc53/3121a3df2_card-rewards.png"
        ogImageAlt="Flavor Isle Star Rewards share card"
      />
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
              Earn 1 Star per $1 with your member phone number. Your balance is synced with Square.
            </p>
            <p className="mt-4 text-sm text-white/80">+10% bonus Stars on every flavor-isle.com order.</p>
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
        {status?.hasAccount && <RewardsList />}

        <RewardsFAQ />

        <RewardsTerms />
      </div>

      <Footer />
    </div>
  );
}