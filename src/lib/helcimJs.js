// The card processor's own JavaScript, which reads the card fields we render and sends
// what is typed straight from the customer's browser to the processor — no card number
// ever passes through this app.
//
// The script is fixed by the processor; the function it exposes is `helcimProcess()`.
const SCRIPT_SRC = 'https://secure.myhelcim.com/js/version2.js';

// Loads the processor's script once and resolves when its form hook exists.
export function loadHelcimJs() {
  if (typeof window !== 'undefined' && typeof window.helcimProcess === 'function') {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
    const script = existing || document.createElement('script');
    const onLoad = () => {
      if (typeof window.helcimProcess === 'function') resolve();
      else reject(new Error('The card fields did not become ready.'));
    };
    const onError = () => reject(new Error('The card fields could not be loaded.'));
    script.addEventListener('load', onLoad, { once: true });
    script.addEventListener('error', onError, { once: true });
    if (!existing) {
      script.src = SCRIPT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
  });
}

// Hand the card fields to the processor: it tokenizes what was typed, processes the
// signed amount, and submits our form back to our own server with the result.
export function submitHelcimForm() {
  if (typeof window.helcimProcess !== 'function') return false;
  window.helcimProcess();
  return true;
}