import React, { useCallback, useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import CommunicationChannel from '@/components/account/CommunicationChannel';
import { MARKETING_DISCLOSURE_TEXT } from '@/lib/smsConsent';

export default function CommunicationPreferences({ phone }) {
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const load = useCallback(async (action = 'status') => {
    const { data } = await base44.functions.invoke('accountCommunicationPreferences', { action });
    if (data?.error) throw new Error(data.error);
    setStatus(data);
    return data;
  }, []);
  useEffect(() => {
    let alive = true;
    base44.functions.invoke('accountCommunicationPreferences', { action: 'status' })
      .then(({ data }) => { if (alive) { if (data?.error) setError(data.error); else setStatus(data); } })
      .catch(err => { if (alive) setError(err.message || 'Could not load preferences.'); });
    return () => { alive = false; };
  }, [load, phone]);
  const change = async (action) => {
    setBusy(action); setError(''); setMessage('');
    try {
      const next = await load(action);
      setMessage(action === 'emailOn' && next.email === 'pending'
        ? 'Check your email to confirm your subscription.'
        : action.endsWith('Off') ? 'Marketing messages unsubscribed.' : 'Marketing messages subscribed.');
    } catch (err) { setError(err.response?.data?.error || err.message || 'Could not save preferences.'); }
    finally { setBusy(''); }
  };
  return (
    <section aria-label="Marketing subscriptions" className="mt-5">
      <p className="text-sm text-muted-foreground mb-3">These choices only affect offers and newsletters. Order updates are separate.</p>
      {!status && !error && <p role="status" className="text-sm">Loading subscriptions…</p>}
      {error && <p role="alert" className="text-sm text-destructive mb-3">{error} <button type="button" onClick={() => load().catch(e => setError(e.message))} className="underline tap-44">Retry</button></p>}
      {message && <p role="status" className="text-sm text-patina-mint mb-3">{message}</p>}
      {status && <>
        <CommunicationChannel title="Marketing emails" detail="Newsletters and special offers"
          status={status.email === 'active' ? 'Subscribed' : status.email === 'pending' ? 'Awaiting email confirmation' : 'Not subscribed'}
          active={status.email === 'active'} pending={status.email === 'pending'} busy={busy === 'emailOn' || busy === 'emailOff'}
          disabled={!!busy} onChange={() => change(status.email === 'active' || status.email === 'pending' ? 'emailOff' : 'emailOn')} />
        <CommunicationChannel title="Marketing texts" detail={status.phone ? `Offers to ${status.phone}` : 'Add a phone number to your profile to subscribe'}
          status={status.sms === 'active' ? 'Subscribed' : 'Not subscribed'} active={status.sms === 'active'}
          disabled={!status.phone || !!busy} busy={busy === 'smsOn' || busy === 'smsOff'}
          onChange={() => change(status.sms === 'active' ? 'smsOff' : 'smsOn')} />
        <p className="text-sm text-muted-foreground leading-relaxed">{MARKETING_DISCLOSURE_TEXT}</p>
      </>}
    </section>
  );
}