import React, { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import DateNightFrame from './DateNightFrame';
import DateNightSlotPicker from './DateNightSlotPicker';
import DateNightReceipt from './DateNightReceipt';
import DateNightInvitePanel from './DateNightInvitePanel';
import { getMenuItems } from '@/lib/menuCache';
import { getMenuSetting } from '@/lib/menuSettings';
import {
  SLOT_ORDER, itemsBySlot, suggestedSide, picksToLines, lineToApi, slimLine, readDraft, saveDraft, clearDraft,
} from '@/lib/dateNight';

const REQUIRED = ['burger', 'side', 'shake'];

// Date Night for Two (issue #357), first beat: both names, then one burger, one
// side, one shake and an optional cake, each picked through the menu's own card
// and sheet. Sending creates the invite on the group order layer and hands the
// link to the phone's share sheet. The site sends no text and no email.
export default function DateNightSection() {
  const [items, setItems] = useState([]);
  const [hiddenCategories, setHiddenCategories] = useState([]);
  const [name1, setName1] = useState('');
  const [name2, setName2] = useState('');
  const [picks, setPicks] = useState({});
  const [openSlot, setOpenSlot] = useState('burger');
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
      } catch { /* the cards simply show nothing if the menu cannot load */ }
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

  const ready = REQUIRED.every((slot) => picks[slot]) && !!name1.trim() && !!name2.trim();
  const hint = !name1.trim() || !name2.trim()
    ? 'Both first names, then send it.'
    : !ready
      ? 'Pick your burger, your side and your shake.'
      : 'Your date opens the link, picks their food, then one of you pays once.';

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
      const next = { code: data.code, url: data.url, closes_at: data.closes_at, lines: picksToLines(picks) };
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
    setOpenSlot('burger');
    setError('');
  };

  const slotProps = (slot) => ({
    items: bySlot[slot],
    picked: picks[slot],
    open: openSlot === slot,
    onToggle: (next) => setOpenSlot(next ? slot : ''),
    onPick: (line) => setPick(slot, line),
    onClear: () => clearPick(slot),
  });

  return (
    <DateNightFrame>
      <div>
        <h3 className="dn-h">The two of you</h3>
        <p className="dn-sub">Both first names, exactly as they should print on the kitchen ticket.</p>
        <div className="dn-names">
          <div className="dn-field">
            <label htmlFor="dn-name1">Your name</label>
            <input
              id="dn-name1"
              type="text"
              value={name1}
              onChange={(event) => onName(1, event.target.value)}
              autoComplete="given-name"
              placeholder="Dana"
            />
          </div>
          <div className="dn-field">
            <label htmlFor="dn-name2">Your date&apos;s name</label>
            <input
              id="dn-name2"
              type="text"
              value={name2}
              onChange={(event) => onName(2, event.target.value)}
              placeholder="Sam"
            />
          </div>
        </div>
      </div>

      {!invite && (
      <div className="dn-slots">
        <DateNightSlotPicker heading="Your burger" {...slotProps('burger')} />
        <DateNightSlotPicker
          heading="Share a side"
          note={side ? `We suggest ${side.name}.` : null}
          {...slotProps('side')}
        />
        <DateNightSlotPicker heading="Your shake" {...slotProps('shake')} />
        <DateNightSlotPicker
          heading="Sweet finish"
          optional
          note="Optional. All four cakes, at their live menu price."
          {...slotProps('cake')}
        />
      </div>
      )}

      <div className="dn-send">
        <DateNightReceipt name={name1} lines={invite?.lines || picksToLines(picks)} />

        {invite ? (
          <DateNightInvitePanel
            invite={invite}
            name2={name2}
            onShare={() => share(invite.url)}
            onStartOver={startOver}
          />
        ) : (
          <>
            <button
              type="button"
              className="dn-btn dn-btn-wide"
              onClick={send}
              disabled={!ready || sending}
            >
              {sending ? 'Sending…' : 'Send it to my date'} <Send size={16} />
            </button>
            <p className="dn-hint">{hint}</p>
            {error && <p className="dn-error">{error}</p>}
          </>
        )}
        <p className="dn-foot">Pickup only, and the two of you arrive separately.</p>
      </div>
    </DateNightFrame>
  );
}