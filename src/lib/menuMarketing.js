const DISCONTINUED_ITEM_PATTERNS = [
  /pulled\s*pork/i,
  /loaded\s*bbq\s*waffle/i,
  /waffle\s*fries\s*with\s*jalape/i,
];

const RESTRICTED_PROMO_ITEM_PATTERN = /\bmalts?\b|\bsundaes?\b/i;

export function isDiscontinuedMenuItem(item) {
  const name = typeof item === 'string' ? item : item?.name;
  return DISCONTINUED_ITEM_PATTERNS.some((pattern) => pattern.test(name || ''));
}

export function isExcludedFromMarketing(item) {
  const name = typeof item === 'string' ? item : item?.name;
  return isDiscontinuedMenuItem(name) || RESTRICTED_PROMO_ITEM_PATTERN.test(name || '');
}
