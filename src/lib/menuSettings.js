import { base44 } from '@/api/base44Client';

// Single-record settings document for menu-wide configuration.
// Module-level cache so multiple components/hooks on the same page load
// share one API call instead of each firing MenuSetting.list() independently.
let _cachedSetting = null;
let _fetchPromise = null;

// Safe default used when the settings record can't be loaded. Keeps the menu
// rendering with no hidden categories / default order instead of crashing.
const DEFAULT_SETTING = {
  id: null,
  hidden_categories: [],
  category_sort_order: [],
  category_renames: {},
  category_item_order: {},
  ordering_enabled: true,
  ordering_closed_message: 'Ordering is temporarily closed',
  closing_time: '20:00',
  delivery_cutoff_minutes: 30,
  pickup_cutoff_minutes: 15,
  delivery_fee: 0,
  business_hours: null,
  closure: null,
  site_notice: null,
  extra_cook_date: '',
  deluxe: { enabled: false, presets: [] },
  modifier_overrides: { hidden_groups: [], hidden_options: [], sold_out_options: [], option_prices: {} },
  happy_hour: {
    active: true,
    start_time: '14:00',
    end_time: '18:00',
    discount_percent: 50,
    square_item_ids: ['MTOVX3FLW3QYAZRHAXMZMWYN'],
    label: 'Happy Hour — 50% off drinks',
  },
};

export async function getMenuSetting() {
  if (_cachedSetting) return _cachedSetting;
  if (_fetchPromise) return _fetchPromise;
  _fetchPromise = (async () => {
    try {
      const list = await base44.entities.MenuSetting.list('-created_date', 1);
      const existing = (list || [])[0];
      if (existing?.id) {
        _cachedSetting = existing;
        return existing;
      }
      return { ...DEFAULT_SETTING };
    } catch (err) {
      // Transient API failure (rate limit, network, etc.): fall back to
      // defaults so callers keep working.
      console.warn('getMenuSetting: using default fallback —', err?.message || err);
      return { ...DEFAULT_SETTING };
    }
  })();
  try {
    return await _fetchPromise;
  } finally {
    _fetchPromise = null;
  }
}

// Allow admin pages to bust the cache after updating settings.
export function bustMenuSettingCache() {
  _cachedSetting = null;
  _fetchPromise = null;
}

async function updateMenuSetting(updates) {
  const setting = await getMenuSetting();
  if (!setting?.id) {
    throw new Error('Cannot update MenuSetting without an existing settings record.');
  }
  await base44.entities.MenuSetting.update(setting.id, updates);
  bustMenuSettingCache();
  return { ...setting, ...updates };
}

export async function setHiddenCategories(hiddenCategories) {
  return (await updateMenuSetting({ hidden_categories: hiddenCategories })).id;
}

export async function setCategorySortOrder(order) {
  return (await updateMenuSetting({ category_sort_order: order })).id;
}

export async function setOrderCutoffs({ closingTime, deliveryCutoff, pickupCutoff, deliveryFee }) {
  const updates = {
    closing_time: closingTime,
    delivery_cutoff_minutes: deliveryCutoff,
    pickup_cutoff_minutes: pickupCutoff,
  };
  if (typeof deliveryFee === 'number') updates.delivery_fee = deliveryFee;
  return updateMenuSetting(updates);
}

export async function setDeliveryTiers(tiers) {
  return (await updateMenuSetting({ delivery_tiers: tiers })).id;
}

export async function setBusinessHours(hours) {
  return updateMenuSetting({ business_hours: hours });
}

export async function setDeliveryEnabled(enabled) {
  return updateMenuSetting({ delivery_enabled: enabled });
}

export async function setOrderingEnabled(enabled, closedMessage) {
  const updates = { ordering_enabled: enabled };
  if (typeof closedMessage === 'string') updates.ordering_closed_message = closedMessage;
  return updateMenuSetting(updates);
}

export async function setCategoryRenames(renames) {
  return (await updateMenuSetting({ category_renames: renames })).id;
}

export async function setCategoryItemOrder(order) {
  return (await updateMenuSetting({ category_item_order: order })).id;
}

export async function setClosure(closure) {
  return updateMenuSetting({ closure });
}

export async function setHappyHour(happyHour) {
  return updateMenuSetting({ happy_hour: happyHour });
}

export async function setSiteNotice(siteNotice) {
  return updateMenuSetting({ site_notice: siteNotice });
}

// Extra-cook day (YYYY-MM-DD, store local). When it matches today the kitchen
// is treated as running at double output — the busyness indicator and wait
// quotes stretch/thin accordingly. Empty string clears it.
export async function setExtraCookDate(dateKey) {
  const updates = { extra_cook_date: dateKey || '' };
  return updateMenuSetting(updates);
}

export async function setDeluxeConfig(deluxe) {
  return updateMenuSetting({ deluxe });
}

// Admin modifier controls (hidden groups/options, sold out, site price
// overrides) — see src/lib/modifierOverrides.js for the shape.
export async function setModifierOverrides(overrides) {
  return updateMenuSetting({ modifier_overrides: overrides });
}