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

// Post-order SMS opt-in. Two independent, optional, unchecked choices:
// (1) transactional order updates / pay-by-text, (2) recurring promotional
// offers. Neither is required. Logged-in customers who already have both
// proven consents see a concise already-subscribed state instead of the form.
export default function CheckoutSmsOptIn() {
  const { status, phone: cachedPhone, loading } = useSmsConsentStatus(true);
  const [phone, setPhone] = useState('');
  const [txConsent, setTxConsent] = useState(false);
  const [mkConsent, setMkConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  // Prefill phone from the logged-in profile once it resolves.
  React.useEffect(() => {
    if (cachedPhone) setPhone(cachedPhone);
  }, [cachedPhone]);

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
        sourcePage: 'checkout_post_order',
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

  if (loading) {
    return (
      <div className="card-diner p-5 flex items-center gap-3">
        <Loader2 size={18} className="animate-spin text-muted-foreground" />
        <p className="text-sm text-muted-foreground">Checking your text preferences…</p>
      </div>
    );
  }

  if (bothAlready) {
    return (
      <div className="card-diner p-5 flex items-center gap-3 bg-green-50">
        <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
        <p className="text-sm text-obsidian-roast">You're already signed up for order updates and offers by text. Reply STOP anytime to cancel.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card-diner p-5 flex items-center gap-3 bg-green-50">
        <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
        <p className="text-sm text-obsidian-roast">You're signed up! Reply STOP anytime to cancel, HELP for help.</p>
      </div>
    );
  }

  return (
    <div className="card-diner p-5 text-left">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0">
          <MessageSquare size={18} className="text-midnight-cherry" />
        </div>
        <div>
          <h3 className="font-heading text-lg text-obsidian-roast leading-none">Get texts from Flavor Isle</h3>
          <p className="text-xs text-muted-foreground mt-1">Pick what you want — both are optional.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="(270) 555-0000" aria-label="Mobile number for SMS"
            className="flex-1 min-w-0 px-4 py-3 rounded-full bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
          />
          <button type="submit" disabled={submitting} className="btn-cherry px-5 py-3 text-sm whitespace-nowrap disabled:opacity-60 tap-44">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Sign Up'}
          </button>
        </div>

        {!alreadyTx && (
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={txConsent} onChange={e => setTxConsent(e.target.checked)} className="mt-0.5 w-5 h-5 rounded flex-shrink-0 accent-midnight-cherry" />
            <span className="text-xs text-muted-foreground leading-relaxed">
              Send me order status updates (confirmed, preparing, ready) and a secure pay-by-text link from Flavor Isle. Optional and not a condition of purchase. Msg &amp; data rates may apply. Reply STOP to cancel, HELP for help. See our{' '}
              <a href={SMS_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-midnight-cherry underline hover:no-underline">Privacy Policy</a> and{' '}
              <a href={SMS_TERMS_URL} target="_blank" rel="noopener noreferrer" className="text-midnight-cherry underline hover:no-underline">Terms of Service</a>.
            </span>
          </label>
        )}

        {!alreadyMk && (
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input type="checkbox" checked={mkConsent} onChange={e => setMkConsent(e.target.checked)} className="mt-0.5 w-5 h-5 rounded flex-shrink-0 accent-midnight-cherry" />
            <span className="text-xs text-muted-foreground leading-relaxed">
              Yes, send me recurring promotional offers and specials from Flavor Isle. Consent is not a condition of purchase. Message frequency varies (typically a few per month). Msg &amp; data rates may apply. Reply STOP to cancel, HELP for help. See our{' '}
              <a href={SMS_TERMS_URL} target="_blank" rel="noopener noreferrer" className="text-midnight-cherry underline hover:no-underline">Terms of Service</a> and{' '}
              <a href={SMS_POLICY_URL} target="_blank" rel="noopener noreferrer" className="text-midnight-cherry underline hover:no-underline">Privacy Policy</a>.
            </span>
          </label>
        )}

        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>
    </div>
  );
}