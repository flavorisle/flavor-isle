import React, { useState, useEffect } from 'react';
import { Info, AlertTriangle, Zap } from 'lucide-react';
import { getMenuSetting } from '@/lib/menuSettings';

// Site-wide notice banner shown at the very top of every page. Controlled by
// the admin SiteNoticePanel (Store Settings page). Uses the shared
// getMenuSetting cache so it doesn't add an extra API call.
//
// Issue #297 Part C: a manually written notice always wins; with nothing
// written, a paused delivery renders the admin's own paused-delivery sentence
// from Store settings → Delivery, so the top of the site can never say
// something the Delivery switch disagrees with.
const LEVEL_STYLES = {
  info: { bg: 'bg-patina-mint', text: 'text-white', border: 'border-black/10', Icon: Info },
  warning: { bg: 'bg-smashie-yellow', text: 'text-obsidian-roast', border: 'border-obsidian-roast/10', Icon: AlertTriangle },
  urgent: { bg: 'bg-midnight-cherry', text: 'text-white', border: 'border-black/10', Icon: Zap },
};

export default function SiteNoticeBanner() {
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    let active = true;
    getMenuSetting()
      .then(s => {
        if (!active) return;
        setNotice(s.site_notice || null);
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  const manual = notice?.active && notice.message?.trim() ? notice : null;
  if (!manual) return null;

  const { bg, text, border, Icon } = LEVEL_STYLES[manual.level] || LEVEL_STYLES.warning;

  return (
    <div className={`w-full ${bg} ${text} border-b ${border}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2.5">
        <Icon size={16} className="flex-shrink-0" />
        <p className="text-sm font-heading uppercase tracking-wide flex-1 min-w-0 leading-snug">
          {manual.message}
        </p>
      </div>
    </div>
  );
}