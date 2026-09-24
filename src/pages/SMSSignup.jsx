import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import {
  SMS_CONSENT_VERSION,
  SMS_POLICY_URL,
  SMS_TERMS_URL,
  toE164,
  TRANSACTIONAL_DISCLOSURE_TEXT,
  MARKETING_DISCLOSURE_TEXT,
} from '@/lib/smsConsent';
import useSmsConsentStatus from '@/hooks/useSmsConsentStatus';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function SMSSignup() {
  const { status, phone: cachedPhone, loading } = useSmsConsentStatus(true);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [txConsent, setTxConsent] = useState(false);
  const [mkConsent, setMkConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => { if (cachedPhone) setPhone(cachedPhone); }, [cachedPhone]);

  const alreadyTx = status?.status === 'active' && !!status?.transactional_consent;
  const alreadyMk = status?.status === 'active' && !!status?.marketing_consent && !!status?.proven_marketing_consent;
  const bothAlready = alreadyTx && alreadyMk;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const normalized = toE164(phone);
    if (!normalized) { setError('Please enter a valid 10-digit mobile number.'); return; }
    const finalTx = alreadyTx || txConsent;
    const finalMk = alreadyMk || mkConsent;
    if (!finalTx && !finalMk) { setError('Please check at least one box to opt in.'); return; }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('upsertSmsConsent', {
        phone: normalized,
        name: name.trim() || undefined,
        transactionalConsent: finalTx,
        marketingConsent: finalMk,
        sourcePage: 'sms_signup',
        disclosureVersion: SMS_CONSENT_VERSION,
        disclosureText: finalMk && finalTx
          ? `${TRANSACTIONAL_DISCLOSURE_TEXT} ${MARKETING_DISCLOSURE_TEXT}`
          : finalMk ? MARKETING_DISCLOSURE_TEXT : TRANSACTIONAL_DISCLOSURE_TEXT,
      });
      if (!res.data?.ok) throw new Error(res.data?.error || 'Failed');
      setDone(true);
    } catch (err) {
      setError(err?.message || 'Something went wrong. Please try again.');
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
          <h1 className="font-heading text-4xl sm:text-5xl text-obsidian-roast leading-tight">Texts From Flavor Isle</h1>
          <p className="text-muted-foreground mt-3 text-base">
            Pick what you want — order status updates, recurring offers, or both. Each is optional and never required to order. Text STOP anytime to opt out.
          </p>
        </div>

        {loading ? (
          <div className="card-diner p-8 text-center">
            <Loader2 size={24} className="animate-spin mx-auto text-midnight-cherry" />
            <p className="text-sm text-muted-foreground mt-3">Checking your text preferences…</p>
          </div>
        ) : bothAlready ? (
          <div className="card-diner p-8 text-center">
            <CheckCircle2 size={48} className="text-midnight-cherry mx-auto mb-4" />
            <h2 className="font-heading text-2xl text-obsidian-roast mb-2">You're all set!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              You're already signed up for order updates and recurring offers. Reply STOP anytime to opt out, HELP for help.
            </p>
            <Link to="/" className="btn-mint chrome-hover px-6 py-3 text-sm font-heading inline-block">Back to Home</Link>
          </div>
        ) : done ? (
          <div className="card-diner p-8 text-center">
            <CheckCircle2 size={48} className="text-midnight-cherry mx-auto mb-4" />
            <h2 className="font-heading text-2xl text-obsidian-roast mb-2">You're signed up!</h2>
            <p className="text-muted-foreground text-sm mb-6">
              We'll send the texts you asked for. Reply STOP anytime to opt out, HELP for help.
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

            {!alreadyTx && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={txConsent} onChange={e => setTxConsent(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-border text-midnight-cherry focus:ring-midnight-cherry/30" />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  Send me order status notifications (confirmed, preparing, ready) and payment links from Flavor Isle. Optional and not a condition of purchase. Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help.
                </span>
              </label>
            )}

            {!alreadyMk && (
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={mkConsent} onChange={e => setMkConsent(e.target.checked)}
                  className="mt-1 w-5 h-5 rounded border-border text-midnight-cherry focus:ring-midnight-cherry/30" />
                <span className="text-sm text-muted-foreground leading-relaxed">
                  Yes, send me recurring promotional offers and specials from Flavor Isle. Consent is not a condition of purchase. Message frequency varies (a few per month). Msg &amp; data rates may apply. Reply STOP to opt out, HELP for help. See our{' '}
                  <a href={SMS_TERMS_URL} target="_blank" rel="noopener noreferrer" className="text-midnight-cherry underline">Terms of Service</a> and{' '}
                  <a href={SMS_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-midnight-cherry underline">Privacy Policy</a>.
                </span>
              </label>
            )}

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
              By signing up you agree to our <a href={SMS_TERMS_URL} target="_blank" rel="noopener noreferrer" className="text-midnight-cherry underline">Terms of Service</a> and <a href={SMS_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-midnight-cherry underline">Privacy Policy</a>.
            </p>
          </form>
        )}
      </main>
      <Footer />
    </div>
  );
}