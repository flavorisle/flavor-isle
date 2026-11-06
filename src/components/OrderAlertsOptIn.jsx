import React, { useState } from 'react';
import { Bell, BellRing, Loader2, Share, CheckCircle2, AlertTriangle } from 'lucide-react';
import usePushNotifications from '@/hooks/usePushNotifications';

// Order alerts opt-in.
//
// Goal: the customer's iPhone lights up on the lock screen with "Order #123 is
// ready for pickup" without installing anything from an app store.
// What each device can actually do:
//   - iPhone/iPad: only once Flavor Isle sits on the Home Screen (iOS 16.4+),
//     so we show the two taps that get them there instead of a dead button.
//   - Android / desktop: one tap.
//   - Guests who just ordered: they type the email they ordered with and the
//     server checks it against the order before storing anything.
export default function OrderAlertsOptIn({ orderNumber = undefined, email: initialEmail = '', variant = 'card' } = {}) {
  const {
    needsInstall,
    supported,
    permission,
    subscribed,
    checking,
    loading,
    isLoggedIn,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  const [email, setEmail] = useState(initialEmail || '');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const blocked = permission === 'denied';
  const guestNeedsEmail = !isLoggedIn && !!orderNumber;

  const handleSubscribe = async () => {
    setError('');
    if (guestNeedsEmail && !email.trim()) {
      setError('Enter the email you ordered with so we send the right order alerts.');
      return;
    }
    const result = await subscribe({ email: email.trim() || undefined, orderNumber });
    if (!result.ok) {
      setError(
        result.reason === 'permission'
          ? "Your browser didn't allow notifications. You can turn them on for Flavor Isle in your device settings."
          : 'Something went wrong turning alerts on. Try again in a second.'
      );
      return;
    }
    setSent(true);
  };

  // Don't flash a card while we ask the service worker what's already on.
  if (checking) return null;

  const compact = variant === 'compact';
  const shell = compact ? 'card-diner p-4' : 'card-diner p-6';

  if (subscribed || sent) {
    return (
      <div className={shell}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-green-500/10 rounded-full flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={17} className="text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-heading text-base text-obsidian-roast">Order alerts are on</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              We'll ping this device when we get your order and again the moment it's ready.
            </p>
            <button
              onClick={unsubscribe}
              disabled={loading}
              className="mt-2 text-xs font-heading text-muted-foreground hover:text-destructive transition-colors disabled:opacity-60"
            >
              Turn off
            </button>
          </div>
        </div>
      </div>
    );
  }

  // iPhone (or iPad) in Safari: alerts only work from the Home Screen web app.
  if (needsInstall) {
    return (
      <div className={shell}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
            <BellRing size={17} className="text-midnight-cherry" />
          </div>
          <div>
            <h3 className="font-heading text-base text-obsidian-roast">Get a lock-screen ping when your order's ready</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              On iPhone, Apple only allows these alerts for sites saved to your Home Screen. It takes about 10 seconds:
            </p>
            <ol className="mt-3 space-y-2 text-sm text-obsidian-roast">
              <li className="flex gap-2">
                <span className="font-heading text-midnight-cherry">1.</span>
                <span className="inline-flex items-center gap-1.5 flex-wrap">
                  In Safari, tap the Share button
                  <Share size={14} className="inline text-midnight-cherry" aria-hidden="true" />
                  at the bottom of the screen.
                </span>
              </li>
              <li className="flex gap-2">
                <span className="font-heading text-midnight-cherry">2.</span>
                <span>Choose <strong>Add to Home Screen</strong>, then tap <strong>Add</strong>.</span>
              </li>
              <li className="flex gap-2">
                <span className="font-heading text-midnight-cherry">3.</span>
                <span>Open Flavor Isle from your new Home Screen icon and tap <strong>Turn on order alerts</strong>.</span>
              </li>
            </ol>
            <p className="text-xs text-muted-foreground mt-3">
              Already added us? Close this tab and open the Flavor Isle icon instead.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Nothing this browser can do, and nothing useful to say about it.
  if (!supported) return null;

  if (blocked) {
    return (
      <div className={shell}>
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-heading text-base text-obsidian-roast">Order alerts are blocked</h3>
            <p className="text-sm text-muted-foreground leading-relaxed mt-1">
              Notifications for Flavor Isle are turned off in this browser. Enable them in site settings to get the ping when your order's ready.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Guest at checkout: no order yet and no account, so there is nothing to tie
  // alerts to. They get the one-tap button on the confirmation screen instead.
  if (!isLoggedIn && !orderNumber) return null;

  return (
    <div className={shell}>
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
          <Bell size={16} className="text-midnight-cherry" />
        </div>
        <div className="flex-1">
          <h3 className="font-heading text-base text-obsidian-roast">
            {orderNumber ? "Get a lock-screen ping when it's ready" : 'Order alerts'}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">
            We'll buzz this device when we get your order and again the moment it's ready. No app store, no download.
          </p>

          {guestNeedsEmail && (
            <div className="mt-3">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">
                Email you ordered with
              </label>
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
              />
            </div>
          )}

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="btn-cherry chrome-hover w-full py-3 text-sm font-heading flex items-center justify-center gap-2 mt-3 disabled:opacity-60 tap-44"
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Turning on…</> : <><Bell size={16} /> Turn on order alerts</>}
          </button>

          {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        </div>
      </div>
    </div>
  );
}
