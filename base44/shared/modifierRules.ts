// Server side of Square's modifier rules. Mirrors src/lib/modifierRules.js so
// the browser and the order check read the same numbers.
//
// A rule that the customer sees must also be a rule the server enforces: the
// client seeds Square's defaults and blocks the Add button, but an order can
// still arrive from a stale tab or a script, and a required choice that was
// never made is the restaurant losing information it asked for.

export type GroupRule = {
  key: string;
  name: string;
  multiple: boolean;
  min: number;
  max: number | null;
};

export type RuleProblem = {
  group: string;
  count: number;
  min: number;
  max: number | null;
  message: string;
};

// Square sends -1 / nothing for "no maximum" and 0 / nothing for "no minimum".
function ruleOf(group: any): GroupRule {
  const rawMin = Number(group?.min_selected);
  const rawMax = Number(group?.max_selected);
  return {
    key: group?.id || `name:${String(group?.name || '').trim().toLowerCase()}`,
    name: group?.name || 'Options',
    multiple: group?.selection_type === 'MULTIPLE',
    min: Number.isInteger(rawMin) && rawMin > 0 ? rawMin : 0,
    max: Number.isInteger(rawMax) && rawMax >= 0 ? rawMax : null,
  };
}

// Walks one item's groups, including the child lists a parent option reveals.
// A child list only counts when its parent option is actually selected.
export function modifierRuleFailures(
  menuItem: any,
  selectedIds: string[],
  options: { skipMinimums?: boolean } = {},
): RuleProblem[] {
  const problems: RuleProblem[] = [];
  const ids = new Set((selectedIds || []).filter(Boolean));

  const walk = (groups: any[] | undefined, active: boolean) => {
    if (!active) return;
    for (const group of groups || []) {
      const rule = ruleOf(group);
      const optionIds = new Set((group?.modifiers || []).map((mod: any) => mod?.id).filter(Boolean));
      const count = [...ids].filter((id) => optionIds.has(id)).length;
      if (!options.skipMinimums && count < rule.min) {
        const missing = rule.min - count;
        problems.push({
          group: rule.name,
          count,
          min: rule.min,
          max: rule.max,
          message: `Choose ${missing} more for ${rule.name}`,
        });
      }
      if (rule.max != null && count > rule.max) {
        problems.push({
          group: rule.name,
          count,
          min: rule.min,
          max: rule.max,
          message: `${rule.name} allows at most ${rule.max}`,
        });
      }
      for (const option of group?.modifiers || []) {
        if (option?.child_modifier_lists?.length) {
          walk(option.child_modifier_lists, ids.has(option.id));
        }
      }
    }
  };

  walk(menuItem?.modifiers, true);
  return problems;
}
