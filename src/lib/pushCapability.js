// What this device can actually do with web push.
//
// Every browser except iOS Safari can subscribe straight from the page. iOS
// only allows web push from a web app that has been added to the Home Screen
// (iOS 16.4+), so on iPhone in Safari the honest answer is "add us to your
// Home Screen first" rather than a button that silently fails.
export function detectPushCapability() {
  if (typeof window === 'undefined') {
    return { isIOS: false, isStandalone: false, supported: false, canSubscribe: false, needsInstall: false };
  }

  const ua = window.navigator.userAgent || '';
  // iPadOS 13+ reports itself as a Mac; the touch point count gives it away.
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (window.navigator.platform === 'MacIntel' && (window.navigator.maxTouchPoints || 0) > 1);

  // navigator.standalone is the iOS-only "opened from the Home Screen" flag.
  const iosNavigator = /** @type {any} */ (window.navigator);
  const isStandalone =
    window.matchMedia?.('(display-mode: standalone)')?.matches === true ||
    iosNavigator.standalone === true;

  const supported =
    'serviceWorker' in window.navigator &&
    'PushManager' in window &&
    'Notification' in window;

  // On iOS the installed web app is the only place push exists.
  const canSubscribe = supported && (!isIOS || isStandalone);

  return {
    isIOS,
    isStandalone,
    supported,
    canSubscribe,
    needsInstall: isIOS && !isStandalone,
  };
}

// True when the browser has already been told no — Safari will not re-prompt,
// so we show settings steps instead of a button that does nothing.
export function pushPermission() {
  if (typeof Notification === 'undefined') return 'default';
  return Notification.permission;
}
