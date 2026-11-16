// Server-side order pricing authority. Recomputes subtotal, Happy Hour
// discount, tax, and delivery fee from authoritative MenuItem + MenuSetting
// records so a manipulated client total can never be charged. Used by
// createPaymentIntent before any Stripe intent exists, and by the hosted-page
// checkout endpoints (createWixWebCheckout, createSquareWebCheckout) before
// any payable page is opened.
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
//  - Lines with no square_item_id: priced from the catalog by NAME when the name
//    matches a live MenuItem (same authoritative price and modifier rules as a
//    line that carried the id), then from NONCATALOG_PRICES when an approved price
//    is recorded (souvenir mug), and otherwise REJECTED — fail closed, because a
//    client-supplied price is never authoritative.
//  - Combo Isle boxes: each line prices as the catalog item it is; a group that
//    holds a main + a side + a drink is a box and gives back 9% of its own catalog
//    total (see comboIsle.ts), and no line of a whole box takes Happy Hour.
//  - Reward discount: validated exactly against the Square Loyalty reward tier
//    + account balance by validateRewardDiscount (called by createPaymentIntent
//    before this runs); the authoritative exact discount is passed in as
//    clientDiscount, so the total check below confirms it.

import { getHappyHourConfig, isHappyHourActive } from './happyHour.ts';
import { getOptionPriceOverrides } from './modifierOverrides.ts';
import { modifierRuleFailures } from './modifierRules.ts';
import { NONCATALOG_PRICES } from './noncatalogPrices.ts';
import { bundleForLine, bundleDiscountForLines } from './familyBundle.ts';
import { completeComboGroups, comboDiscountForLines } from './comboIsle.ts';
import { toCents, fromCents, salesTaxCents } from './taxMath.ts';
import { getMenuSettingRecord } from './storeState.ts';
import { isSmashieShake } from './findSmashiePrize.ts';

