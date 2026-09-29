// Keep transcript fragments in arrival order, independently of async saves.
export function createCallTranscript() {
  const entries = [];
  const active = {};
  const byId = new Map();
  let lastRole = '';

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
      entry.content += fragment;
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