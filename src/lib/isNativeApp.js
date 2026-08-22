// Detects whether the app is running inside the native mobile build
// (Capacitor iOS/Android shell) or as an installed standalone PWA —
// vs. a regular browser tab on the public website. Used to gate
// app-only features like the combo builder.
export function isNativeApp() {
  if (typeof window === 'undefined') return false;

  // Capacitor injects window.Capacitor on native iOS/Android builds.
  if (window.Capacitor && typeof window.Capacitor.isNativePlatform === 'function') {
    try {
      if (window.Capacitor.isNativePlatform()) return true;
    } catch (_) {}
  }

  // Installed PWA ("Add to Home Screen" / display-mode: standalone).
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }

  // Legacy iOS Safari standalone flag.
  if (window.navigator && window.navigator.standalone) {
    return true;
  }

  return false;
}