const TOLERANCE_CENTS = 1; // accept up to 1 cent of rounding drift

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Menu items are matched by name for lines that arrive without a catalog id.
function normalizeItemName(value: any): string {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
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

export interface PricingResult {
  ok: boolean;
  error?: string;
  subtotal?: number;
  happyHourDiscount?: number;
  bundleDiscount?: number;
  // The 9% taken off complete Combo Isle boxes — already deducted from subtotal.
  comboDiscount?: number;
  tax?: number;
  deliveryFee?: number;
  discount?: number;
  // The Find Smashie free-shake prize, priced from the catalog (issue #108).
  freeShakeDiscount?: number;
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
  clientBundleDiscount?: number;
  // Set only by a caller that has already proven the customer holds today's
  // unused free-shake win. The amount is never taken from the client: it is the
  // authoritative price of the most expensive shake line below.
  freeShakePrize?: boolean;
}): Promise<PricingResult> {
  const {
    items, orderType, deliveryAddress,
    clientSubtotal, clientDeliveryFee, clientTax, clientTotal,
    clientTip = 0, clientDiscount = 0, clientHappyHourDiscount = 0, clientBundleDiscount = 0,
    freeShakePrize = false,
  } = opts;

  if (!items || items.length === 0) return { ok: false, error: 'No items provided' };

  const warnings: string[] = [];

  // ── Load MenuSetting + MenuItems ──
  // The single pinned settings record — the same one the website and Smashie read.
  const setting = await getMenuSettingRecord(base44);
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
  // Name index: a line that arrives without a catalog id is still priced from the
  // catalog when its name matches a live menu item, so a cart can never be charged
  // a client-supplied price for real food.
  const menuByName = new Map<string, any>();
  for (const mi of (allMenuItems || [])) {
    if (mi.square_item_id) menuBySquareId.set(mi.square_item_id, mi);
    const nameKey = normalizeItemName(mi?.name);
    if (nameKey && !menuByName.has(nameKey)) menuByName.set(nameKey, mi);
  }

  // Combo Isle: a box is a main + a side + a drink in one comboGroup. A group
  // missing any of the three is not a box, so its lines price as singles.
  const completeComboIds = completeComboGroups(items);

  // ── Recompute line prices + Happy Hour + family bundle ──
  let serverSubtotal = 0;
  let serverHappyHour = 0;
  // The dearest shake line's unit price — the free Find Smashie shake comes off
  // the order at exactly this price, from the same catalog authority as every
  // other line price above.
  let freeShakeUnitPrice = 0;
  // Per bundle-line included money, grouped so each added bundle pays its fixed
  // price once. The discount is recomputed from the catalog below.
  const bundleLines: Array<{ bundleId?: string; bundleGroup?: string; includedUnitPrice: number; quantity: number }> = [];
  // Catalog money in each complete Combo Isle box, so the 9% is recomputed here.
  const comboLines: Array<{ comboGroup: string; fullUnitPrice: number; quantity: number }> = [];
  for (const item of items) {
    const qty = Number(item.quantity) || 1;
    const inCompleteCombo = !!(item.comboGroup && completeComboIds.has(item.comboGroup));
    const sqId = item.square_item_id || item.catalog_object_id;
    // Catalog id first. Without one, resolve by name so the line is still priced
    // from the menu rather than from the client's number.
    const nameKey = normalizeItemName(item?.name);
    const menuItem = sqId
      ? menuBySquareId.get(sqId)
      : nameKey
        ? menuByName.get(nameKey)
        : null;

    let lineUnitPrice: number;
    let bundleExtras = 0;
    // Which bundle (School Night Lifesaver / Weekend Party Pack) this line
    // belongs to, when it belongs to one. Null for ordinary lines.
    let bundle: any = null;
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
      // Square's selection rules (minimum and maximum per group) are part of
      // the catalog, so they are enforced here and not only in the browser. A
      // bundle or combo line offers a deliberately trimmed list, so its
      // minimum is skipped: a rule cannot be met for options never shown.
      const ruleProblems = modifierRuleFailures(
        menuItem,
        (item.selectedModifiers || []).map((sm: any) => sm?.id).filter(Boolean),
        { skipMinimums: !!(item.bundleId || item.bundleGroup || item.comboGroup) },
      );
      if (ruleProblems.length > 0) {
        return { ok: false, error: `${item.name || 'This item'}: ${ruleProblems[0].message}. Please refresh the menu and try again.` };
      }
      // Family bundle line: the priced options the bundle does NOT already
      // include (jalapeños, extra-level lettuce/tomato, drink flavor shots,
      // cake toppings) are the customer's paid extras and stay on top.
      bundle = bundleForLine(item);
      if (bundle) {
        bundleExtras = (item.selectedModifiers || []).reduce((sum: number, sm: any) => {
          if (!sm) return sum;
          if (bundle.includedOptionIds.has(sm.id)) return sum;
          return sum + (sm.id && sm.id in modPriceMap ? modPriceMap[sm.id] : 0);
        }, 0);
      }
    } else if (sqId) {
      // square_item_id present but not in our catalog — reject (unknown item).
      return { ok: false, error: `Menu item not found for square_item_id ${sqId}` };
    } else {
      // Noncatalog item (no square_item_id): an approved fixed price or nothing.
      {
        const canonical = NONCATALOG_PRICES[normalizeItemName(item.name)];
        if (canonical != null) {
          if (Math.abs((Number(item.price) || 0) - canonical) > 0.01) {
            return { ok: false, error: `Price mismatch for ${item.name || 'this item'}: expected $${canonical.toFixed(2)}. Please refresh and try again.` };
          }
          lineUnitPrice = canonical;
        } else {
          // Fail closed. The name did not match a live menu item and there is no
          // approved non-catalog price for it, so there is no authoritative price
          // to charge. Trusting the client here is what let a crafted cart buy real
          // food for a cent, so the line is rejected instead.
          return {
            ok: false,
            error: `${item.name || 'An item in your cart'} could not be verified on the current menu. Please refresh the menu and try again.`,
          };
        }
      }
    }

    // One free shake (issue #108): the most expensive shake line in the order.
    if (freeShakePrize && menuItem && isSmashieShake(menuItem, item) && lineUnitPrice > freeShakeUnitPrice) {
      freeShakeUnitPrice = lineUnitPrice;
    }

    const lineTotal = lineUnitPrice * qty;
    serverSubtotal += lineTotal;
    if (inCompleteCombo) comboLines.push({ comboGroup: item.comboGroup, fullUnitPrice: lineUnitPrice, quantity: qty });

    if (bundle) {
      bundleLines.push({ bundleId: item.bundleId, bundleGroup: item.bundleGroup, includedUnitPrice: round2(lineUnitPrice - bundleExtras), quantity: qty });
    }

    // A bundle line is never also Happy-Hour discounted — the bundle price is
    // the whole deal and stacking both would undercut its fixed price. A line
    // resolved by name uses the catalog item's own id here, so an eligible drink
    // still gets the discount the customer was shown.
    const effectiveSqId = sqId || menuItem?.square_item_id || '';
    if (hhActive && pct > 0 && effectiveSqId && hhIds.has(effectiveSqId) && !bundle && !inCompleteCombo) {
      serverHappyHour += lineTotal * pct;
    }
  }

  // The 9% comes off each whole box, from the catalog prices above. The client
  // sends the box price spread across its lines, so its subtotal is this same
  // number and nothing here is taken from the browser.
  const serverComboDiscount = comboDiscountForLines(comboLines);
  serverSubtotal = round2(serverSubtotal - serverComboDiscount);
  serverHappyHour = round2(serverHappyHour);
  const serverBundleDiscount = bundleDiscountForLines(bundleLines);
  const adjustedSubtotal = round2(serverSubtotal - serverHappyHour - serverBundleDiscount);

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
  // The free shake comes off whatever is left after the reward discount, so the
  // two can never take the total below zero.
  const serverFreeShake = freeShakePrize
    ? round2(Math.min(freeShakeUnitPrice, Math.max(0, adjustedSubtotal - serverDiscount)))
    : 0;
  const serverTip = Math.max(0, Number(clientTip) || 0);
  // Total assembled in whole cents so it is exactly the sum the client shows.
  const serverTotal = fromCents(
    Math.max(
      0,
      adjustedCents + toCents(serverDeliveryFee) + taxCents - toCents(serverDiscount) - toCents(serverFreeShake),
    ) + toCents(serverTip),
  );

  // ── Validate each authoritative component against the client ──
  const checks: Array<[number, number, string]> = [
    [serverSubtotal, clientSubtotal, 'subtotal'],
    [serverHappyHour, clientHappyHourDiscount, 'happy hour discount'],
    [serverBundleDiscount, clientBundleDiscount, 'bundle discount'],
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
    bundleDiscount: serverBundleDiscount,
    comboDiscount: serverComboDiscount,
    tax: serverTax,
    deliveryFee: serverDeliveryFee,
    discount: serverDiscount,
    freeShakeDiscount: serverFreeShake,
    tip: serverTip,
    total: round2(clientTotal), // validated — charge what the customer saw
    warnings,
  };
}