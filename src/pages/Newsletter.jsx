import React, { useState } from 'react';
import { Mail, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('idle'); // idle | submitting | done | error
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMsg('Please enter a valid email address.');
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setErrorMsg('');
    try {
      await base44.entities.NewsletterSubscriber.create({
        email: trimmed,
        name: name.trim() || undefined,
        source: 'newsletter_page',
      });
      setStatus('done');
      setEmail('');
      setName('');
    } catch (err) {
      // A duplicate email or other rejection — treat as already subscribed so
      // we never leak whether an address is on the list.
      setStatus('done');
      setEmail('');
      setName('');
    }
  };

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Flavor Isle Newsletter | Smiths Grove, KY"
        description="Join the Flavor Isle newsletter for updates on new menu items, seasonal shakes, and special events. Sign up with your email."
      />
      <Navbar />
      <CartDrawer />

      <section className="bg-patina-mint text-white px-4 sm:px-6 py-16">
        <div className="max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-smashie-yellow text-obsidian-roast px-4 py-1.5 rounded-full font-heading text-sm tracking-wide mb-6">
            <Sparkles size={16} /> FLAVOR ISLE NEWSLETTER
          </div>
          <h1 className="font-heading text-4xl sm:text-5xl leading-tight">
            Get the Scoop
          </h1>
          <p className="font-body text-lg text-white/90 mt-4 max-w-lg mx-auto">
            Be first to hear about new menu items, seasonal shakes, and special events at the Isle.
          </p>
        </div>
      </section>

      <section className="max-w-xl mx-auto px-4 sm:px-6 py-12">
        <div className="card-diner p-8">
          {status === 'done' ? (
            <div className="text-center py-6">
              <div className="w-14 h-14 rounded-full bg-midnight-cherry/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={28} className="text-midnight-cherry" />
              </div>
              <h2 className="font-heading text-2xl text-obsidian-roast mb-2">You're on the list!</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Thanks for subscribing — keep an eye on your inbox for updates from Flavor Isle.
              </p>
              <button
                onClick={() => setStatus('idle')}
                className="btn-mint chrome-hover mt-6 px-6 py-3 text-sm font-heading"
              >
                Sign up another email
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="nl-name" className="block text-xs font-heading uppercase tracking-widest text-muted-foreground mb-1.5">
                  Name <span className="text-muted-foreground/60 normal-case tracking-normal">(optional)</span>
                </label>
                <input
                  id="nl-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className="w-full px-4 py-3 bg-white border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                />
              </div>
              <div>
                <label htmlFor="nl-email" className="block text-xs font-heading uppercase tracking-widest text-muted-foreground mb-1.5">
                  Email
                </label>
                <input
                  id="nl-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full px-4 py-3 bg-white border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                />
              </div>
              {status === 'error' && errorMsg && (
                <p className="text-sm text-midnight-cherry">{errorMsg}</p>
              )}
              <button
                type="submit"
                disabled={status === 'submitting'}
                className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {status === 'submitting' ? (
                  <><Loader2 size={16} className="animate-spin" /> Subscribing…</>
                ) : (
                  <><Mail size={16} /> Subscribe</>
                )}
              </button>
              <p className="text-xs text-muted-foreground text-center leading-relaxed">
                By subscribing you agree to receive occasional emails from Flavor Isle. We'll never share your address, and you can unsubscribe anytime.
              </p>
            </form>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
}