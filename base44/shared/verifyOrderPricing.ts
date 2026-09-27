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
//  - Tax:                    6% of (subtotal − discount − happyHour), in whole
//                            cents rounded half up (derived — see taxMath.ts,
//                            mirrored by src/lib/tax.js on the client)
//  - Delivery fee:           getDeliveryQuote (tiers) or MenuSetting.delivery_fee (flat) (authoritative)
//  - Reward discount:        client value, capped at adjusted subtotal (trusted — see BLOCKER note)
//  - Tip:                    client value, clamped ≥ 0 (customer choice, not validated)
//
// AUTHORITY (updated 2026-09-23):
//  - Catalog modifier prices (Deluxe toppings, shake flavors, sizes, mix-ins):
//    authoritative via MenuItem.modifiers matched by id. Unknown-id / no-id
//    modifiers are REJECTED (permitted-selections enforcement — closes the
//    ad-hoc modifier trust gap).
//  - Noncatalog items (no square_item_id): validated against NONCATALOG_PRICES
//    when an approved price is recorded (souvenir mug). Build-Your-Combo line
//    items are validated by recomputing from authoritative component MenuItems
//    + the authoritative ComboConfig discount (comboComponents + comboConfigId).
//  - Reward discount: validated exactly against the Square Loyalty reward tier
//    + account balance by validateRewardDiscount (called by createPaymentIntent
//    before this runs); the authoritative exact discount is passed in as
//    clientDiscount, so the total check below confirms it.

import { getHappyHourConfig, isHappyHourActive } from './happyHour.ts';
import { getOptionPriceOverrides } from './modifierOverrides.ts';
import { NONCATALOG_PRICES } from './noncatalogPrices.ts';
import { toCents, fromCents, salesTaxCents } from './taxMath.ts';

const TOLERANCE_CENTS = 1; // accept up to 1 cent of rounding drift

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Build a modifier-option id → authoritative price map from a MenuItem record.
function buildModifierPriceMap(
  menuItem: any,
  optionPriceOverrides: Record<string, number> = {},
): Record<string, number> {
  const map: Record<string, number> = {};
  // Nested modifier lists (Square child_modifier_lists — sauce Lite/Extra
  // preferences, soda ice/flavor follow-ups) are chosen by the customer and
  // carried on the line, so their authoritative prices belong in this map too.
  // Without them any order containing a nested choice was rejected as an
  // unknown modifier. Prices still come from the catalog, never the client.
  const walk = (groups: any[]) => {
    for (const group of (groups || [])) {
      for (const opt of (group?.modifiers || [])) {
        if (!opt?.id) continue;
        // An admin price override (Menu Manager → Modifiers) wins over the
        // Square catalog price, so the server charges exactly what the customer
        // was shown. Mirrored client-side by src/lib/modifierOverrides.js.
        map[opt.id] = optionPriceOverrides[opt.id] != null
          ? Number(optionPriceOverrides[opt.id]) || 0
          : Number(opt.price) || 0;
        walk(opt.child_modifier_lists);
      }
    }
  };
  walk(menuItem?.modifiers);
  return map;
}

