import React, { useState } from 'react';
import { Instagram, ArrowRight, PartyPopper } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function InstagramReviewForm({ defaultEmail = '', defaultName = '' }) {
  const [name, setName] = useState(defaultName);
  const [email, setEmail] = useState(defaultEmail);
  const [postUrl, setPostUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const inputCls =
    'w-full px-4 py-3.5 border border-border rounded-2xl bg-white font-body text-obsidian-roast focus:outline-none focus:border-midnight-cherry focus:ring-2 focus:ring-midnight-cherry/20 transition-all';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !postUrl.trim()) {
      setError('We need your email and your Instagram post link to hook you up with points.');
      return;
    }
    if (!/instagram\.com\//i.test(postUrl.trim())) {
      setError('That link doesn\'t look like an Instagram post. Paste the link straight from your post.');
      return;
    }
    setLoading(true);
    try {
      const res = await base44.functions.invoke('awardInstagramReviewPoints', {
        customer_email: email.trim(),
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
          Account Email
        </label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className={inputCls} />
        <p className="text-xs text-muted-foreground mt-1.5 font-body">Use the email on your Flavor Isle rewards account so we credit the right one.</p>
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