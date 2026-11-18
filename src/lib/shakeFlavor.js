const exactName = (name) => String(name || '').trim().toLowerCase();
export const normalizeShakeFlavor = (name) => exactName(name)
  .replace(/\b(real fruit|crushed|oreo|syrup|sauce)\b/g, '')
  .replace(/\bcreme\b/g, 'cream')
  .replace(/\s+/g, ' ').trim();

// Match the included flavor only against this item's own Square flavor lists.
// Prefer exact names so Strawberry and Real Fruit Strawberry stay distinct.
export function findShakeFlavorOption(item) {
  const name = String(item?.name || '').replace(/\s*Milkshake\s*$/i, '').trim();
  const options = (item?.modifiers || [])
    .filter((group) => /flavor/i.test(group.name || '') && !/cake/i.test(group.name || ''))
    .flatMap((group) => group.modifiers || []);
  return options.find((option) => exactName(option.name) === exactName(name))
    || options.find((option) => normalizeShakeFlavor(option.name) === normalizeShakeFlavor(name))
    || null;
}