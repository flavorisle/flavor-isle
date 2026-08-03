import React from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import usePushNotifications from '@/hooks/usePushNotifications';

export default function PushNotificationPrompt() {
  const { supported, permission, subscribed, loading, subscribe, unsubscribe } = usePushNotifications();

  if (!supported) {
    return (
      <div className="card-diner p-6 opacity-80">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
            <BellOff size={15} className="text-midnight-cherry" />
          </div>
          <div>
            <h3 className="font-heading text-lg text-obsidian-roast mb-1">Push Notifications</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Push notifications aren't supported on this browser. Try Chrome, Edge, or install Flavor Isle to your home screen.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const blocked = permission === 'denied';

  return (
    <div className="card-diner p-6">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-9 h-9 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
          <Bell size={15} className="text-midnight-cherry" />
        </div>
        <div>
          <h3 className="font-heading text-lg text-obsidian-roast mb-1">Push Notifications</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Get a ping the moment your order hits the kitchen and when it's ready — plus the occasional deal or daily special.
          </p>
        </div>
      </div>

      {subscribed ? (
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-green-700">
            <span className="w-2 h-2 rounded-full bg-green-500" /> Notifications are on
          </span>
          <button
            onClick={unsubscribe}
            disabled={loading}
            className="text-sm font-heading text-muted-foreground hover:text-destructive transition-colors disabled:opacity-60 tap-44"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Turn off'}
          </button>
        </div>
      ) : blocked ? (
        <p className="text-sm text-muted-foreground">
          You've blocked notifications for this site. Enable them in your browser settings to get order updates.
        </p>
      ) : (
        <button
          onClick={subscribe}
          disabled={loading}
          className="btn-cherry chrome-hover w-full py-3.5 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60 tap-44"
        >
          {loading ? <><Loader2 size={16} className="animate-spin" /> Enabling…</> : <><Bell size={16} /> Enable Notifications</>}
        </button>
      )}
    </div>
  );
}