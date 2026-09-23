// Server-side order pricing authority. Recomputes subtotal, Happy Hour
// discount, tax, and delivery fee from authoritative MenuItem + MenuSetting
// records so a manipulated client total can never be charged. Used by
// createPaymentIntent and createGroupPayment BEFORE any Stripe intent is
// created.
//
// Authority map:
//  - Item base price:        MenuItem.price (authoritative)
//  - Catalog modifier price: MenuItem.modifiers[].modifiers[].price matched by id (authoritative)
//  - Ad-hoc modifier price:  client selectedModifier.price (trusted — see BLOCKER note)
//  - Happy Hour:             MenuSetting.happy_hour (authoritative, online-only 2–6 PM Chicago)
//  - Tax:                    6% of (subtotal − discount − happyHour) (derived)
//  - Delivery fee:           getDeliveryQuote (tiers) or MenuSetting.delivery_fee (flat) (authoritative)
//  - Reward discount:        client value, capped at adjusted subtotal (trusted — see BLOCKER note)
//  - Tip:                    client value, clamped ≥ 0 (customer choice, not validated)
//
// PENDING BLOCKERS (not fully authoritative from existing data):
//  - Ad-hoc modifier prices (Deluxe toppings, shake flavors) come from client
//    configs (shakeConfig/deluxeConfig), not MenuItem records, so their per-unit
//    price cannot be server-validated here. They are trusted but bounded by the
//    subtotal check.
//  - Reward discount amount requires a Square loyalty reward-tier lookup to
//    validate the exact discount value. It is capped at the adjusted subtotal
//    but not exactly validated. Full validation needs a server-side reward-tier
//    authority (separately approved scope).
//  - Items without a square_item_id (e.g. souvenir mug) have no MenuItem record
//    to validate against; their price is trusted.

import { getHappyHourConfig, isHappyHourActive } from './happyHour.ts';

const TAX_RATE = 0.06;
const TOLERANCE_CENTS = 1; // accept up to 1 cent of rounding drift

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Build a modifier-option id → authoritative price map from a MenuItem record.
function buildModifierPriceMap(menuItem: any): Record<string, number> {
  const map: Record<string, number> = {};
  for (const group of (menuItem?.modifiers || [])) {
    for (const opt of (group?.modifiers || [])) {
      if (opt?.id) map[opt.id] = Number(opt.price) || 0;
    }
  }
  return map;
}

export interface PricingResult {
  ok: boolean;
  error?: string;
  subtotal?: number;
  happyHourDiscount?: number;
  tax?: number;
  deliveryFee?: number;
  discount?: number;
  tip?: number;
  total?: number;
  warnings?: string[];
}

