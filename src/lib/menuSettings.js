import { base44 } from '@/api/base44Client';

// Single-record settings document for menu-wide configuration.
//
// Reads and writes are pinned to the ONE live record (see the id below). A
// second record used to be creatable by any setter whose read came back empty,
// which is how a stale duplicate with the wrong delivery switch appeared — so
// there is no create path here at all any more: a missing record means the save
// fails loudly instead of silently forking the settings.
const MENU_SETTING_ID = '6a619923321f89b8d1cf8b3f';

// Module-level cache so multiple components/hooks on the same page load
// share one API call instead of each firing MenuSetting.list() independently.
let _cachedSetting = null;
let _fetchPromise = null;

// Safe default used when the settings record can't be loaded (e.g. API rate
// limit). Keeps the menu rendering with no hidden categories / default order
// instead of crashing the page.
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
  early_close: null,
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
      // Pinned read first — this is the one record the admin writes.
      const record = await base44.entities.MenuSetting.get(MENU_SETTING_ID).catch(() => null);
      if (record?.id) {
        _cachedSetting = record;
        return record;
      }
      const list = await base44.entities.MenuSetting.list();
      const existing = (list || [])[0];
      if (existing) {
        _cachedSetting = existing;
        return existing;
      }
      // No settings record at all. Never create one — a second record is the
      // bug this module was cleaned up to prevent. Defaults keep the site up.
      console.warn('getMenuSetting: no MenuSetting record found — using defaults');
      const fallback = { ...DEFAULT_SETTING };
      _cachedSetting = fallback;
      setTimeout(() => { _cachedSetting = null; }, 15000);
      return fallback;
    } catch (err) {
      // Transient API failure (rate limit, network, etc.): fall back to
      // defaults so callers keep working. Cache it briefly to avoid a
      // retry storm hammering the rate-limited endpoint.
      console.warn('getMenuSetting: using default fallback —', err?.message || err);
      const fallback = { ...DEFAULT_SETTING };
      _cachedSetting = fallback;
      // Clear the fallback after a short delay so a later retry can succeed.
      setTimeout(() => { _cachedSetting = null; }, 15000);
      return fallback;
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

// Every setter writes the pinned record. When it cannot be found, nothing is
// saved and the caller sees why — no second record is ever created.
async function requireSettingId() {
  const setting = await getMenuSetting();
  if (!setting?.id) {
    throw new Error('The store settings record could not be found, so nothing was saved. Reload the page and try again.');
  }
  return setting.id;
}

export async function setHiddenCategories(hiddenCategories) {
  const id = await requireSettingId();
  await base44.entities.MenuSetting.update(id, { hidden_categories: hiddenCategories });
  bustMenuSettingCache();
  return id;
}

export async function setCategorySortOrder(order) {
  const id = await requireSettingId();
  await base44.entities.MenuSetting.update(id, { category_sort_order: order });
  bustMenuSettingCache();
  return id;
}

export async function setOrderCutoffs({ closingTime, deliveryCutoff, pickupCutoff, deliveryFee }) {
  const setting = await getMenuSetting();
  const id = await requireSettingId();
  const updates = {
    closing_time: closingTime,
    delivery_cutoff_minutes: deliveryCutoff,
    pickup_cutoff_minutes: pickupCutoff,
  };
  if (typeof deliveryFee === 'number') updates.delivery_fee = deliveryFee;
  await base44.entities.MenuSetting.update(id, updates);
  bustMenuSettingCache();
  return { ...setting, ...updates };
}

export async function setDeliveryTiers(tiers) {
  const id = await requireSettingId();
  await base44.entities.MenuSetting.update(id, { delivery_tiers: tiers });
  bustMenuSettingCache();
  return id;
}

export async function setBusinessHours(hours) {
  const setting = await getMenuSetting();
  const id = await requireSettingId();
  await base44.entities.MenuSetting.update(id, { business_hours: hours });
  bustMenuSettingCache();
  return { ...setting, business_hours: hours };
}

export async function setDeliveryEnabled(enabled) {
  const setting = await getMenuSetting();
  const id = await requireSettingId();
  const updates = { delivery_enabled: enabled };
  await base44.entities.MenuSetting.update(id, updates);
  bustMenuSettingCache();
  return { ...setting, ...updates };
}

export async function setOrderingEnabled(enabled, closedMessage) {
  const setting = await getMenuSetting();
  const id = await requireSettingId();
  const updates = { ordering_enabled: enabled };
  if (typeof closedMessage === 'string' && closedMessage.trim()) updates.ordering_closed_message = closedMessage.trim();
  await base44.entities.MenuSetting.update(id, updates);
  bustMenuSettingCache();
  return { ...setting, ...updates };
}

// One-day early close: { date: 'YYYY-MM-DD', close_time: 'HH:MM', message: '' }.
// Passing null (or a blank date) clears it. Honored only on its own date, so the
// weekly hours are never edited by this.
export async function setEarlyClose(earlyClose) {
  const setting = await getMenuSetting();
  const id = await requireSettingId();
  const value = earlyClose?.date && earlyClose?.close_time
    ? {
      date: String(earlyClose.date).slice(0, 10),
      close_time: String(earlyClose.close_time).slice(0, 5),
      message: String(earlyClose.message || '').trim(),
    }
    : null;
  await base44.entities.MenuSetting.update(id, { early_close: value });
  bustMenuSettingCache();
  return { ...setting, early_close: value };
}

export async function setCategoryRenames(renames) {
  const id = await requireSettingId();
  await base44.entities.MenuSetting.update(id, { category_renames: renames });
  bustMenuSettingCache();
  return id;
}

export async function setCategoryItemOrder(order) {
  const id = await requireSettingId();
  await base44.entities.MenuSetting.update(id, { category_item_order: order });
  bustMenuSettingCache();
  return id;
}

export async function setClosure(closure) {
  const setting = await getMenuSetting();
  const id = await requireSettingId();
  await base44.entities.MenuSetting.update(id, { closure });
  bustMenuSettingCache();
  return { ...setting, closure };
}

export async function setHappyHour(happyHour) {
  const setting = await getMenuSetting();
  const id = await requireSettingId();
  await base44.entities.MenuSetting.update(id, { happy_hour: happyHour });
  bustMenuSettingCache();
  return { ...setting, happy_hour: happyHour };
}

export async function setSiteNotice(siteNotice) {
  const setting = await getMenuSetting();
  const id = await requireSettingId();
  await base44.entities.MenuSetting.update(id, { site_notice: siteNotice });
  bustMenuSettingCache();
  return { ...setting, site_notice: siteNotice };
}

// Extra-cook day (YYYY-MM-DD, store local). When it matches today the kitchen
// is treated as running at double output — the busyness indicator and wait
// quotes stretch/thin accordingly. Empty string clears it.
export async function setExtraCookDate(dateKey) {
  const setting = await getMenuSetting();
  const id = await requireSettingId();
  const updates = { extra_cook_date: dateKey || '' };
  await base44.entities.MenuSetting.update(id, updates);
  bustMenuSettingCache();
  return { ...setting, ...updates };
}

export async function setDeluxeConfig(deluxe) {
  const setting = await getMenuSetting();
  const id = await requireSettingId();
  await base44.entities.MenuSetting.update(id, { deluxe });
  bustMenuSettingCache();
  return { ...setting, deluxe };
}

// Admin modifier controls (hidden groups/options, sold out, site price
// overrides) — see src/lib/modifierOverrides.js for the shape.
export async function setModifierOverrides(overrides) {
  const setting = await getMenuSetting();
  const id = await requireSettingId();
  await base44.entities.MenuSetting.update(id, { modifier_overrides: overrides });
  bustMenuSettingCache();
  return { ...setting, modifier_overrides: overrides };
}