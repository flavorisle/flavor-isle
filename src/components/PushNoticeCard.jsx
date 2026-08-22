import React from 'react';
import { Bell, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import usePushNotifications from '@/hooks/usePushNotifications';

// Small promotional box for the landing page letting customers know push
// notifications are available, with a one-tap enable action.
export default function PushNoticeCard() {
  const { supported, permission, subscribed, loading, subscribe } = usePushNotifications();

  if (!supported) return null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6">
      <div className="card-diner p-4 flex items-center gap-4 bg-gradient-to-r from-midnight-cherry/5 to-patina-mint/5 border border-patina-mint/20">
        <div className="w-11 h-11 bg-midnight-cherry rounded-full flex items-center justify-center flex-shrink-0">
          <Bell size={20} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-heading text-sm text-obsidian-roast leading-tight">Instant Ready Alerts</p>
          <p className="text-xs text-muted-foreground leading-snug">Turn on push notifications and get pinged the second your food is ready.</p>
        </div>
        {subscribed ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-700 flex-shrink-0">
            <span className="w-2 h-2 rounded-full bg-green-500" /> On
          </span>
        ) : permission === 'denied' ? (
          <Link to="/account" className="text-xs font-heading text-patina-mint hover:text-midnight-cherry flex-shrink-0 whitespace-nowrap">Enable in settings →</Link>
        ) : (
          <button
            onClick={subscribe}
            disabled={loading}
            className="btn-cherry px-4 py-2 text-xs font-heading flex items-center gap-1.5 disabled:opacity-60 tap-44 flex-shrink-0"
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Bell size={13} />} Enable
          </button>
        )}
      </div>
    </div>
  );
}