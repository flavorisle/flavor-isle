import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Check, Clock, Lock } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import ModifierModal from '@/components/ModifierModal';
import DateNightFrame from '@/components/dateNight/DateNightFrame';
import DateNightRows from '@/components/dateNight/DateNightRows';
import DateNightSummary from '@/components/dateNight/DateNightSummary';
import DateNightReceipt from '@/components/dateNight/DateNightReceipt';
import { getMenuItems } from '@/lib/menuCache';
import { getMenuSetting } from '@/lib/menuSettings';
import { SLOT_ORDER, itemsBySlot, suggestedSide, dateNightSlot, lineToApi, slimLine } from '@/lib/dateNight';
import { saltNoteText } from '@/lib/sideSalt';

const REQUIRED = ['burger', 'side', 'shake'];

function whenLabel(iso) {
  const at = new Date(iso);
  if (!iso || Number.isNaN(at.getTime())) return '';
  return at.toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit' });
}

const receiptLines = (lines = []) => lines.map((line) => ({
  id: line.item_id,
  name: line.item_name,
  price: line.line_total,
  selectedModifiers: line.selected_mods || [],
}));

// Date Night for Two (issue #358), second beat: the person who was sent the link
// sees both names and their date's picks, agrees to the suggested side or swaps
// it through the same real sheet, then adds their own burger, shake and optional
// cake to the same ticket.
export default function DateNightForTwoInvite() {
  const { code } = useParams();
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [items, setItems] = useState([]);
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const [picks, setPicks] = useState({});
  const [agreeOpen, setAgreeOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await base44.functions.invoke('getGroupOrder', { code });
        const data = res?.data || res;
        if (!data?.ok) throw new Error(data?.error || 'We could not open that invite.');
        if (active) setView(data);
      } catch (err) {
        if (active) setLoadError(err?.response?.data?.error || err?.message || 'We could not open that invite.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    (async () => {
      try {
        const [menu, setting] = await Promise.all([getMenuItems(), getMenuSetting().catch(() => null)]);
        if (!active) return;
        setItems(menu || []);
        setHiddenCategories(setting?.hidden_categories || []);
      } catch { /* the rows show their empty state if the menu cannot load */ }
    })();
    return () => { active = false; };
  }, [code]);

  const group = view?.group;
  const host = group?.host_name || '';
  const partner = group?.partner_name || '';
  const hostLines = useMemo(() => (view?.lines || []).filter((line) => line.participant_name === host), [view, host]);
  const partnerLines = useMemo(() => (view?.lines || []).filter((line) => line.participant_name === partner), [view, partner]);
  const saved = partnerLines.length > 0;

  const itemById = useMemo(() => new Map((items || []).map((item) => [item.id, item])), [items]);

  const bySlot = useMemo(() => {
    const skip = new Set(hiddenCategories || []);
    return itemsBySlot((items || []).filter((item) => {
      const key = item.display_category || item.square_category || item.category;
      return !skip.has(key);
    }));
  }, [items, hiddenCategories]);

  const hostLineFor = (slot) => hostLines.find((line) => {
    const item = itemById.get(line.item_id);
    return item && dateNightSlot(item) === slot;
  });

  const hostSideLine = hostLineFor('side');
  const suggestedItem = (hostSideLine && itemById.get(hostSideLine.item_id)) || suggestedSide(bySlot.side);

  const setPick = (slot, line) => setPicks((prev) => ({ ...prev, [slot]: slimLine(line) }));
  const clearPick = (slot) => setPicks((prev) => {
    const next = { ...prev };
    delete next[slot];
    return next;
  });

  const agreeConfirm = (selectedMods, extraCost, _label, _toppings, _combo, _allergy, coreLevel, saltNote) => {
    if (!suggestedItem) return;
    setPick('side', {
      ...suggestedItem,
      name: suggestedItem.name,
      price: Number(suggestedItem.price || 0) + extraCost,
      selectedModifiers: selectedMods,
      flavorLevel: coreLevel || undefined,
      saltNote: saltNoteText(saltNote) || undefined,
    });
    setAgreeOpen(false);
  };

  const total = SLOT_ORDER.reduce((sum, slot) => sum + (Number(picks[slot]?.price) || 0), 0);
  const ready = REQUIRED.every((slot) => picks[slot]);

  const save = async () => {
    if (!ready || saving) return;
    setError('');
    setSaving(true);
    try {
      const res = await base44.functions.invoke('addGroupOrderLines', {
        code,
        participant_name: partner,
        lines: SLOT_ORDER.map((slot) => picks[slot]).filter(Boolean).map(lineToApi),
      });
      const data = res?.data || res;
      if (!data?.ok) throw new Error(data?.error || 'Your picks could not be saved.');
      setView(data);
      setPicks({});
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'Your picks could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const shell = (children, sticky) => (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Date Night for Two — your picks | Flavor Isle"
        description="Pick your burger, your side and your shake. One ticket for two people, paid once, pickup only at Flavor Isle in Smiths Grove."
      />
      <Navbar />
      <CartDrawer />
      <div className="dn2-page">
        {children}
        {sticky}
      </div>
      <Footer />
    </div>
  );

  if (loading) {
    return shell(
      <div className="text-center py-20">
        <div className="w-10 h-10 border-4 border-gray-200 rounded-full animate-spin mx-auto" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
        <p className="font-heading text-sm text-muted-foreground mt-3">Opening your invite…</p>
      </div>,
    );
  }

  if (loadError || !group) {
    return shell(
      <div className="text-center py-16">
        <h1 className="font-heading text-2xl text-obsidian-roast mb-2">This invite isn&apos;t available</h1>
        <p className="text-muted-foreground mb-6">{loadError || 'Check the link and try again.'}</p>
        <Link to="/date-night" className="btn-cherry chrome-hover inline-block px-6 py-3 text-sm font-heading">
          Start a date night
        </Link>
      </div>,
    );
  }

  if (group.kind !== 'date_night') {
    return shell(
      <div className="text-center py-16">
        <h1 className="font-heading text-2xl text-obsidian-roast mb-2">This is a group order</h1>
        <p className="text-muted-foreground mb-6">Open it from the group order link you were sent.</p>
        <Link to={`/group-order/${code}`} className="btn-cherry chrome-hover inline-block px-6 py-3 text-sm font-heading">
          Open the group order
        </Link>
      </div>,
    );
  }

  const paid = group.status === 'paid';
  const open = group.status === 'open';

  const hostBurger = hostLineFor('burger');
  const hostShake = hostLineFor('shake');

  return shell(
    <DateNightFrame
      forTwo
      eyebrow="Est. 1964 · Smiths Grove, KY"
      lede={`${host} picked first. Your turn: your burger, your shake, and your say on the side.`}
    >
      <section className="dn2-block">
        <h2 className="dn2-h">The two of you</h2>

        <DateNightSummary
          name1={host}
          burger={hostBurger ? { name: hostBurger.item_name } : null}
          shake={hostShake ? { name: hostShake.item_name } : null}
          name2={partner}
          partnerLine={saved ? 'picked' : ''}
        />

        <div className={`dn-status mt-4 ${paid ? 'is-paid' : open ? '' : 'is-closed'}`}>
          {paid ? <Check size={18} /> : open ? <Clock size={18} /> : <Lock size={18} />}
          <span>
            {paid
              ? `Paid${group.order_number ? `, order #${group.order_number}` : ''}. The picks are locked.`
              : open
                ? `This invite is open until ${whenLabel(group.closes_at)}.`
                : `This invite expired ${whenLabel(group.closes_at)}. Nothing was charged and no order was placed.`}
          </span>
        </div>
      </section>

      <section className="dn2-block">
        <h2 className="dn2-h">{host}&apos;s picks</h2>
        <DateNightReceipt name={host} lines={receiptLines(hostLines)} />
      </section>

      {paid ? (
        <section className="dn2-block">
          <h2 className="dn2-h">Your picks</h2>
          <DateNightReceipt name={partner} lines={receiptLines(partnerLines)} />
          <p className="dn-hint">The kitchen has it. Nothing else to do.</p>
        </section>
      ) : !open ? (
        <p className="dn-hint">This one has closed. Start a new date night from the Date Night page.</p>
      ) : saved ? (
        <section className="dn2-block">
          <h2 className="dn2-h">Your picks are in</h2>
          <DateNightReceipt name={partner} lines={receiptLines(partnerLines)} />
          <p className="dn-hint mb-3">Hand it back to whoever is paying, or pay it yourself.</p>
          <Link to={`/date-night/pay/${code}`} className="dn-btn dn-btn-wide">
            Open the payment screen <ArrowRight size={16} />
          </Link>
        </section>
      ) : (
        <>
          <DateNightRows
            id="dn2-burger"
            heading="Your burger"
            items={bySlot.burger}
            pickedId={picks.burger?.id}
            onPicked={(line) => setPick('burger', line)}
            onClear={() => clearPick('burger')}
          />

          <DateNightRows
            id="dn2-side"
            heading="Share a side"
            items={bySlot.side}
            pickedId={picks.side?.id}
            agree={suggestedItem ? {
              hostName: host,
              item: suggestedItem,
              onAgree: () => setAgreeOpen(true),
              onSwap: () => {
                document.getElementById('dn2-side')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              },
            } : null}
            onPicked={(line) => setPick('side', line)}
            onClear={() => clearPick('side')}
          />

          <DateNightRows
            id="dn2-shake"
            heading="Your shake"
            items={bySlot.shake}
            pickedId={picks.shake?.id}
            onPicked={(line) => setPick('shake', line)}
            onClear={() => clearPick('shake')}
          />

          <DateNightRows
            id="dn2-cake"
            heading="Sweet finish"
            optional
            note="Optional. All four cakes, at their live menu price."
            items={bySlot.cake}
            pickedId={picks.cake?.id}
            onPicked={(line) => setPick('cake', line)}
            onClear={() => clearPick('cake')}
          />

          <p className="dn-foot">Pickup only, and the two of you arrive separately.</p>
        </>
      )}

      {agreeOpen && suggestedItem && (
        <ModifierModal
          item={suggestedItem}
          initialCartItem={hostSideLine ? { selectedModifiers: hostSideLine.selected_mods || [] } : undefined}
          confirmLabel="Agree to the side"
          onClose={() => setAgreeOpen(false)}
          onConfirm={agreeConfirm}
        />
      )}
    </DateNightFrame>,

    !saved && open && !paid ? (
      <>
        {error && <p className="dn-error mt-3">{error}</p>}
        <div className="dn2-sticky">
          <div>
            <p className="dn2-sticky-label">Your total</p>
            <p className="dn2-sticky-total">${total.toFixed(2)}</p>
          </div>
          <button type="button" className="dn-btn" onClick={save} disabled={!ready || saving}>
            {saving ? 'Saving…' : 'Send my picks'} <ArrowRight size={16} />
          </button>
        </div>
        <p className="dn-foot mt-3">
          {ready ? 'Then one of you pays for the whole ticket once.' : 'Pick your burger, your side and your shake.'}
        </p>
      </>
    ) : null,
  );
}