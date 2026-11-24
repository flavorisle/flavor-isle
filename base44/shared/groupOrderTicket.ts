// One ticket, one payment for a group order (issue #356).
//
// Every participant's lines collect on ONE pickup ticket. This module is the only
// place that turns those lines into money: it rebuilds each line from the live
// menu (base price plus the catalog price of every chosen option), then hands the
// result to the app's existing pricing authority (verifyOrderPricing), which is
// the same check the website checkout uses. A client number is never trusted.
//
// The Order row is created in settleGroupTicket, i.e. only after the provider's
// own record says the whole ticket was paid — the settlement is the same shape as
// wixWebSettlement: verify the amount to the cent, create the paid order, then run
// the app's existing fulfillment path so the kitchen ticket prints once.

import { verifyOrderPricing } from './verifyOrderPricing.ts';
import { getOptionPriceOverrides } from './modifierOverrides.ts';
import { getMenuSettingRecord } from './storeState.ts';
import { getHappyHourConfig, isHappyHourActive } from './happyHour.ts';
import { toCents, fromCents, salesTaxCents } from './taxMath.ts';
import { pushOrderToSquareAndKitchen } from './fulfillOrder.ts';

function round2(n: number): number {
  return Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;
}

// Option id → authoritative price, including nested child lists, with the admin's
// Menu Manager overrides applied — the same map verifyOrderPricing builds.
export function optionPriceMap(menuItem: any, overrides: Record<string, number>): Record<string, number> {
  const map: Record<string, number> = {};
  const walk = (groups: any[]) => {
    for (const group of (groups || [])) {
      for (const opt of (group?.modifiers || [])) {
        if (!opt?.id) continue;
        map[opt.id] = overrides[opt.id] != null ? Number(overrides[opt.id]) || 0 : Number(opt.price) || 0;
        walk(opt.child_modifier_lists);
      }
    }
  };
  walk(menuItem?.modifiers);
  return map;
}

export interface GroupTicketResult {
  ok: boolean;
  error?: string;
  priced?: any[];
  subtotal?: number;
  happyHourDiscount?: number;
  tax?: number;
  total?: number;
}

// Rebuild and price a group's lines from the live catalog.
export async function groupTicket(base44: any, lines: any[]): Promise<GroupTicketResult> {
  if (!lines || lines.length === 0) return { ok: false, error: 'This group has no items yet.' };

  const menuItems = await base44.asServiceRole.entities.MenuItem.list('-updated_date', 500);
  const byId = new Map<string, any>((menuItems || []).map((m: any) => [m.id, m]));

  const setting = await getMenuSettingRecord(base44);
  const overrides = getOptionPriceOverrides(setting);
  const hh = getHappyHourConfig(setting);
  const hhActive = isHappyHourActive(setting);
  const pct = (hh.discount_percent || 0) / 100;
  const hhIds = new Set<string>(hh.square_item_ids || []);

  let subtotal = 0;
  let happyHourDiscount = 0;
  const priced: any[] = [];

  for (const line of lines) {
    const menuItem = byId.get(String(line?.item_id || ''));
    if (!menuItem) {
      return { ok: false, error: `"${line?.item_name || 'An item'}" is no longer on the menu. Please remove it and add it again.` };
    }
    if (menuItem.is_hidden || menuItem.is_available === false) {
      return { ok: false, error: `"${menuItem.name}" is not available right now. Please remove it from the group.` };
    }
    const priceMap = optionPriceMap(menuItem, overrides);
    let extra = 0;
    for (const mod of (line.selected_mods || [])) {
      if (!mod?.id || !(mod.id in priceMap)) {
        return { ok: false, error: `"${menuItem.name}" has a choice we can no longer offer. Please remove it and add it again.` };
      }
      extra += priceMap[mod.id];
    }
    const quantity = Math.max(1, Math.floor(Number(line.quantity) || 1));
    const unitPrice = Number(menuItem.price) || 0;
    const lineTotal = round2((unitPrice + extra) * quantity);
    subtotal = round2(subtotal + lineTotal);
    if (hhActive && pct > 0 && menuItem.square_item_id && hhIds.has(menuItem.square_item_id)) {
      happyHourDiscount += lineTotal * pct;
    }
    priced.push({
      line,
      menuItem,
      quantity,
      unitPrice: round2(unitPrice),
      extraCost: round2(extra),
      lineTotal,
      participant: String(line.participant_name || '').trim(),
    });
  }

  happyHourDiscount = round2(happyHourDiscount);
  const adjusted = round2(subtotal - happyHourDiscount);
  const tax = fromCents(salesTaxCents(toCents(adjusted)));
  const total = round2(adjusted + tax);

  // The app's existing pricing authority re-derives every line from the catalog.
  const pricing = await verifyOrderPricing(base44, {
    items: priced.map((p) => ({
      name: p.menuItem.name,
      price: p.lineTotal,
      quantity: p.quantity,
      square_item_id: p.menuItem.square_item_id || '',
      selectedModifiers: p.line.selected_mods || [],
    })),
    orderType: 'pickup',
    clientSubtotal: subtotal,
    clientDeliveryFee: 0,
    clientTax: tax,
    clientTotal: total,
    clientTip: 0,
    clientDiscount: 0,
    clientHappyHourDiscount: happyHourDiscount,
    clientBundleDiscount: 0,
  });
  if (!pricing.ok) return { ok: false, error: pricing.error || 'The group ticket could not be priced.' };

  return {
    ok: true,
    priced,
    subtotal: pricing.subtotal,
    happyHourDiscount: pricing.happyHourDiscount || 0,
    tax: pricing.tax,
    total: pricing.total,
  };
}

