import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, Clock, CreditCard, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import DateNightFrame from '@/components/dateNight/DateNightFrame';

function whenLabel(iso) {
  const at = new Date(iso);
  if (!iso || Number.isNaN(at.getTime())) return '';
  return at.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

const mods = (line) => (line.selected_mods || []).map((mod) => mod?.name).filter(Boolean);

function PersonTicket({ name, lines }) {
  const subtotal = lines.reduce((sum, line) => sum + (Number(line.line_total) || 0), 0);
  return (
    <div className="dn-person">
      <div className="dn-person-head">
        <p className="dn-person-name">{name}</p>
        <span className="dn-person-sub">${subtotal.toFixed(2)}</span>
      </div>
      {lines.length === 0 ? (
        <p className="dn-slot-note">Nothing picked yet.</p>
      ) : (
        <ul className="list-none p-0 m-0">
          {lines.map((line) => (
            <li key={line.id} className="dn-receipt-line">
              <span>
                {line.item_name}
                {mods(line).length > 0 && <span className="dn-receipt-mods">{mods(line).join(', ')}</span>}
              </span>
              <span>${(Number(line.line_total) || 0).toFixed(2)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Date Night for Two (issue #357), third beat: control is back with whoever is
// paying. Either person can pay. The whole ticket is shown with each person's
// subtotal and paid once through the group order payment path; the order itself
// is only created when that payment is confirmed.
export default function DateNightPay() {
  const { code } = useParams();
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [payer, setPayer] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const checkedReturn = useRef(false);

  const apply = useCallback((data) => {
    if (data?.group) setView(data);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('getGroupOrder', { code });
      const data = res?.data || res;
      if (!data?.ok) throw new Error(data?.error || 'We could not open that ticket.');
      apply(data);
      setLoadError('');
    } catch (err) {
      setLoadError(err?.response?.data?.error || err?.message || 'We could not open that ticket.');
    } finally {
      setLoading(false);
    }
  }, [code, apply]);

  useEffect(() => { load(); }, [load]);

  // Back from the secure payment page: ask the server whether the ticket is paid.
  useEffect(() => {
    if (checkedReturn.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') !== '1') return;
    checkedReturn.current = true;
    base44.functions
      .invoke('checkGroupOrderPayment', { code })
      .then((res) => apply(res?.data || res))
      .catch(() => {})
      .finally(() => {
        params.delete('paid');
        const qs = params.toString();
        window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
      });
  }, [code, apply]);

  const group = view?.group;
  const host = group?.host_name || '';
  const partner = group?.partner_name || '';
  const hostLines = (view?.lines || []).filter((line) => line.participant_name === host);
  const partnerLines = (view?.lines || []).filter((line) => line.participant_name === partner);
  const bothIn = hostLines.length > 0 && partnerLines.length > 0;
  const paid = group?.status === 'paid';
  const open = group?.status === 'open';

  const pay = async () => {
    setError('');
    if (!payer) { setError('Choose who is paying.'); return; }
    setBusy(true);
    try {
      const res = await base44.functions.invoke('payGroupOrder', {
        code,
        payer_name: payer,
        return_path: `/date-night/pay/${code}`,
      });
      const data = res?.data || res;
      if (!data?.checkoutUrl) throw new Error(data?.error || 'The secure payment page could not be opened.');
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'The secure payment page could not be opened.');
      setBusy(false);
    }
  };

  const shell = (children) => (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Date Night for Two — pay once | Flavor Isle"
        description="One ticket for two people, paid once on our secure payment page. Pickup only at Flavor Isle in Smiths Grove."
      />
      <Navbar />
      <CartDrawer />
      <div className="px-4 sm:px-6 py-8">
        <div className="max-w-3xl mx-auto">{children}</div>
      </div>
      <Footer />
    </div>
  );

  if (loading) {
    return shell(
      <div className="text-center py-20">
        <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin mx-auto" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
        <p className="font-heading text-sm text-muted-foreground mt-3">Opening the ticket…</p>
      </div>,
    );
  }

  if (loadError || !group) {
    return shell(
      <div className="text-center py-16">
        <h1 className="font-heading text-2xl text-obsidian-roast mb-2">This ticket isn&apos;t available</h1>
        <p className="text-muted-foreground mb-6">{loadError || 'Check the link and try again.'}</p>
        <Link to="/date-night" className="btn-cherry chrome-hover inline-block px-6 py-3 text-sm font-heading">
          Start a date night
        </Link>
      </div>,
    );
  }

  return shell(
    <DateNightFrame>
      <div>
        <h2 className="dn-h">The two of you</h2>
        <p className="dn-sub">{host} and {partner}. Pickup only, and the two of you arrive separately.</p>
        <div className={`dn-status ${paid ? 'is-paid' : open ? '' : 'is-closed'}`}>
          {paid ? <Check size={16} /> : open ? <Clock size={16} /> : <Lock size={16} />}
          <span>
            {paid
              ? `Paid${group.order_number ? `, order #${group.order_number}` : ''}. The picks are locked.`
              : open
                ? `This invite is open until ${whenLabel(group.closes_at)}.`
                : `This invite expired ${whenLabel(group.closes_at)}. Nothing was charged and no order was placed.`}
          </span>
        </div>
      </div>

      <div>
        <h3 className="dn-h">The whole ticket</h3>
        <div className="dn-ticket">
          <PersonTicket name={host} lines={hostLines} />
          <PersonTicket name={partner} lines={partnerLines} />
        </div>
        <div className="dn-receipt-total mt-3">
          <span>Total</span>
          <span>${Number(view?.total || 0).toFixed(2)}</span>
        </div>
      </div>

      {paid ? (
        <p className="dn-hint">The kitchen has it. Nothing else to do.</p>
      ) : !open ? (
        <p className="dn-hint">This one has closed. Start a new date night from the Date Night page.</p>
      ) : (
        <div>
          <h3 className="dn-h">Who&apos;s paying?</h3>
          <p className="dn-sub">Either of you can. It is one payment for the whole ticket.</p>
          <div className="dn-who">
            {[host, partner].filter(Boolean).map((name) => (
              <button
                key={name}
                type="button"
                className={`dn-who-btn ${payer === name ? 'is-on' : ''}`}
                onClick={() => setPayer(name)}
                aria-pressed={payer === name}
              >
                I&apos;m {name}
              </button>
            ))}
          </div>

          {!bothIn ? (
            <p className="dn-hint">
              Waiting on {hostLines.length === 0 ? host : partner}&apos;s picks. The ticket can be paid once both of you are in.
            </p>
          ) : (
            <>
              <button
                type="button"
                className="dn-btn dn-btn-wide"
                onClick={pay}
                disabled={busy || !payer}
              >
                {busy ? (
                  <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CreditCard size={16} /> Pay now · ${Number(view?.total || 0).toFixed(2)}
                  </>
                )}
              </button>
              <p className="dn-hint mt-2">One payment on our secure payment page. The kitchen gets the ticket once it is paid.</p>
              {error && <p className="dn-error">{error}</p>}
            </>
          )}
        </div>
      )}
    </DateNightFrame>,
  );
}