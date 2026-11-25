import React, { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import Seo from '@/components/Seo';
import DateNightFrame from '@/components/dateNight/DateNightFrame';
import DateNightRows from '@/components/dateNight/DateNightRows';
import DateNightSummary from '@/components/dateNight/DateNightSummary';
import DateNightReviews from '@/components/dateNight/DateNightReviews';
import DateNightInvitePanel from '@/components/dateNight/DateNightInvitePanel';
import { getMenuItems } from '@/lib/menuCache';
import { getMenuSetting } from '@/lib/menuSettings';
import {
  SLOT_ORDER, itemsBySlot, suggestedSide, lineToApi, slimLine, readDraft, saveDraft, clearDraft,
} from '@/lib/dateNight';

const REQUIRED = ['burger', 'side', 'shake'];

// Date Night for Two (issue #358), first beat, on its own page. Both names, one
// burger, one side, one shake and an optional cake — every row is the menu's own
// card and sheet. Sending creates the invite on the #356 group order layer and
// hands the link to the phone's share sheet. The site sends no text and no email.
export default function DateNightForTwo() {
  const [items, setItems] = useState([]);
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [picks, setPicks] = useState({});
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [invite, setInvite] = useState(null);

  useEffect(() => {
    const draft = readDraft();
    if (draft) {
      setName1(draft.name1 || '');
      setName2(draft.name2 || '');
      setPicks(draft.picks || {});
      if (draft.invite?.url) setInvite(draft.invite);
    }
    let active = true;
    (async () => {
      try {
        const [menu, setting] = await Promise.all([getMenuItems(), getMenuSetting().catch(() => null)]);
        if (!active) return;
        setItems(menu || []);
        setHiddenCategories(setting?.hidden_categories || []);
      } catch { /* the rows show their empty state if the menu cannot load */ }
    })();
    return () => { active = false; };
  }, []);

  const bySlot = useMemo(() => {
    const skip = new Set(hiddenCategories || []);
    const visible = (items || []).filter((item) => {
      const key = item.display_category || item.square_category || item.category;
      return !skip.has(key);
    });
    return itemsBySlot(visible);
  }, [items, hiddenCategories]);

  const side = suggestedSide(bySlot.side);

  const remember = (next) => {
    saveDraft({ name1: next.name1, name2: next.name2, picks: next.picks, invite: next.invite });
  };

  const onName = (which, value) => {
    if (which === 1) setName1(value); else setName2(value);
    remember({ name1: which === 1 ? value : name1, name2: which === 2 ? value : name2, picks, invite });
  };

  const setPick = (slot, line) => {
    const nextPicks = { ...picks, [slot]: slimLine(line) };
    setPicks(nextPicks);
    remember({ name1, name2, picks: nextPicks, invite });
  };

  const clearPick = (slot) => {
    const nextPicks = { ...picks };
    delete nextPicks[slot];
    setPicks(nextPicks);
    remember({ name1, name2, picks: nextPicks, invite });
  };

  const total = SLOT_ORDER.reduce((sum, slot) => sum + (Number(picks[slot]?.price) || 0), 0);
  const ready = REQUIRED.every((slot) => picks[slot]) && !!name1.trim() && !!name2.trim();

  const share = async (url) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Date Night for Two',
          text: `${name1.trim() || 'Your date'} picked first. Your turn.`,
          url,
        });
        return;
      }
    } catch { /* dismissed, the link stays on screen */ }
    try { await navigator.clipboard.writeText(url); } catch { /* the link stays on screen */ }
  };

  const send = async () => {
    if (!ready || sending) return;
    setError('');
    setSending(true);
    try {
      const res = await base44.functions.invoke('createDateNightInvite', {
        name1: name1.trim(),
        name2: name2.trim(),
        lines: SLOT_ORDER.map((slot) => picks[slot]).filter(Boolean).map(lineToApi),
      });
      const data = res?.data || res;
      if (!data?.ok || !data.url) throw new Error(data?.error || 'The invite could not be sent.');
      const next = { code: data.code, url: data.url, closes_at: data.closes_at };
      setInvite(next);
      remember({ name1, name2, picks, invite: next });
      share(data.url);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || 'The invite could not be sent.');
    } finally {
      setSending(false);
    }
  };

  const startOver = () => {
    clearDraft();
    setInvite(null);
    setPicks({});
    setError('');
  };

  const hint = !name1.trim() || !name2.trim()
    ? 'Add both first names, then send it.'
    : !ready
      ? 'Pick your burger, your side and your shake.'
      : 'Your date opens the link, picks their food, then one of you pays once.';

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <Seo
        title="Date Night for Two — Flavor Isle"
        description="Two burgers, one basket of fries, two hand-spun shakes. Pick yours, send it to your date, and pay once at Flavor Isle in Smiths Grove."
      />
      <Navbar />
      <CartDrawer />

      <div className="dn2-page">
        <DateNightFrame
          forTwo
          eyebrow="Est. 1964 · Smiths Grove, KY"
          lede="Two burgers, one basket of fries, two hand-spun shakes. Pick yours, then send it to your date and let them pick theirs."
        >
          <section className="dn2-block">
            <h2 className="dn2-h">The two of you</h2>
            <p className="dn2-note">Both first names, exactly as they should print on the kitchen ticket.</p>

            <div className="dn-names">
              <div className="dn-field">
                <label htmlFor="dn2-name1">Your name</label>
                <input
                  id="dn2-name1"
                  type="text"
                  value={name1}
                  onChange={(event) => onName(1, event.target.value)}
                  autoComplete="given-name"
                  placeholder="Dana"
                />
              </div>
              <div className="dn-field">
                <label htmlFor="dn2-name2">Your date</label>
                <input
                  id="dn2-name2"
                  type="text"
                  value={name2}
                  onChange={(event) => onName(2, event.target.value)}
                  placeholder="Sam"
                />
              </div>
            </div>

            <DateNightSummary
              name1={name1}
              burger={picks.burger}
              shake={picks.shake}
              name2={name2}
              partnerLine={invite ? 'picking next' : ''}
            />
          </section>

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
            note={side ? `We suggest ${side.name}.` : null}
            items={bySlot.side}
            pickedId={picks.side?.id}
            suggestedId={side?.id}
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

          <DateNightReviews />

          {invite && (
            <DateNightInvitePanel
              invite={invite}
              name2={name2}
              onShare={() => share(invite.url)}
              onStartOver={startOver}
            />
          )}

          <p className="dn-foot">Pickup only, and the two of you arrive separately.</p>
        </DateNightFrame>

        {error && <p className="dn-error mt-3">{error}</p>}

        <div className="dn2-sticky">
          <div>
            <p className="dn2-sticky-label">Running total</p>
            <p className="dn2-sticky-total">${total.toFixed(2)}</p>
          </div>
          {invite ? (
            <button type="button" className="dn-btn" onClick={() => share(invite.url)}>
              Share the link again
            </button>
          ) : (
            <button type="button" className="dn-btn" onClick={send} disabled={!ready || sending}>
              {sending ? 'Sending…' : 'Send it to my date'} <Send size={16} />
            </button>
          )}
        </div>

        <p className="dn-foot mt-3">{hint}</p>
      </div>

      <Footer />
    </div>
  );
}