// Validate a Build-Your-Combo line item by recomputing its price from
// authoritative component MenuItems + the authoritative ComboConfig discount.
// Each component must reference a real square_item_id with id'd modifiers; the
// combo price = (sum of authoritative component totals) × (1 − discount%).
async function validateComboItem(
  base44: any,
  item: any,
  menuBySquareId: Map<string, any>,
  optionPriceOverrides: Record<string, number> = {},
): Promise<{ ok: boolean; error?: string; lineUnitPrice?: number }> {
  const components = item.comboComponents as any[];
  let originalTotal = 0;
  for (const comp of components) {
    const sqId = comp.square_item_id || comp.catalog_object_id;
    if (!sqId) return { ok: false, error: `Combo component "${comp.name || 'unknown'}" is missing a catalog id. Please rebuild the combo and try again.` };
    const mi = menuBySquareId.get(sqId);
    if (!mi) return { ok: false, error: `Combo component "${comp.name || sqId}" is no longer available. Please rebuild the combo and try again.` };
    let compTotal = Number(mi.price) || 0;
    const modPriceMap = buildModifierPriceMap(mi, optionPriceOverrides);
    for (const sm of (comp.selectedModifiers || [])) {
      if (!sm) continue;
      if (sm.id && sm.id in modPriceMap) {
        compTotal += modPriceMap[sm.id];
      } else {
        return { ok: false, error: `Modifier "${sm.name || sm.id || 'unknown'}" is not a permitted selection for ${comp.name || 'this combo component'}. Please rebuild the combo and try again.` };
      }
    }
    originalTotal += compTotal;
  }
  const comboConfigId = item.comboConfigId;
  if (!comboConfigId) return { ok: false, error: 'Combo configuration is missing. Please rebuild the combo and try again.' };
  let discountPercent = 0;
  try {
    const cfg = await base44.asServiceRole.entities.ComboConfig.get(comboConfigId);
    if (!cfg || cfg.is_active === false) return { ok: false, error: 'This combo is no longer available. Please rebuild the combo and try again.' };
    discountPercent = Number(cfg.discount_percent) || 0;
  } catch (e) {
    return { ok: false, error: 'Combo configuration could not be verified. Please rebuild the combo and try again.' };
  }
  const expectedComboPrice = round2(originalTotal * (1 - discountPercent / 100));
  if (Math.abs((Number(item.price) || 0) - expectedComboPrice) > 0.01) {
    return { ok: false, error: `Combo price mismatch for ${item.name || 'this combo'}: expected $${expectedComboPrice.toFixed(2)}. Please rebuild the combo and try again.` };
  }
  return { ok: true, lineUnitPrice: expectedComboPrice };
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
  // Admin modifier price overrides. MenuItem.modifiers keeps the full Square
  // catalog (so the admin panel can always list and un-hide everything) and the
  // overrides live on MenuSetting — applied here so the charge matches the price
  // the customer was shown.
  const optionPrices = getOptionPriceOverrides(setting);

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
      // Authoritative base + authoritative catalog modifier prices. A catalog
      // item's modifiers MUST reference a real catalog option id — Deluxe
      // toppings, shake flavors, sizes, and mix-ins all come from the item's
      // Square modifier lists. Reject unknown-id / no-id modifiers instead of
      // trusting the client-supplied price (closes the ad-hoc modifier trust
      // gap and enforces permitted selections).
      lineUnitPrice = Number(menuItem.price) || 0;
      const modPriceMap = buildModifierPriceMap(menuItem, optionPrices);
      for (const sm of (item.selectedModifiers || [])) {
        if (!sm) continue;
        if (sm.id && sm.id in modPriceMap) {
          lineUnitPrice += modPriceMap[sm.id]; // authoritative catalog price
        } else {
          return { ok: false, error: `Modifier "${sm.name || sm.id || 'unknown'}" is not a permitted selection for ${item.name || 'this item'}. Please refresh the menu and try again.` };
        }
      }
    } else if (sqId) {
      // square_item_id present but not in our catalog — reject (unknown item).
      return { ok: false, error: `Menu item not found for square_item_id ${sqId}` };
    } else {
      // Noncatalog item (no square_item_id).
      // Build-Your-Combo: validate by recomputing from authoritative component
      // MenuItems + the authoritative ComboConfig discount (comboComponents +
      // comboConfigId). Each component must reference a real square_item_id with
      // id'd modifiers (same enforcement as a catalog item).
      if (Array.isArray(item.comboComponents) && item.comboComponents.length > 0) {
        const comboResult = await validateComboItem(base44, item, menuBySquareId, optionPrices);
        if (!comboResult.ok) return comboResult;
        lineUnitPrice = comboResult.lineUnitPrice!;
      } else {
        const canonical = NONCATALOG_PRICES[(item.name || '').toLowerCase().trim()];
        if (canonical != null) {
          if (Math.abs((Number(item.price) || 0) - canonical) > 0.01) {
            return { ok: false, error: `Price mismatch for ${item.name || 'this item'}: expected $${canonical.toFixed(2)}. Please refresh and try again.` };
          }
          lineUnitPrice = canonical;
        } else {
          lineUnitPrice = Math.max(0, Number(item.price) || 0);
          warnings.push(`Unvalidated noncatalog item (no square_item_id, no canonical price): ${item.name || item.id || 'unknown'}`);
        }
      }
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
  // Whole cents, rounded half up — the identical rule the client cart/checkout
  // uses (taxMath.ts ↔ src/lib/tax.js). Float tax on an odd-cent subtotal
  // rounded the half-cent the other way ($3.25 × 6% = $0.195) and rejected
  // genuinely correct carts with a total mismatch.
  const adjustedCents = toCents(adjustedSubtotal);
  const taxCents = salesTaxCents(adjustedCents);
  const serverTax = fromCents(taxCents);

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
  // Total assembled in whole cents so it is exactly the sum the client shows.
  const serverTotal = fromCents(
    Math.max(0, adjustedCents + toCents(serverDeliveryFee) + taxCents - toCents(serverDiscount)) + toCents(serverTip),
  );

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