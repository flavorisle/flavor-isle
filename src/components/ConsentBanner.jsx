import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

const STORAGE_KEY = 'flavor_isle_consent_v1';

// Push the visitor's consent choice to Google consent mode v2 and the Meta
// Pixel. Called on mount (to re-apply a saved choice) and on accept/decline.
function applyConsent(granted) {
  if (typeof window === 'undefined') return;
  const value = granted ? 'granted' : 'denied';
  if (typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
      analytics_storage: value,
    });
  }
  if (typeof window.fbq === 'function') {
    window.fbq('consent', granted ? 'grant' : 'revoke');
  }
}

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const choice = localStorage.getItem(STORAGE_KEY);
      if (!choice) {
        setVisible(true);
      } else {
        applyConsent(choice === 'granted');
      }
    } catch {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    try { localStorage.setItem(STORAGE_KEY, 'granted'); } catch {}
    applyConsent(true);
    setVisible(false);
  };

  const decline = () => {
    try { localStorage.setItem(STORAGE_KEY, 'denied'); } catch {}
    applyConsent(false);
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed left-0 right-0 z-[55] px-3 sm:px-4 consent-banner-pos">
      <div className="max-w-3xl mx-auto bg-white border border-border rounded-2xl shadow-float-lg p-4 sm:p-5 animate-float-up">
        <div className="flex items-start gap-3">
          <div className="hidden sm:flex w-10 h-10 rounded-full bg-midnight-cherry/10 items-center justify-center flex-shrink-0">
            <Cookie size={18} className="text-midnight-cherry" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-obsidian-roast leading-snug">
              We use cookies for analytics and ads to improve your experience. See our{' '}
              <Link to="/privacy-policy" className="text-patina-mint underline hover:text-midnight-cherry">
                Privacy Policy
              </Link>
              .
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={accept}
                className="btn-cherry px-5 py-2.5 text-xs font-heading"
              >
                Accept All
              </button>
              <button
                onClick={decline}
                className="px-5 py-2.5 text-xs font-heading rounded-full border border-border text-obsidian-roast hover:border-midnight-cherry/40 transition-colors"
              >
                Necessary Only
              </button>
            </div>
          </div>
          <button
            onClick={decline}
            aria-label="Dismiss and use necessary cookies only"
            className="p-1.5 text-muted-foreground hover:text-obsidian-roast transition-colors flex-shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}