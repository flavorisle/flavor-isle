import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

// Normalize a US phone number to E.164. Accepts 10-digit, 11-digit (leading 1),
// or already-international numbers.
function toE164(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (digits.length > 11 && raw.trim().startsWith('+')) return raw.trim();
  return null;
}

export default function SMSSignup() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const normalized = toE164(phone);
    if (!normalized) { setError('Please enter a valid 10-digit mobile number.'); return; }
    if (!consent) { setError('Please agree to receive texts from Flavor Isle.'); return; }
    setSubmitting(true);
    try {
      await base44.entities.SMSSubscriber.create({
        phone: normalized,
        name: name.trim() || undefined,
        opted_in: true,
        source: 'website',
        status: 'active',
      });
      setDone(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 sm:px-6 py-12 sm:py-20">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-midnight-cherry/10 text-midnight-cherry flex items-center justify-center mx-auto mb-4">
            <MessageSquare size={28} />
          </div>
          <p className="font-heading text-midnight-cherry text-sm tracking-[0.3em] mb-2">FLAVOR ISLE</p>
          <h1 className="font-heading text-4xl sm:text-5xl text-obsidian-roast leading-tight">Get Texts from Flavor Isle</h1>
          <p className="text-muted-foreground mt-3 text-base">
            Be first to know about new shakes, secret specials, and limited-time deals — sent straight to your phone.
          </p>
        </div>

        {done ? (
          <div className="card-diner p-8 text-center">
            <CheckCircle2 size={48} className="text-midnight-cherry mx-auto mb-4" />
            <h2 className="font-heading text-2xl text-obsidian-roast mb-2">You're on the list!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              Watch your phone for the latest from Flavor Isle. You can text STOP anytime to opt out.
            </p>
            <Link to="/" className="btn-mint chrome-hover px-6 py-3 text-sm font-heading inline-block">Back to Home</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="card-diner p-6 sm:p-8 space-y-5">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Name (optional)</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith"
                className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Mobile Number *</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="(270) 555-0000"
                className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}
                className="mt-1 w-5 h-5 rounded border-border text-midnight-cherry focus:ring-midnight-cherry/30" />
              <span className="text-sm text-muted-foreground leading-relaxed">
                I agree to receive recurring automated marketing text messages from Flavor Isle at the number provided. Consent is not a condition of purchase. Msg & data rates may apply. Text STOP to opt out, HELP for help.
              </span>
            </label>

            {error && (
              <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-2xl p-3 text-sm">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
              {submitting ? <><Loader2 size={16} className="animate-spin" /> Signing you up…</> : 'Sign Me Up'}
            </button>
            <p className="text-xs text-muted-foreground text-center">
              By signing up you agree to our <Link to="/terms-of-service" className="text-midnight-cherry underline">Terms of Service</Link> and <Link to="/privacy-policy" className="text-midnight-cherry underline">Privacy Policy</Link>.
            </p>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}