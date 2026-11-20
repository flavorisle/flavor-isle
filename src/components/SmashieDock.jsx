import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import SmashieChat from '@/components/SmashieChat';
import { getMenuSetting } from '@/lib/menuSettings';
import { isHappyHourActive } from '@/lib/happyHour';
import { optimizedImageUrl } from '@/lib/utils';

// Issue #340 (D2) — Smashie as a dock on every public page.
//
// The panel holds the existing SmashieChat component untouched (same agent, same
// status context, same messages); the dock only adds the launcher, the two quick
// chips and the close behaviour. The page behind never stops scrolling: the
// panel is a fixed box and nothing here touches body/html overflow. Escape closes
// it and focus goes back to the dock button. Never rendered on an /admin route.
const SMASHIE_HEAD = optimizedImageUrl('https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/b05945903_smashiehead.png', 160, 160);

export default function SmashieDock() {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [ask, setAsk] = useState(null);
  const [happyHourOn, setHappyHourOn] = useState(false);
  const btnRef = useRef(null);
  const askCount = useRef(0);

  // The Happy Hour chip only exists while the window is actually open — the same
  // lib + admin record the countdown reads.
  useEffect(() => {
    let alive = true;
    const check = () => getMenuSetting()
      .then((s) => { if (alive) setHappyHourOn(isHappyHourActive(s)); })
      .catch(() => {});
    check();
    const id = setInterval(check, 60000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // The mobile tab bar's Smashie tab opens the dock instead of a separate chat.
  useEffect(() => {
    const handler = () => { setEverOpened(true); setOpen(true); };
    window.addEventListener('flavorisle:open-smashie', handler);
    return () => window.removeEventListener('flavorisle:open-smashie', handler);
  }, []);

  const close = () => {
    setOpen(false);
    setAsk(null);
    // Focus returns to the button that opened the panel.
    requestAnimationFrame(() => btnRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') close(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const askSmashie = (text) => {
    askCount.current += 1;
    setAsk({ text, n: askCount.current });
  };

  if (location.pathname.startsWith('/admin')) return null;

  return (
    <>
      {!open && (
        <button
          ref={btnRef}
          onClick={() => { setEverOpened(true); setOpen(true); }}
          aria-label="Chat with Smashie"
          aria-expanded={open}
          className="fixed right-4 md:right-6 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-6 z-[80] w-14 h-14 rounded-full shadow-float-lg ring-4 ring-white/90 hover:scale-105 transition-transform"
        >
          <img src={SMASHIE_HEAD} alt="" className="w-full h-full object-cover rounded-full" />
          <span className="absolute -bottom-1 -right-1 rounded-full bg-midnight-cherry px-1.5 py-0.5 font-heading text-[10px] text-white shadow-float">
            CHAT
          </span>
        </button>
      )}

      {/* Mounted once, on first open, then kept mounted so one visit keeps one
          conversation; closing only hides it. */}
      {everOpened && (
        <div className={`${open ? 'fixed inset-x-2 sm:inset-x-auto sm:right-6 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] md:bottom-6 z-[90] sm:w-96 h-[min(560px,calc(100dvh-9rem))] flex' : 'hidden'} flex-col rounded-3xl bg-white border border-border shadow-float-lg overflow-hidden`}>
          {/* Quick chips — a tap drops the question into the chat's input. */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-border flex-shrink-0 bg-white">
            <button
              onClick={() => askSmashie("What's good today?")}
              className="rounded-full border border-border px-2.5 py-1 font-heading text-[11px] uppercase tracking-wider text-obsidian-roast hover:border-midnight-cherry/50 hover:text-midnight-cherry transition-colors"
            >
              What&apos;s good today?
            </button>
            {happyHourOn && (
              <button
                onClick={() => askSmashie('What is the Happy Hour deal right now?')}
                className="rounded-full bg-smashie-yellow px-2.5 py-1 font-heading text-[11px] uppercase tracking-wider text-obsidian-roast hover:bg-yellow-500 transition-colors"
              >
                Happy Hour
              </button>
            )}
          </div>

          <div className="flex-1 min-h-0 flex">
            <SmashieChat embedded onClose={close} ask={ask} />
          </div>
        </div>
      )}
    </>
  );
}