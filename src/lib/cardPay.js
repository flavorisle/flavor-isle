// The card form script, rendered as an iframe modal over our own page. The session
// token is minted server-side; nothing here ever sees an amount or a card number.
//
// The checkout domain has to be whitelisted in the card processor's own API access
// configuration that issued the token, otherwise the form refuses to render.
const SCRIPT_SRC = 'https://secure.helcim.app/helcim-pay/services/start.js';
// Both fixed by the script the processor serves: the iframe id it creates, and the
// global it uses to render into.
const IFRAME_ID = 'helcimPayIframe';

// Loads the processor's start.js once and resolves when its form hook exists.
export function loadCardPay() {
  if (typeof window !== 'undefined' && typeof window.appendHelcimPayIframe === 'function') {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    const script = existing || document.createElement('script');
    const onLoad = () => {
      if (typeof window.appendHelcimPayIframe === 'function') resolve();
      else reject(new Error('The secure payment form did not become ready.'));
    };
    const onError = () => reject(new Error('The secure payment form could not be loaded.'));
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
export function openCardPay(checkoutToken) {
  if (typeof window.appendHelcimPayIframe !== 'function') {
    throw new Error('The secure payment form is not ready yet.');
  }
  window.appendHelcimPayIframe(checkoutToken);
}

// Removes the iframe so the customer can use the page underneath it again.
export function closeCardPay() {
  const frame = document.getElementById(IFRAME_ID);
  if (frame) frame.remove();
}