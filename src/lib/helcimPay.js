// HelcimPay.js — Helcim's own card form, rendered as an iframe modal over our
// own page. The session token is minted server-side (createHelcimPaySession);
// nothing here ever sees an amount or a card number.
//
// The checkout domain has to be whitelisted in the Helcim API Access
// Configuration that issued the API token, otherwise Helcim refuses to render.
const SCRIPT_SRC = 'https://secure.helcim.app/helcim-pay/services/start.js';
const IFRAME_ID = 'helcimPayIframe';

// Loads Helcim's start.js once and resolves when appendHelcimPayIframe exists.
export function loadHelcimPay() {
  if (typeof window !== 'undefined' && typeof window.appendHelcimPayIframe === 'function') {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    const script = existing || document.createElement('script');
    const onLoad = () => {
      if (typeof window.appendHelcimPayIframe === 'function') resolve();
      else reject(new Error('Helcim did not become ready.'));
    };
    const onError = () => reject(new Error('Helcim could not be loaded.'));
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

// Renders the payment modal for a checkout token.
export function openHelcimPay(checkoutToken) {
  if (typeof window.appendHelcimPayIframe !== 'function') {
    throw new Error('Helcim is not ready yet.');
  }
  window.appendHelcimPayIframe(checkoutToken);
}

// Removes the iframe so the customer can use the page underneath it again.
export function closeHelcimPay() {
  const frame = document.getElementById(IFRAME_ID);
  if (frame) frame.remove();
}