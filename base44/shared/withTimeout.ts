// Bounds an await that depends on an outside service so a stalled call can
// never leave Smashie silent. Rejects with a TimeoutError after `ms`.
export class TimeoutError extends Error {
  constructor(label, ms) {
    super(`${label} timed out after ${ms}ms`);
    this.name = 'TimeoutError';
  }
}

export function withTimeout(work, ms, label = 'operation') {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });
  return Promise.race([Promise.resolve().then(() => (typeof work === 'function' ? work() : work)), timeout])
    .finally(() => clearTimeout(timer));
}
