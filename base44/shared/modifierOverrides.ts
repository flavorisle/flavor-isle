// Admin modifier price overrides (mirrors src/lib/modifierOverrides.js).
//
// The admin panel stores modifier overrides on MenuSetting.modifier_overrides.
// Only the PRICE map is authoritative server-side: verifyOrderPricing must charge
// the price the customer was shown, otherwise a genuinely correct cart is
// rejected with a price mismatch.
//
// Hidden groups/options and sold-out flags are deliberately NOT enforced here.
// They are catalog-visibility controls — exactly like the sold_out and
// hidden_from_customer flags Square itself provides, which only shape what the
// menu renders. Enforcing them server-side would reject legitimate orders whose
// cart was built before the toggle, including the required "Size" group, which
// is built from item variations and carries every sized order's variation id.

export interface ModifierPriceOverrides {
  [modifierId: string]: number;
}

// Option id → overridden site price, read from the store's MenuSetting record.
export function getOptionPriceOverrides(setting: any): ModifierPriceOverrides {
  const prices = setting?.modifier_overrides?.option_prices;
  if (!prices || typeof prices !== 'object') return {};
  const out: ModifierPriceOverrides = {};
  for (const [id, value] of Object.entries(prices)) {
    const n = Number(value);
    if (id && Number.isFinite(n) && n >= 0) out[id] = n;
  }
  return out;
}