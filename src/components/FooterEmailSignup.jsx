import React, { useState } from 'react';
import { Mail, CheckCircle2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Footer email signup — "Get Updates from the Isle". Creates a pending
// EmailSubscriber and sends a double opt-in confirmation email; nothing
// is active until the subscriber clicks the confirm link. Shown on every
// page via the global Footer.
export default function FooterEmailSignup() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | done | active
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.');
      return;
    }
    setStatus('submitting');
    try {
      const res = await base44.functions.invoke('subscribeEmail', { email: trimmed, source: 'footer' });
      if (res.data?.alreadyActive) setStatus('active');
      else setStatus('done');
      setEmail('');
    } catch {
      setError('Something went wrong. Please try again.');
      setStatus('idle');
    }
  };

  return (
    <div className="border-t border-white/10 px-4 sm:px-6 py-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div>
          <h4 className="font-heading text-sm uppercase tracking-widest mb-2 text-[hsl(var(--primary))] flex items-center gap-2">
            <Mail size={16} /> GET UPDATES FROM THE ISLE
          </h4>
          <p className="text-gray-300 text-sm leading-relaxed">
            New menu items, seasonal shakes, and special events — straight to your inbox. We only send what matters, and you can unsubscribe anytime.
          </p>
        </div>

        {status === 'done' || status === 'active' ? (
          <div className="flex items-center gap-2 text-sm text-gray-200">
            <CheckCircle2 size={18} className="text-[hsl(var(--primary))] flex-shrink-0" />
            {status === 'active'
              ? "You're already on the list — thanks for being a Flavor Isle insider!"
              : "You're almost there! Check your email to confirm your subscription."}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="flex gap-2">
              <input
                type="email" inputMode="email" autoComplete="email" value={email}
                onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" aria-label="Email for newsletter"
                className="flex-1 min-w-0 px-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              />
              <button type="submit" disabled={status === 'submitting'} className="btn-cherry px-5 py-3 text-sm whitespace-nowrap disabled:opacity-60 tap-44">
                {status === 'submitting' ? <Loader2 size={16} className="animate-spin" /> : 'Get Updates'}
              </button>
            </div>
            {error && <p className="text-xs text-red-300">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}