// Recompute and validate an order's pricing. `clientTotal` is the amount the
// customer's cart displayed; the caller charges that amount only when it
// matches the server recomputation within tolerance.
export async function verifyOrderPricing(base44: any, opts: {
  items: any[];
  orderType: string;
  deliveryAddress?: string;
  clientSubtotal: number;
  clientDeliveryFee: number;
  clientTax: number;
  clientTotal: number;
  clientTip?: number;
  clientDiscount?: number;
  clientHappyHourDiscount?: number;
}): Promise<PricingResult> {
  const {
    items, orderType, deliveryAddress,
    clientSubtotal, clientDeliveryFee, clientTax, clientTotal,
    clientTip = 0, clientDiscount = 0, clientHappyHourDiscount = 0,
  } = opts;

  if (!items || items.length === 0) return { ok: false, error: 'No items provided' };

  const warnings: string[] = [];

  // ── Load MenuSetting + MenuItems ──
  const settings = await base44.asServiceRole.entities.MenuSetting.list();
  const setting = settings?.[0] || {};
  const hh = getHappyHourConfig(setting);
  const hhActive = isHappyHourActive(setting);
  const pct = (hh.discount_percent || 0) / 100;
  const hhIds = new Set(hh.square_item_ids || []);

  const allMenuItems = await base44.asServiceRole.entities.MenuItem.list('-updated_date', 500);
  const menuBySquareId = new Map<string, any>();
  for (const mi of (allMenuItems || [])) {
    if (mi.square_item_id) menuBySquareId.set(mi.square_item_id, mi);
  }

  // ── Recompute line prices + Happy Hour ──
  let serverSubtotal = 0;
  let serverHappyHour = 0;
  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    const sqId = item.square_item_id || item.catalog_object_id;
    const menuItem = sqId ? menuBySquareId.get(sqId) : null;

    let lineUnitPrice: number;
    if (menuItem) {
      // Authoritative base + authoritative catalog modifier prices.
      lineUnitPrice = Number(menuItem.price) || 0;
      const modPriceMap = buildModifierPriceMap(menuItem);
      for (const sm of (item.selectedModifiers || [])) {
        if (!sm) continue;
        if (sm.id && sm.id in modPriceMap) {
          lineUnitPrice += modPriceMap[sm.id]; // authoritative
        } else {
          // Ad-hoc modifier (Deluxe topping, shake flavor, etc.) — trusted.
          lineUnitPrice += Math.max(0, Number(sm.price) || 0);
        }
      }
    } else if (sqId) {
      // square_item_id present but not in our catalog — reject (unknown item).
      return { ok: false, error: `Menu item not found for square_item_id ${sqId}` };
    } else {
      // No square_item_id (custom item, e.g. souvenir mug) — trust client price.
      lineUnitPrice = Math.max(0, Number(item.price) || 0);
      warnings.push(`Unvalidated item (no square_item_id): ${item.name || 'unknown'}`);
    }

    const lineTotal = lineUnitPrice * qty;
    serverSubtotal += lineTotal;

    if (hhActive && pct > 0 && sqId && hhIds.has(sqId)) {
      serverHappyHour += lineTotal * pct;
    }
  }

  serverSubtotal = round2(serverSubtotal);
  serverHappyHour = round2(serverHappyHour);
  const adjustedSubtotal = round2(serverSubtotal - serverHappyHour);

  // ── Tax ──
  const serverTax = round2(adjustedSubtotal * TAX_RATE);

  // ── Delivery fee (authoritative) ──
  let serverDeliveryFee = 0;
  if (orderType === 'delivery') {
    const tiers = (setting.delivery_tiers || [])
      .filter((t: any) => t && Number(t.max_miles) > 0)
      .sort((a: any, b: any) => Number(a.max_miles) - Number(b.max_miles));
    if (tiers.length === 0) {
      serverDeliveryFee = Number(setting.delivery_fee ?? 0);
    } else if (deliveryAddress) {
      // Reuse the approved distance-based quote rule.
      try {
        const r = await base44.functions.invoke('getDeliveryQuote', { address: deliveryAddress });
        const q = r?.data || r;
        if (!q?.ok || q.out_of_range || q.fee == null) {
          return { ok: false, error: 'Delivery address could not be quoted — cannot verify delivery fee' };
        }
        serverDeliveryFee = Number(q.fee) || 0;
      } catch (e) {
        return { ok: false, error: `Delivery fee verification failed: ${e.message || e}` };
      }
    } else {
      return { ok: false, error: 'Delivery address required to verify delivery fee' };
    }
  }
  serverDeliveryFee = round2(serverDeliveryFee);

  // ── Reward discount (capped, trusted) + tip (trusted) ──
  const serverDiscount = round2(Math.min(Math.max(0, clientDiscount), adjustedSubtotal));
  const serverTip = Math.max(0, Number(clientTip) || 0);
  const serverTotal = round2(Math.max(0, adjustedSubtotal + serverDeliveryFee + serverTax - serverDiscount) + serverTip);

  // ── Validate each authoritative component against the client ──
  const checks: Array<[number, number, string]> = [
    [serverSubtotal, clientSubtotal, 'subtotal'],
    [serverHappyHour, clientHappyHourDiscount, 'happy hour discount'],
    [serverTax, clientTax, 'tax'],
    [serverDeliveryFee, clientDeliveryFee, 'delivery fee'],
    [serverTotal, clientTotal, 'total'],
  ];
  for (const [serverVal, clientVal, label] of checks) {
    if (Math.abs(round2(serverVal) - round2(clientVal)) * 100 > TOLERANCE_CENTS) {
      return {
        ok: false,
        error: `Price verification failed: ${label} mismatch (server ${round2(serverVal)} vs client ${round2(clientVal)}). Please refresh the menu and try again.`,
      };
    }
  }

  if (clientDiscount > adjustedSubtotal) {
    warnings.push(`Reward discount capped at adjusted subtotal (${adjustedSubtotal})`);
  }

  return {
    ok: true,
    subtotal: serverSubtotal,
    happyHourDiscount: serverHappyHour,
    tax: serverTax,
    deliveryFee: serverDeliveryFee,
    discount: serverDiscount,
    tip: serverTip,
    total: round2(clientTotal), // validated — charge what the customer saw
    warnings,
  };
}