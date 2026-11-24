// Small shared helpers for the group-order functions (issue #356): one place for
// the code lookup, name cleaning and cent rounding, so every group function
// behaves identically.

export function round2(n: number): number {
  return Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
}

export function cleanName(value: any, max: number): string {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function cleanCode(value: any): string {
  return String(value || '').trim().toLowerCase();
}

// The code is the group's only credential.
export async function findGroup(base44: any, code: string) {
  if (!code) return null;
  const found = await base44.asServiceRole.entities.GroupOrder.filter({ code });
  return (found || [])[0] || null;
}