async function nextOrderNumber(base44: any): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const candidate = String(Date.now()).slice(-6);
    const existing = await base44.asServiceRole.entities.Order.filter({ order_number: candidate });
    if (!existing || existing.length === 0) return candidate;
    // Extremely unlikely collision — wait a moment and take a fresh stamp.
    await new Promise((r) => setTimeout(r, 3));
  }
  return `${String(Date.now()).slice(-5)}${Math.floor(Math.random() * 10)}`;
}

// Create the paid ticket. Only ever called once the provider's record proves the
// whole ticket was paid; the Order row does not exist before this point.
export async function settleGroupTicket(client: any, opts: {
  group: any;
  lines: any[];
  amount: number | null;
  checkoutSessionId?: string;
  wixOrderId?: string;
  buyerEmail?: string;
}) {
  const base44 = client?.asServiceRole ? client : Object.assign(Object.create(client), { asServiceRole: client });
  const { group, lines } = opts;

  if (group?.status === 'paid' && group?.order_id) {
    return { ok: true, already_paid: true, order_id: group.order_id };
  }

  const ticket = await groupTicket(base44, lines);
  if (!ticket.ok) {
    console.error(`group order ${group?.code}: ticket could not be priced at settlement —`, ticket.error);
    return { ok: false, error: ticket.error };
  }

  // The amount the provider reports must equal the ticket we priced, to the cent.
  if (opts.amount != null) {
    const paidCents = toCents(Number(opts.amount));
    const expectedCents = toCents(Number(ticket.total));
    if (!Number.isFinite(paidCents) || paidCents !== expectedCents) {
      return { ok: false, error: `Payment does not match the group ticket (expected ${expectedCents}c, paid ${paidCents}c).` };
    }
  }

  const orderNumber = await nextOrderNumber(base44);
  const participants = Array.from(new Set((ticket.priced || []).map((p) => p.participant).filter(Boolean)));

  let order: any;
  try {
    order = await base44.asServiceRole.entities.Order.create({
      order_number: orderNumber,
      order_type: 'pickup',
      pickup_method: 'counter',
      order_source: 'online',
      status: 'confirmed',
      payment_status: 'paid',
      payment_provider: 'wix',
      wix_checkout_session_id: opts.checkoutSessionId || '',
      wix_order_id: opts.wixOrderId || '',
      items: (ticket.priced || []).map((p) => ({
        name: p.participant ? `${p.menuItem.name} — ${p.participant}` : p.menuItem.name,
        price: round2((p.lineTotal || 0) / Math.max(1, p.quantity)),
        quantity: p.quantity,
        image_url: p.menuItem.image_url_opt || p.menuItem.image_url || '',
        selectedModifiers: p.line.selected_mods || [],
        catalog_object_id: p.menuItem.square_item_id || '',
        square_item_id: p.menuItem.square_item_id || '',
        isBuildShake: !!p.line.core_level,
        allergyNote: p.line.allergy_note || '',
        saltNote: p.line.salt_answer || '',
      })),
      subtotal: ticket.subtotal,
      tax: ticket.tax,
      delivery_fee: 0,
      tip: 0,
      discount: 0,
      promo_discount: 0,
      happy_hour_discount: ticket.happyHourDiscount || 0,
      bundle_discount: 0,
      total: ticket.total,
      customer_name: String(group?.paid_by_name || group?.host_name || '').trim() || 'Group order',
      customer_email: String(opts.buyerEmail || '').trim(),
      special_instructions: `Group order: ${String(group?.title || '').trim() || 'Group order'} — ${participants.join(', ')} (arriving together, one pickup)`,
      estimated_time: 20,
    });
  } catch (error) {
    console.error(`group order ${group?.code}: could not save the paid ticket —`, (error as Error).message);
    return { ok: false, error: 'The paid ticket could not be saved.' };
  }

  // The app's existing fulfillment path: the kitchen ticket and the store's
  // systems see a paid order exactly as they do for any other paid order.
  await pushOrderToSquareAndKitchen(base44, order);

  await base44.asServiceRole.entities.GroupOrder.update(group.id, {
    status: 'paid',
    order_id: order.id,
    paid_at: new Date().toISOString(),
  });

  const lineIds = (lines || []).map((l: any) => l.id).filter(Boolean);
  for (const id of lineIds) {
    await base44.asServiceRole.entities.GroupOrderLine.update(id, { paid: true });
  }

  console.log(`group order ${group.code}: paid ticket ${order.order_number} created and fulfilled (${ticket.total}).`);
  return { ok: true, order_id: order.id, order_number: order.order_number, total: ticket.total };
}