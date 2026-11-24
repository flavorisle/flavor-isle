import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Users, Share2, Check, Lock, Clock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import GroupMenuCards from '@/components/groupOrder/GroupMenuCards';
import GroupBagPanel from '@/components/groupOrder/GroupBagPanel';
import GroupLinesPanel from '@/components/groupOrder/GroupLinesPanel';
import GroupPayPanel from '@/components/groupOrder/GroupPayPanel';
import { getMenuItems } from '@/lib/menuCache';
import { getMenuSetting } from '@/lib/menuSettings';

const nameKey = (code) => `flavor-isle-group-name-${code}`;

function closeTimeLabel(iso) {
  if (!iso) return '';
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return '';
  return at.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

// The participant view of one group order (issue #356). Everyone adds their own
// items with the menu's own cards and the real modifier sheet; the lines collect
// on one pickup ticket, and one person pays for the whole group.
export default function GroupOrderRoom() {
  const { code } = useParams();
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [items, setItems] = useState([]);
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const [participant, setParticipant] = useState(() => {
    try { return localStorage.getItem(nameKey(code)) || ''; } catch { return ''; }
  });
  const [payer, setPayer] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState('');
  const [copied, setCopied] = useState(false);
  const checkedReturn = useRef(false);

  const applyView = useCallback((data) => {
    if (!data?.group) return;
    setView(data);
    setPayer((prev) => prev || data.group.host_name || '');
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await base44.functions.invoke('getGroupOrder', { code });
      const data = res?.data || res;
      if (!data?.ok) throw new Error(data?.error || 'We could not open that group.');
      applyView(data);
      setLoadError('');
    } catch (err) {
      setLoadError(err?.response?.data?.error || err?.message || 'We could not open that group.');
    } finally {
      setLoading(false);
    }
  }, [code, applyView]);

  useEffect(() => { load(); }, [load]);

  // The menu the participants order from — the same live rows the menu page reads.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [menu, setting] = await Promise.all([getMenuItems(), getMenuSetting().catch(() => null)]);
        if (!active) return;
        setItems(menu || []);
        setHiddenCategories(setting?.hidden_categories || []);
      } catch { /* the cards simply show nothing if the menu cannot load */ }
    })();
    return () => { active = false; };
  }, []);

  // Back from the secure payment page: ask the server whether the ticket is paid.
  useEffect(() => {
    if (checkedReturn.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('paid') !== '1') return;
    checkedReturn.current = true;
    base44.functions
      .invoke('checkGroupOrderPayment', { code })
      .then((res) => applyView(res?.data || res))
      .catch(() => {})
      .finally(() => {
        params.delete('paid');
        const qs = params.toString();
        window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
      });
  }, [code, applyView]);

  // Keep everyone's items current while the group is open.
  useEffect(() => {
    if (!view || view.group.status !== 'open') return undefined;
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, [view?.group?.status, load]);

  const onName = (value) => {
    setParticipant(value);
    try { localStorage.setItem(nameKey(code), value); } catch { /* storage unavailable */ }
  };

  const share = async () => {
    const url = window.location.href.split('?')[0];
    try {
      if (navigator.share) {
        await navigator.share({ title: view?.group?.title || 'Group order', text: 'Add your items to our group order', url });
        return;
      }
    } catch { /* share sheet dismissed */ }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* the link is in the address bar */ }
  };

  const pay = async () => {
    setPayError('');
    if (!payer.trim()) { setPayError('Add the name of the person paying.'); return; }
    setPayBusy(true);
    try {
      const res = await base44.functions.invoke('payGroupOrder', { code, payer_name: payer.trim() });
      const data = res?.data || res;
      if (!data?.checkoutUrl) throw new Error(data?.error || 'The secure payment page could not be opened.');
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setPayError(err?.response?.data?.error || err?.message || 'The secure payment page could not be opened.');
      setPayBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-vanilla-malt">
        <Navbar />
        <CartDrawer />
        <div className="text-center py-24">
          <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin mx-auto" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
          <p className="font-heading text-sm text-muted-foreground mt-3">Opening the group…</p>
        </div>
      </div>
    );
  }

  if (loadError || !view) {
    return (
      <div className="min-h-screen bg-vanilla-malt">
        <Navbar />
        <CartDrawer />
        <div className="max-w-lg mx-auto px-4 py-24 text-center">
          <h1 className="font-heading text-2xl text-obsidian-roast mb-2">This group isn't available</h1>
          <p className="text-muted-foreground mb-6">{loadError || 'Check the link and try again.'}</p>
          <Link to="/group-order" className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading inline-block">
            Start a group order
          </Link>
        </div>
      </div>
    );
  }

  const { group, lines, participants, total } = view;
  const paid = group.status === 'paid';
  const open = group.status === 'open';
  const lockedReason = paid
    ? `Paid by ${group.paid_by_name || 'the group'}${group.order_number ? ` · Order #${group.order_number}` : ''}. The items are locked.`
    : open
      ? ''
      : `This group closed ${closeTimeLabel(group.closes_at)}. Items are locked and an unpaid group isn't sent to the kitchen.`;

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title={`${group.title || 'Group order'} — Flavor Isle`}
        description="Add your items to the group order. One pickup ticket, one payment."
      />
      <Navbar />
      <CartDrawer />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-5">
        <header className="card-diner p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-heading uppercase tracking-widest text-xs text-midnight-cherry mb-1">Group order</p>
              <h1 className="font-heading text-2xl sm:text-3xl text-obsidian-roast leading-tight">{group.title}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Started by {group.host_name} · {participants.length} {participants.length === 1 ? 'person' : 'people'}
              </p>
            </div>
            <button onClick={share} className="tap-44 flex items-center justify-center px-3 py-2 rounded-full bg-muted text-obsidian-roast hover:bg-white transition-colors" aria-label="Share the group link">
              {copied ? <Check size={18} className="text-patina-mint" /> : <Share2 size={18} />}
            </button>
          </div>

          <div className={`mt-4 flex items-center gap-2 text-sm rounded-xl px-3 py-2.5 ${
            paid ? 'bg-patina-mint/10 text-patina-mint'
              : open ? 'bg-midnight-cherry/5 text-midnight-cherry'
                : 'bg-muted text-muted-foreground'
          }`}>
            {paid ? <Check size={15} /> : open ? <Clock size={15} /> : <Lock size={15} />}
            <span>
              {paid
                ? `Paid by ${group.paid_by_name || 'the group'}${group.order_number ? ` · Order #${group.order_number}` : ''}`
                : open
                  ? `Closes ${closeTimeLabel(group.closes_at)}`
                  : `Closed ${closeTimeLabel(group.closes_at)}`}
            </span>
          </div>
        </header>

        {!paid && (
          <div className="card-diner p-5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Your first name
            </label>
            <input
              type="text"
              value={participant}
              onChange={(e) => onName(e.target.value)}
              placeholder="Dana"
              disabled={!open}
              className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry disabled:opacity-60"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Your items are labelled with this name so the kitchen knows whose is whose.
            </p>
          </div>
        )}

        <GroupLinesPanel
          code={code}
          participantName={participant.trim()}
          lines={lines}
          locked={!open}
          onUpdated={applyView}
        />

        {open && (
          <GroupBagPanel
            code={code}
            participantName={participant}
            canAdd={open && !!participant.trim()}
            onUpdated={applyView}
          />
        )}

        <GroupPayPanel
          participants={participants}
          total={total}
          payerName={payer}
          onPayerName={setPayer}
          onPay={pay}
          busy={payBusy}
          error={payError}
          canPay={open && lines.length > 0 && !!payer.trim()}
          lockedReason={lockedReason}
        />

        {open ? (
          <section>
            <div className="flex items-center gap-3 mb-3">
              <Users size={18} className="text-midnight-cherry" />
              <h2 className="font-heading text-xl text-obsidian-roast">Add your items</h2>
            </div>
            {!participant.trim() && (
              <p className="text-sm text-muted-foreground mb-3">Add your first name above, then pick from the menu.</p>
            )}
            <GroupMenuCards items={items} hiddenCategories={hiddenCategories} />
          </section>
        ) : (
          <section className="card-diner p-5">
            <h2 className="font-heading text-lg text-obsidian-roast mb-3">Everyone's items</h2>
            <ul className="space-y-2 text-sm">
              {lines.map((line) => (
                <li key={line.id} className="flex justify-between gap-3">
                  <span className="text-obsidian-roast">
                    {line.item_name} <span className="text-muted-foreground">· {line.participant_name}</span>
                    {(line.mods || []).length > 0 && (
                      <span className="block text-xs text-muted-foreground">{line.mods.join(', ')}</span>
                    )}
                  </span>
                  <span className="text-muted-foreground">${Number(line.line_total).toFixed(2)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <p className="text-center text-xs text-muted-foreground">
          Pickup only · <Link to="/menu" className="underline">Full menu</Link>
        </p>
      </div>

      <Footer />
    </div>
  );
}