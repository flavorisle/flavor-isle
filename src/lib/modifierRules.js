// Square's own modifier rules, carried through the catalog sync.
//
// syncSquareCatalog writes each MenuItem group with the fields Square owns:
//   min_selected / max_selected   how many options must / may be picked
//   modifier_type                 LIST (options) or TEXT (free text)
//   modifiers[].on_by_default     the option Square preselects
//   modifiers[].hidden_online     the option Square does not offer online
//
// Nothing here edits those rules. They are read, preseeded, shown to the
// customer and enforced, so the site asks for exactly what the register asks
// for. Square stays the only place a rule is set.

// Square sends -1, 0 (or nothing) for "no maximum" and 0 (or nothing) for
// "no minimum". Both become null / 0 here so every reader sees one shape — a
// maximum of 0 is never a real limit (it would mean the group cannot be used).
export function groupRule(group) {
  const rawMin = Number(group?.min_selected);
  const rawMax = Number(group?.max_selected);
  const min = Number.isInteger(rawMin) && rawMin > 0 ? rawMin : 0;
  const max = Number.isInteger(rawMax) && rawMax > 0 ? rawMax : null;
  return {
    min,
    max,
    multiple: group?.selection_type === 'MULTIPLE',
    required: min > 0,
  };
}

// The badge beside a group heading: Square's rule in the customer's words.
export function ruleBadge(group) {
  if (group?.modifier_type === 'TEXT') return 'Type it in';
  const { min, max, multiple } = groupRule(group);
  if (!multiple) return min > 0 ? 'Required' : 'Choose one';
  if (min > 0 && max != null) return min === max ? `Choose ${min}` : `Choose ${min} to ${max}`;
  if (min > 0) return `Choose at least ${min}`;
  if (max != null) return `Choose up to ${max}`;
  return 'Choose any';
}

export function pickedCount(value) {
  if (Array.isArray(value)) return value.length;
  return value ? 1 : 0;
}

// The opening selection for one group: every option Square marks default, or
// none when Square marks none. The synthetic Size group keeps its old
// behaviour (the first available size), because variations carry no default.
export function seedValue(group) {
  const options = (group?.modifiers || []).filter((mod) => !mod.sold_out);
  const defaults = options.filter((mod) => mod.on_by_default === true);
  const { multiple, max } = groupRule(group);
  if (multiple) return max == null ? defaults : defaults.slice(0, max);
  if (defaults.length > 0) return defaults[0];
  if (group?.name === 'Size') return options[0] || (group?.modifiers || [])[0] || null;
  return null;
}

// Every group, seeded, keyed by group name — the same key the pickers already
// store their selections under.
export function seedSelections(groups) {
  return (groups || []).reduce((acc, group) => {
    acc[group.name] = seedValue(group);
    return acc;
  }, {});
}

// How many more options the customer still has to pick before the rule is met.
export function shortfall(group, value) {
  const { min } = groupRule(group);
  return Math.max(0, min - pickedCount(value));
}

// True when a multiple-choice group is at its Square maximum, so one more tap
// has to replace a pick rather than add one.
export function atMax(group, value) {
  const { max } = groupRule(group);
  return max != null && pickedCount(value) >= max;
}

export function isGroupSatisfied(group, value) {
  const { min, max } = groupRule(group);
  const count = pickedCount(value);
  if (count < min) return false;
  return max == null || count <= max;
}

// The first group still breaking its rule, with how many picks are missing —
// what the Add button says and what stops it.
export function firstUnsatisfied(groups, selections) {
  for (const group of groups || []) {
    const value = selections?.[group.name];
    if (isGroupSatisfied(group, value)) continue;
    return { group, missing: shortfall(group, value) };
  }
  return null;
}