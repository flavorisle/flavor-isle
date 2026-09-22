import React, { useState } from 'react';
import { MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';
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

// Footer SMS opt-in: two independent, optional, unchecked choices for
// transactional order updates and recurring promotional offers. Logged-in
// customers with both proven consents see a concise already-subscribed state.
export default function FooterSmsOptIn() {
  const { status, phone: cachedPhone, loading } = useSmsConsentStatus(true);
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
    if (!normalized) { setError('Enter a valid 10-digit mobile number.'); return; }
    const finalTx = alreadyTx || txConsent;
    const finalMk = alreadyMk || mkConsent;
    if (!finalTx && !finalMk) { setError('Please check at least one box to opt in.'); return; }
    setSubmitting(true);
    try {
      const res = await base44.functions.invoke('upsertSmsConsent', {
        phone: normalized,
        transactionalConsent: finalTx,
        marketingConsent: finalMk,
        sourcePage: 'footer',
        disclosureVersion: SMS_CONSENT_VERSION,
        disclosureText: finalMk && finalTx
          ? `${TRANSACTIONAL_DISCLOSURE_TEXT} ${MARKETING_DISCLOSURE_TEXT}`
          : finalMk ? MARKETING_DISCLOSURE_TEXT : TRANSACTIONAL_DISCLOSURE_TEXT,
      });
      if (!res.data?.ok) throw new Error(res.data?.error || 'Failed');
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t border-white/10 px-4 sm:px-6 py-8">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        <div>
          <h4 className="font-heading text-sm uppercase tracking-widest mb-2 text-[hsl(var(--primary))] flex items-center gap-2">
            <MessageSquare size={16} /> TEXT UPDATES FROM FLAVOR ISLE
          </h4>
          <p className="text-gray-300 text-sm leading-relaxed">
            Choose order status alerts, recurring offers, or both — each is optional.{' '}
            <a href="/sms-signup" className="underline hover:text-white">Full sign-up page →</a>
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <Loader2 size={16} className="animate-spin" /> Checking your text preferences…
          </div>
        ) : bothAlready ? (
          <div className="flex items-center gap-2 text-sm text-gray-200">
            <CheckCircle2 size={18} className="text-[hsl(var(--primary))]" /> You're already signed up for order updates and offers. Reply STOP anytime to cancel.
          </div>
        ) : done ? (
          <div className="flex items-center gap-2 text-sm text-gray-200">
            <CheckCircle2 size={18} className="text-[hsl(var(--primary))]" /> You're signed up! Reply STOP anytime to cancel, HELP for help.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="(270) 555-0000" aria-label="Mobile number for SMS"
                className="flex-1 min-w-0 px-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              />
              <button type="submit" disabled={submitting} className="btn-cherry px-5 py-3 text-sm whitespace-nowrap disabled:opacity-60 tap-44">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Sign Up'}
              </button>
            </div>

            {!alreadyTx && (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={txConsent} onChange={e => setTxConsent(e.target.checked)} className="mt-0.5 w-5 h-5 rounded flex-shrink-0 accent-[#CC3300]" />
                <span className="text-xs text-gray-400 leading-relaxed">
                  Send me order status alerts (confirmed, preparing, ready) and pay-by-text links from Flavor Isle. Optional and not a condition of purchase. Msg &amp; data rates may apply. Reply STOP to cancel, HELP for help. See our{' '}
                  <a href={SMS_POLICY_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Privacy Policy</a> and{' '}
                  <a href={SMS_TERMS_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Terms of Service</a>.
                </span>
              </label>
            )}

            {!alreadyMk && (
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={mkConsent} onChange={e => setMkConsent(e.target.checked)} className="mt-0.5 w-5 h-5 rounded flex-shrink-0 accent-[#CC3300]" />
                <span className="text-xs text-gray-400 leading-relaxed">
                  Yes, send me recurring promotional offers from Flavor Isle. Consent is not a condition of purchase. Message frequency varies (a few per month). Msg &amp; data rates may apply. Reply STOP to cancel, HELP for help. See our{' '}
                  <a href={SMS_TERMS_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Terms of Service</a> and{' '}
                  <a href={SMS_POLICY_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Privacy Policy</a>.
                </span>
              </label>
            )}

            {error && <p className="text-xs text-red-300">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}