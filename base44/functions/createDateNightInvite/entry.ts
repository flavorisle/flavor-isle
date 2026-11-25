import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { resolveAppUrl } from '../../shared/wixCheckout.ts';
import { optionPriceMap } from '../../shared/groupOrderTicket.ts';
import { getOptionPriceOverrides } from '../../shared/modifierOverrides.ts';
import { getMenuSettingRecord } from '../../shared/storeState.ts';
import { cleanName, newGroupCode, round2 } from '../../shared/groupOrderAccess.ts';
import { dateNightSlot, dateNightShapeError } from '../../shared/dateNightSlots.ts';

// Date Night for Two (issue #357), first beat: person one has picked their food,
// so the invite is created on the group order layer from #356 — one GroupOrder,
// their picks as GroupOrderLine rows, and a code the other person opens.
//
// The invite lives 24 hours. It is deliberately created without any Order row: an
// invite that is never paid never becomes an order, because the Order is only
// written by the group settlement after the provider confirms the payment.
const LIFETIME_MS = 24 * 60 * 60 * 1000;

export default async function (req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    const name1 = cleanName(body?.name1, 40);
    const name2 = cleanName(body?.name2, 40);
    const incoming = Array.isArray(body?.lines) ? body.lines : [];

    if (!name1 || !name2) {
      return Response.json({ error: 'Add both first names before sending.' }, { status: 400 });
    }
    if (incoming.length === 0 || incoming.length > 4) {
      return Response.json({ error: 'A Date Night is one burger, one side, one shake and an optional cake.' }, { status: 400 });
    }

    const menuItems = await base44.asServiceRole.entities.MenuItem.list('-updated_date', 500);
    const byId = new Map<string, any>((menuItems || []).map((m: any) => [m.id, m]));
    const setting = await getMenuSettingRecord(base44);
    const overrides = getOptionPriceOverrides(setting);

    const rows: any[] = [];
    const slots: any[] = [];
    for (const raw of incoming) {
      const menuItem = byId.get(String(raw?.item_id || ''));
      if (!menuItem) {
        return Response.json({ error: 'One of those items is no longer on the menu. Please pick it again.' }, { status: 400 });
      }
      if (menuItem.is_hidden || menuItem.is_available === false) {
        return Response.json({ error: `"${menuItem.name}" is not available right now. Please pick another.` }, { status: 400 });
      }
      const slot = dateNightSlot(menuItem);
      if (!slot) {
        return Response.json({ error: `"${menuItem.name}" is not part of a Date Night.` }, { status: 400 });
      }
      slots.push(slot);

      const priceMap = optionPriceMap(menuItem, overrides);
      const mods = Array.isArray(raw?.selected_mods) ? raw.selected_mods : [];
      let extra = 0;
      for (const mod of mods) {
        if (!mod?.id || !(mod.id in priceMap)) {
          return Response.json({ error: `"${menuItem.name}" has a choice we can no longer offer. Please pick it again.` }, { status: 400 });
        }
        extra += priceMap[mod.id];
      }

      rows.push({
        participant_name: name1,
        item_id: menuItem.id,
        item_name: menuItem.name,
        unit_price: round2(Number(menuItem.price) || 0),
        selected_mods: mods,
        extra_cost: round2(extra),
        core_level: String(raw?.core_level || '').slice(0, 20),
        salt_answer: String(raw?.salt_answer || '').slice(0, 40),
        allergy_note: String(raw?.allergy_note || '').slice(0, 200),
        quantity: 1,
        line_total: round2((Number(menuItem.price) || 0) + extra),
        paid: false,
      });
    }

    const shapeError = dateNightShapeError(slots);
    if (shapeError) return Response.json({ error: shapeError }, { status: 400 });

    // The code is the invite's only key, so it is retried until it is free.
    let code = '';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = newGroupCode(10);
      const taken = await base44.asServiceRole.entities.GroupOrder.filter({ code: candidate });
      if (!taken || taken.length === 0) { code = candidate; break; }
    }
    if (!code) return Response.json({ error: 'Could not send that invite. Please try again.' }, { status: 500 });

    const group = await base44.asServiceRole.entities.GroupOrder.create({
      code,
      kind: 'date_night',
      host_name: name1,
      partner_name: name2,
      title: `Date Night for Two: ${name1} and ${name2}`,
      closes_at: new Date(Date.now() + LIFETIME_MS).toISOString(),
      status: 'open',
    });

    await base44.asServiceRole.entities.GroupOrderLine.bulkCreate(
      rows.map((row) => ({ ...row, group_order_id: group.id })),
    );

    const url = `${resolveAppUrl(req)}/date-night/for-two/${group.code}`;
    return Response.json({ ok: true, code: group.code, url, closes_at: group.closes_at });
  } catch (error) {
    console.error('createDateNightInvite error:', (error as Error).message);
    return Response.json({ error: 'Could not send that invite. Please try again.' }, { status: 500 });
  }
}