export const COMBO_DISCOUNT_PERCENT = 9;
export const COMBO_ROLES = ['main', 'side', 'drink'];
const round2 = (n: number) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
export const comboBoxCharge = (fullTotal: number) => round2((Number(fullTotal) || 0) * (1 - COMBO_DISCOUNT_PERCENT / 100));
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
  roles.forEach((list, gid) => { if (list.length === 3 && new Set(list).size === 3) complete.add(gid); });
  return complete;
}
export function comboDiscountForLines(lines: Array<{ comboGroup?: string; fullUnitPrice: number; quantity: number }>): number {
  const groups: Record<string, number> = {};
  for (const line of lines || []) {
    if (!line?.comboGroup) continue;
    const full = (Number(line.fullUnitPrice) || 0) * (Number(line.quantity) || 1);
    groups[line.comboGroup] = round2((groups[line.comboGroup] || 0) + full);
  }
  let discount = 0;
  Object.values(groups).forEach((full) => { discount = round2(discount + round2(full - comboBoxCharge(full))); });
  return discount;
}