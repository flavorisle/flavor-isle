import React, { useState, useEffect } from 'react';
import { Info, AlertTriangle, Zap } from 'lucide-react';
import { getMenuSetting } from '@/lib/menuSettings';

// Site-wide notice banner shown at the very top of every page. Controlled by
// the admin SiteNoticePanel (Store Settings page). Uses the shared
// getMenuSetting cache so it doesn't add an extra API call.
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
      .then(s => { if (active) setNotice(s.site_notice || null); })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  if (!notice?.active || !notice.message?.trim()) return null;

  const style = LEVEL_STYLES[notice.level] || LEVEL_STYLES.warning;
  const { bg, text, border, Icon } = style;

  return (
    <div className={`w-full ${bg} ${text} border-b ${border}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center gap-2.5">
        <Icon size={16} className="flex-shrink-0" />
        <p className="text-sm font-heading uppercase tracking-wide flex-1 min-w-0 leading-snug">
          {notice.message}
        </p>
      </div>
    </div>
  );
}