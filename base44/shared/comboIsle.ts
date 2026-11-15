// Combo Isle — server-side box rules (Wesley, Nov 15 2026).
//
// A box is a main + a side + a drink sharing one comboGroup. Only a whole box
// takes the 9%; a group that lost an item is not a box at all, so its lines are
// priced as the singles they have become. The discount is always recomputed from
// catalog prices — the client's numbers are only ever compared against it.

export const COMBO_DISCOUNT_PERCENT = 9;
export const COMBO_ROLES = ['main', 'side', 'drink'];

const round2 = (n: number) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;

export const comboBoxCharge = (fullTotal: number) =>
  round2((Number(fullTotal) || 0) * (1 - COMBO_DISCOUNT_PERCENT / 100));

// Group ids that still hold exactly one main, one side and one drink.
export function completeComboGroups(items: any[]): Set<string> {
  const roles = new Map<string, string[]>();
  for (const item of items || []) {
    const gid = item?.comboGroup;
    if (!gid) continue;
    const list = roles.get(gid) || [];
    if (COMBO_ROLES.includes(item?.comboRole)) list.push(item.comboRole);
    roles.set(gid, list);
  }
  const complete = new Set<string>();
  roles.forEach((list, gid) => {
    if (list.length === 3 && new Set(list).size === 3) complete.add(gid);
  });
  return complete;
}

// Total money off the order: 9% of every complete box, from the catalog prices
// the caller already recomputed for those lines.
export function comboDiscountForLines(
  lines: Array<{ comboGroup?: string; fullUnitPrice: number; quantity: number }>,
): number {
  const groups: Record<string, number> = {};
  for (const line of lines || []) {
    if (!line?.comboGroup) continue;
    const full = (Number(line.fullUnitPrice) || 0) * (Number(line.quantity) || 1);
    groups[line.comboGroup] = round2((groups[line.comboGroup] || 0) + full);
  }
  let discount = 0;
  Object.values(groups).forEach((full) => {
    discount = round2(discount + round2(full - comboBoxCharge(full)));
  });
  return discount;
}
