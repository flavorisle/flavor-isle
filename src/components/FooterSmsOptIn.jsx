import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { MessageSquare, CheckCircle2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function toE164(raw) {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return null;
}

// Footer SMS opt-in: phone collection field + full A2P 10DLC disclosure
// (brand, message types, frequency, rates, STOP/HELP, privacy + terms links).
export default function FooterSmsOptIn() {
  const [phone, setPhone] = useState('');
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const normalized = toE164(phone);
    if (!normalized) { setError('Enter a valid 10-digit mobile number.'); return; }
    if (!consent) { setError('Please check the box to agree to receive texts.'); return; }
    setSubmitting(true);
    try {
      await base44.entities.SMSSubscriber.create({ phone: normalized, opted_in: true, source: 'website_footer', status: 'active' });
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
            Get order status alerts (confirmed, preparing, ready), pay-by-text links, and occasional offers by SMS.{' '}
            <Link to="/sms-signup" className="underline hover:text-white">Full sign-up page &amp; in-store QR code →</Link>
          </p>
        </div>

        {done ? (
          <div className="flex items-center gap-2 text-sm text-gray-200">
            <CheckCircle2 size={18} className="text-[hsl(var(--primary))]" /> You're signed up for Flavor Isle texts. Reply STOP anytime to cancel.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="(270) 555-0000" aria-label="Mobile number for SMS updates"
                className="flex-1 min-w-0 px-4 py-3 rounded-full bg-white/10 border border-white/20 text-white placeholder:text-gray-400 text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              />
              <button type="submit" disabled={submitting} className="btn-cherry px-5 py-3 text-sm whitespace-nowrap disabled:opacity-60 tap-44">
                {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Sign Up'}
              </button>
            </div>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 w-5 h-5 rounded flex-shrink-0 accent-[#CC3300]" />
              <span className="text-xs text-gray-400 leading-relaxed">
                By checking this box and submitting my number, I agree to receive recurring automated order notifications, payment links, and marketing text messages from Flavor Isle at the number provided. Consent is not a condition of purchase. Message frequency varies. Msg &amp; data rates may apply. Reply STOP to cancel or HELP for help. See our{' '}
                <Link to="/privacy-policy" className="underline hover:text-white">Privacy Policy</Link> and{' '}
                <Link to="/terms-of-service" className="underline hover:text-white">Terms of Service</Link>.
              </span>
            </label>
            {error && <p className="text-xs text-red-300">{error}</p>}
          </form>
        )}
      </div>
    </div>
  );
}