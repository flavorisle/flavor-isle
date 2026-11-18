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

// The flavor itself is included in the shake price. Only its actual Square
// amount option is added, retaining its catalog id and any Square upcharge.
export function includedFlavorModifiers(item, level) {
  const flavor = findShakeFlavorOption(item);
  if (!flavor || !level) return [];
  return Object.entries(nestedForLevel(flavor, level)).map(([group, option]) => ({
    id: option.id, group, name: '', price: Number(option.price) || 0, silent: true,
  }));
}

export function includedFlavorExtra(item, level) {
  return includedFlavorModifiers(item, level).reduce((sum, option) => sum + option.price, 0);
}