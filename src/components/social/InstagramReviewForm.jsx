import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Instagram, ArrowRight, PartyPopper } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Instagram review points are credited to the caller's OWN signed-in account: the
// server reads the email from the session, never from this form, so the points can
// only ever land in the account of whoever is submitting. A signed-out visitor
// gets a sign-in prompt instead of a form that could not credit them.
export default function InstagramReviewForm({ defaultEmail = '', defaultName = '' }) {
  const [name, setName] = useState(defaultName);
  const [postUrl, setPostUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const inputCls =
    'w-full px-4 py-3.5 border border-border rounded-2xl bg-white font-body text-obsidian-roast focus:outline-none focus:border-midnight-cherry focus:ring-2 focus:ring-midnight-cherry/20 transition-all';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!postUrl.trim()) {
      setError('We need your Instagram post link to hook you up with points.');
      return;
    }
    if (!/instagram\.com\//i.test(postUrl.trim())) {
      setError('That link doesn\'t look like an Instagram post. Paste the link straight from your post.');
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('awardInstagramReviewPoints', {
        customer_name: name.trim(),
        instagram_post_url: postUrl.trim(),
      });
      setResult(res.data);
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.data?.message ||
        'Something went wrong submitting your post. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (result?.success) {
    return (
      <div className="card-diner p-6 sm:p-8 text-center animate-float-up">
        <div className="w-16 h-16 rounded-full bg-smashie-yellow/20 flex items-center justify-center mx-auto mb-4">
          <PartyPopper size={30} className="text-midnight-cherry" />
        </div>
        <h3 className="font-heading text-2xl text-obsidian-roast mb-2">100 POINTS — DONE!</h3>
        <p className="font-body text-sm text-muted-foreground mb-4">
          Thanks for sharing the flavor! Your new balance is{' '}
          <span className="font-semibold text-midnight-cherry">{result.new_points_balance} points</span>
          {result.tier ? <> on the <span className="capitalize font-semibold">{result.tier}</span> tier</> : null}.
        </p>
        <p className="text-xs text-muted-foreground font-body">
          You can earn Instagram points once a week — come back with your next post!
        </p>
      </div>
    );
  }

  // Not signed in: points can only be credited to the account itself, so send
  // them to sign in first (and straight back here).
  if (!defaultEmail) {
    return (
      <div className="card-diner p-6 sm:p-8 text-center">
        <h3 className="font-heading text-2xl text-obsidian-roast mb-2">SIGN IN TO CLAIM</h3>
        <p className="font-body text-sm text-muted-foreground mb-5">
          Instagram review points go to your Flavor Isle rewards account, so you need to be signed in
          first — that way the points can only ever land in your own account.
        </p>
        <Link
          to="/login?returnTo=/social-reviews"
          className="btn-cherry chrome-hover inline-flex items-center justify-center gap-2 w-full py-4 text-sm font-heading tap-44"
        >
          Sign In <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card-diner p-6 sm:p-8 space-y-4">
      <div>
        <label className="block text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">
          Your Name (optional)
        </label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith" className={inputCls} />
      </div>
      <div>
        <label className="block text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">
          Rewards Account
        </label>
        <div className="w-full px-4 py-3.5 border border-border rounded-2xl bg-muted/60 font-body text-obsidian-roast">
          {defaultEmail}
        </div>
        <p className="text-xs text-muted-foreground mt-1.5 font-body">
          The 100 points are credited to your signed-in account — that is the only account they can reach.
        </p>
      </div>
      <div>
        <label className="block text-xs font-heading uppercase tracking-widest text-muted-foreground mb-2">
          Instagram Post Link
        </label>
        <div className="relative">
          <Instagram size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="url"
            value={postUrl}
            onChange={(e) => setPostUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/..."
            required
            className={`${inputCls} pl-10`}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border-l-4 bg-muted/60 px-4 py-3" style={{ borderLeftColor: 'var(--midnight-cherry)' }}>
          <p className="text-sm font-body text-obsidian-roast">{error}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {loading ? (
          <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Submitting…</>
        ) : (
          <>Claim My 100 Points <ArrowRight size={16} /></>
        )}
      </button>
    </form>
  );
}