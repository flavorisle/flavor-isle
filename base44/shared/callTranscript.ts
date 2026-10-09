// Keep transcript fragments in arrival order, independently of async saves.
// `initialEntries` seeds a transcript carried over from an earlier worker, so a
// call that changes hands mid-conversation keeps one continuous transcript
// instead of restarting with each handover.
//
// Issue #86 (4.1): every sideband attach makes OpenAI replay recent
// transcript.delta events, and appending them again duplicated the greeting and
// read-back fragments in the Oct 8 call records (the 3:08 PM transcript shows the
// same words twice). A fragment whose normalized text already sits at the tail of
// the last entry for the same speaker is a replay, not new speech.
function normalizeSpeech(text) {
  return String(text || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function createCallTranscript(initialEntries = []) {
  const entries = [];
  const active = {};
  const byId = new Map();
  let lastRole = '';

  for (const entry of initialEntries || []) {
    if (!entry || !entry.content) continue;
    entries.push({
      role: entry.role,
      content: String(entry.content),
      timestamp: entry.timestamp || new Date().toISOString(),
      completed: true,
    });
    lastRole = entry.role;
  }

  const capture = (role, event = {}, completed = false) => {
    const key = event.item_id ? `${role}:${event.item_id}` : '';
    const fragment = completed
      ? event.transcript ?? event.text ?? ''
      : event.delta ?? event.text ?? '';
    let entry = key ? byId.get(key) : active[role];
    if (!completed && (!entry || entry.completed || (!key && lastRole !== role))) {
      entry = { role, content: '', timestamp: new Date().toISOString(), completed: false };
      entries.push(entry);
      if (key) byId.set(key, entry);
    }
    if (!entry && completed && fragment) {
      entry = { role, content: '', timestamp: new Date().toISOString(), completed: false };
      entries.push(entry);
      if (key) byId.set(key, entry);
    }
    if (!entry) return;
    if (completed) {
      if (fragment) entry.content = fragment;
      entry.completed = true;
    } else {
      // Consecutive-duplicate suppression (issue #86, 4.1): replayed deltas arrive
      // contiguously, so a fragment already ending this speaker's last entry is
      // dropped instead of being spoken into the record twice.
      const replayed = normalizeSpeech(fragment);
      if (!replayed || !normalizeSpeech(entry.content).endsWith(replayed)) {
        entry.content += fragment;
      }
    }
    active[role] = entry;
    lastRole = role;
  };

  return {
    capture,
    snapshot: () => entries.filter(entry => entry.content.trim()).map(entry => ({
      role: entry.role,
      content: entry.content.trim(),
      timestamp: entry.timestamp,
    })),
  };
}