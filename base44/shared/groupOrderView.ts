// The participant view of one group order (issue #356), assembled in one place so
// every group function returns the same shape. No personal data beyond first
// names and the items each person chose.

function round2(n: number): number {
  return Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
}

// A group stops taking items the moment its close time passes.
export async function closeIfDue(base44: any, group: any) {
  if (!group || group.status !== 'open') return group;
  const closesAt = new Date(group.closes_at).getTime();
  if (Number.isFinite(closesAt) && closesAt <= Date.now()) {
    const updated = await base44.asServiceRole.entities.GroupOrder.update(group.id, { status: 'closed' });
    return { ...group, ...updated, status: 'closed' };
  }
  return group;
}

export async function groupView(base44: any, group: any) {
  const lines = await base44.asServiceRole.entities.GroupOrderLine.filter({ group_order_id: group.id }, 'created_date', 200);

  const byName = new Map<string, { name: string; subtotal: number; items: number }>();
  for (const line of lines || []) {
    const name = String(line.participant_name || '').trim() || 'Guest';
    if (!byName.has(name)) byName.set(name, { name, subtotal: 0, items: 0 });
    const entry = byName.get(name)!;
    entry.subtotal = round2(entry.subtotal + (Number(line.line_total) || 0));
    entry.items += 1;
  }
  const participants = Array.from(byName.values()).sort((a, b) => b.subtotal - a.subtotal);
  const total = round2((lines || []).reduce((sum: number, l: any) => sum + (Number(l.line_total) || 0), 0));

  let orderNumber = '';
  if (group.order_id) {
    try {
      const order = await base44.asServiceRole.entities.Order.get(group.order_id);
      orderNumber = order?.order_number || '';
    } catch { /* the ticket is gone — the group still shows as paid */ }
  }

  return {
    group: {
      code: group.code,
      kind: group.kind || 'group',
      title: group.title,
      host_name: group.host_name,
      partner_name: group.partner_name || '',
      closes_at: group.closes_at,
      status: group.status,
      paid_by_name: group.paid_by_name || '',
      paid_at: group.paid_at || '',
      order_number: orderNumber,
    },
    lines: (lines || []).map((line: any) => ({
      id: line.id,
      participant_name: line.participant_name,
      item_id: line.item_id,
      item_name: line.item_name,
      selected_mods: line.selected_mods || [],
      quantity: Number(line.quantity) || 1,
      line_total: round2(line.line_total),
      mods: (line.selected_mods || []).map((m: any) => m?.name).filter(Boolean),
      paid: !!line.paid,
    })),
    participants,
    total,
    line_count: (lines || []).length,
  };
}