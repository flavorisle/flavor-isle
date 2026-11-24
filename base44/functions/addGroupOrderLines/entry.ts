import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { closeIfDue, groupView } from '../../shared/groupOrderView.ts';
import { optionPriceMap } from '../../shared/groupOrderTicket.ts';
import { getOptionPriceOverrides } from '../../shared/modifierOverrides.ts';
import { getMenuSettingRecord } from '../../shared/storeState.ts';
import { cleanCode, cleanName, findGroup, round2 } from '../../shared/groupOrderAccess.ts';

// A participant's items land on the group's one ticket (issue #356). Everything
// that costs money is rebuilt here from the live menu: the browser sends which
// item and which options, never a price. Sold-out and hidden-online items are
// refused, and a closed or paid group takes nothing more.
export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const code = cleanCode(body?.code);
    const participant = cleanName(body?.participant_name, 40);
    const incoming = Array.isArray(body?.lines) ? body.lines : [];

    if (!code) return Response.json({ error: 'That group link is missing its code.' }, { status: 400 });
    if (!participant) return Response.json({ error: 'Add your first name before adding items.' }, { status: 400 });
    if (incoming.length === 0) return Response.json({ error: 'There is nothing in your bag to add.' }, { status: 400 });
    if (incoming.length > 25) return Response.json({ error: 'Please add fewer items at a time.' }, { status: 400 });

    const existing = await findGroup(base44, code);
    if (!existing) return Response.json({ error: 'We could not find that group. Check the link and try again.' }, { status: 404 });

    const group = await closeIfDue(base44, existing);
    if (group.status === 'paid') return Response.json({ error: 'This group has already been paid, so its items are locked.' }, { status: 409 });
    if (group.status !== 'open') return Response.json({ error: 'This group has closed and its items are locked.' }, { status: 409 });

    const menuItems = await base44.asServiceRole.entities.MenuItem.list('-updated_date', 500);
    const byId = new Map<string, any>((menuItems || []).map((m: any) => [m.id, m]));
    const setting = await getMenuSettingRecord(base44);
    const overrides = getOptionPriceOverrides(setting);

    const rows: any[] = [];
    for (const raw of incoming) {
      const menuItem = byId.get(String(raw?.item_id || ''));
      if (!menuItem) {
        return Response.json({ error: 'One of your items is no longer on the menu. Please remove it and add it again.' }, { status: 400 });
      }
      if (menuItem.is_hidden || menuItem.is_available === false) {
        return Response.json({ error: `"${menuItem.name}" is not available right now. Please take it out of your bag.` }, { status: 400 });
      }
      const priceMap = optionPriceMap(menuItem, overrides);
      const mods = Array.isArray(raw?.selected_mods) ? raw.selected_mods : [];
      let extra = 0;
      for (const mod of mods) {
        if (!mod?.id || !(mod.id in priceMap)) {
          return Response.json({ error: `"${menuItem.name}" has a choice we can no longer offer. Please remove it and add it again.` }, { status: 400 });
        }
        extra += priceMap[mod.id];
      }
      const quantity = Math.min(10, Math.max(1, Math.floor(Number(raw?.quantity) || 1)));
      const unitPrice = Number(menuItem.price) || 0;
      rows.push({
        group_order_id: group.id,
        participant_name: participant,
        item_id: menuItem.id,
        item_name: menuItem.name,
        unit_price: round2(unitPrice),
        selected_mods: mods,
        extra_cost: round2(extra),
        core_level: String(raw?.core_level || '').slice(0, 20),
        salt_answer: String(raw?.salt_answer || '').slice(0, 40),
        allergy_note: String(raw?.allergy_note || '').slice(0, 200),
        quantity,
        line_total: round2((unitPrice + extra) * quantity),
        paid: false,
      });
    }

    await base44.asServiceRole.entities.GroupOrderLine.bulkCreate(rows);

    const view = await groupView(base44, group);
    return Response.json({ ok: true, ...view });
  } catch (error) {
    console.error('addGroupOrderLines error:', (error as Error).message);
    return Response.json({ error: 'Your items could not be added to the group. Please try again.' }, { status: 500 });
  }
}