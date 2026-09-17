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

// Post-order SMS opt-in capture. Non-blocking — sits on the order confirmation
// page so guests who just checked out can opt into order-status + deal texts in
// one tap. Writes to the SMSSubscriber entity with source='checkout'. Never
// gates order completion — guest checkout stays the default.
export default function CheckoutSmsOptIn() {
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
      await base44.entities.SMSSubscriber.create({ phone: normalized, opted_in: true, source: 'checkout', status: 'active' });
      setDone(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="card-diner p-5 flex items-center gap-3 bg-green-50">
        <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
        <p className="text-sm text-obsidian-roast">You're signed up for order updates &amp; deals by text. Reply STOP anytime to cancel.</p>
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
          <h3 className="font-heading text-lg text-obsidian-roast leading-none">Get order updates + deals by text?</h3>
          <p className="text-xs text-muted-foreground mt-1">Know the second your food's ready — plus occasional offers.</p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            type="tel" inputMode="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="(270) 555-0000" aria-label="Mobile number for SMS updates"
            className="flex-1 min-w-0 px-4 py-3 rounded-full bg-muted border border-border text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
          />
          <button type="submit" disabled={submitting} className="btn-cherry px-5 py-3 text-sm whitespace-nowrap disabled:opacity-60 tap-44">
            {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Sign Up'}
          </button>
        </div>
        <label className="flex items-start gap-2.5 cursor-pointer">
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} className="mt-0.5 w-5 h-5 rounded flex-shrink-0 accent-midnight-cherry" />
          <span className="text-xs text-muted-foreground leading-relaxed">
            I agree to receive recurring automated order notifications and marketing text messages from Flavor Isle. Consent isn't a condition of purchase. Msg &amp; data rates may apply. Reply STOP to cancel or HELP for help. See our{' '}
            <Link to="/privacy-policy" className="text-midnight-cherry underline hover:no-underline">Privacy Policy</Link> and{' '}
            <Link to="/terms-of-service" className="text-midnight-cherry underline hover:no-underline">Terms of Service</Link>.
          </span>
        </label>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </form>
    </div>
  );
}