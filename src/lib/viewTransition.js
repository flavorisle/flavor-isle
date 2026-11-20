// Cross-document-ish shared-element transitions inside the app (issue #338).
// Runs `run` inside a View Transition when the browser supports it, and simply
// calls `run` everywhere else — so navigation never depends on the API existing.
export function withViewTransition(run) {
  if (typeof document === 'undefined' || typeof document.startViewTransition !== 'function') return run();
  return document.startViewTransition(run);
}