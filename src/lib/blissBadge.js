// Badge pill for a "Blend & Bliss" shake card, computed from the live menu item
// — no name-keyed list, so a flavor added, renamed or retired in Square needs
// no code change. Priority: sold out → trending label → newly added → nothing.
const NEW_WINDOW_DAYS = 45;

const TONES = {
  Signature: 'bg-obsidian-roast text-white',
  New: 'bg-patina-mint text-white',
  'Coming Soon': 'bg-smashie-yellow text-obsidian-roast',
};
const DEFAULT_TONE = 'bg-patina-mint text-white';

const isRecentlyAdded = (created) => {
  if (!created) return false;
  const at = new Date(created).getTime();
  if (!Number.isFinite(at)) return false;
  return Date.now() - at <= NEW_WINDOW_DAYS * 24 * 60 * 60 * 1000;
};

export function blissBadge(item) {
  if (!item || item.is_available === false) return null;

  const trendingLabel = String(item.trending_label || '').trim();
  if (item.is_trending === true && trendingLabel) {
    return { label: trendingLabel, className: TONES[trendingLabel] || DEFAULT_TONE };
  }

  if (isRecentlyAdded(item.created_date)) {
    return { label: 'New', className: TONES.New };
  }

  return null;
}