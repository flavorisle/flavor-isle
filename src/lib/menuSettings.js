import { base44 } from '@/api/base44Client';

// Single-record settings document for menu-wide configuration.
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
  site_notice: null,
  extra_cook_date: '',
  deluxe: { enabled: true, presets: [] },
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
      const list = await base44.entities.MenuSetting.list();
      const existing = (list || [])[0];
      if (existing) {
        _cachedSetting = existing;
        return existing;
      }
      const created = await base44.entities.MenuSetting.create({ hidden_categories: [] });
      _cachedSetting = created;
      return created;
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

export async function setHiddenCategories(hiddenCategories) {
  const setting = await getMenuSetting();
  if (setting?.id) {
    await base44.entities.MenuSetting.update(setting.id, { hidden_categories: hiddenCategories });
    bustMenuSettingCache();
    return setting.id;
  }
  const created = await base44.entities.MenuSetting.create({ hidden_categories: hiddenCategories });
  bustMenuSettingCache();
  return created.id;
}

export async function setCategorySortOrder(order) {
  const setting = await getMenuSetting();
  if (setting?.id) {
    await base44.entities.MenuSetting.update(setting.id, { category_sort_order: order });
    bustMenuSettingCache();
    return setting.id;
  }
  const created = await base44.entities.MenuSetting.create({ hidden_categories: [], category_sort_order: order });
  bustMenuSettingCache();
  return created.id;
}

export async function setOrderCutoffs({ closingTime, deliveryCutoff, pickupCutoff, deliveryFee }) {
  const setting = await getMenuSetting();
  const updates = {
    closing_time: closingTime,
    delivery_cutoff_minutes: deliveryCutoff,
    pickup_cutoff_minutes: pickupCutoff,
  };
  if (typeof deliveryFee === 'number') updates.delivery_fee = deliveryFee;
  await base44.entities.MenuSetting.update(setting.id, updates);
  bustMenuSettingCache();
  return { ...setting, ...updates };
}

export async function setDeliveryTiers(tiers) {
  const setting = await getMenuSetting();
  if (setting?.id) {
    await base44.entities.MenuSetting.update(setting.id, { delivery_tiers: tiers });
    bustMenuSettingCache();
    return setting.id;
  }
  const created = await base44.entities.MenuSetting.create({ hidden_categories: [], delivery_tiers: tiers });
  bustMenuSettingCache();
  return created.id;
}

export async function setBusinessHours(hours) {
  const setting = await getMenuSetting();
  await base44.entities.MenuSetting.update(setting.id, { business_hours: hours });
  bustMenuSettingCache();
  return { ...setting, business_hours: hours };
}

export async function setDeliveryEnabled(enabled) {
  const setting = await getMenuSetting();
  const updates = { delivery_enabled: enabled };
  if (setting?.id) {
    await base44.entities.MenuSetting.update(setting.id, updates);
    bustMenuSettingCache();
    return { ...setting, ...updates };
  }
  const created = await base44.entities.MenuSetting.create({ hidden_categories: [], delivery_enabled: enabled });
  bustMenuSettingCache();
  return created;
}

export async function setOrderingEnabled(enabled, closedMessage) {
  const setting = await getMenuSetting();
  const updates = { ordering_enabled: enabled };
  if (typeof closedMessage === 'string') updates.ordering_closed_message = closedMessage;
  if (setting?.id) {
    await base44.entities.MenuSetting.update(setting.id, updates);
    bustMenuSettingCache();
    return { ...setting, ...updates };
  }
  const created = await base44.entities.MenuSetting.create({
    hidden_categories: [],
    ordering_enabled: enabled,
    ordering_closed_message: typeof closedMessage === 'string' ? closedMessage : 'Ordering is temporarily closed',
  });
  bustMenuSettingCache();
  return created;
}

export async function setCategoryRenames(renames) {
  const setting = await getMenuSetting();
  if (setting?.id) {
    await base44.entities.MenuSetting.update(setting.id, { category_renames: renames });
    bustMenuSettingCache();
    return setting.id;
  }
  const created = await base44.entities.MenuSetting.create({ hidden_categories: [], category_renames: renames });
  bustMenuSettingCache();
  return created.id;
}

export async function setCategoryItemOrder(order) {
  const setting = await getMenuSetting();
  if (setting?.id) {
    await base44.entities.MenuSetting.update(setting.id, { category_item_order: order });
    bustMenuSettingCache();
    return setting.id;
  }
  const created = await base44.entities.MenuSetting.create({ hidden_categories: [], category_item_order: order });
  bustMenuSettingCache();
  return created.id;
}

export async function setClosure(closure) {
  const setting = await getMenuSetting();
  if (setting?.id) {
    await base44.entities.MenuSetting.update(setting.id, { closure });
    bustMenuSettingCache();
    return { ...setting, closure };
  }
  const created = await base44.entities.MenuSetting.create({ hidden_categories: [], closure });
  bustMenuSettingCache();
  return created;
}

export async function setHappyHour(happyHour) {
  const setting = await getMenuSetting();
  if (setting?.id) {
    await base44.entities.MenuSetting.update(setting.id, { happy_hour: happyHour });
    bustMenuSettingCache();
    return { ...setting, happy_hour: happyHour };
  }
  const created = await base44.entities.MenuSetting.create({ hidden_categories: [], happy_hour: happyHour });
  bustMenuSettingCache();
  return created;
}

export async function setSiteNotice(siteNotice) {
  const setting = await getMenuSetting();
  if (setting?.id) {
    await base44.entities.MenuSetting.update(setting.id, { site_notice: siteNotice });
    bustMenuSettingCache();
    return { ...setting, site_notice: siteNotice };
  }
  const created = await base44.entities.MenuSetting.create({ hidden_categories: [], site_notice: siteNotice });
  bustMenuSettingCache();
  return created;
}

// Extra-cook day (YYYY-MM-DD, store local). When it matches today the kitchen
// is treated as running at double output — the busyness indicator and wait
// quotes stretch/thin accordingly. Empty string clears it.
export async function setExtraCookDate(dateKey) {
  const setting = await getMenuSetting();
  const updates = { extra_cook_date: dateKey || '' };
  if (setting?.id) {
    await base44.entities.MenuSetting.update(setting.id, updates);
    bustMenuSettingCache();
    return { ...setting, ...updates };
  }
  const created = await base44.entities.MenuSetting.create({ hidden_categories: [], ...updates });
  bustMenuSettingCache();
  return created;
}

export async function setDeluxeConfig(deluxe) {
  const setting = await getMenuSetting();
  if (setting?.id) {
    await base44.entities.MenuSetting.update(setting.id, { deluxe });
    bustMenuSettingCache();
    return { ...setting, deluxe };
  }
  const created = await base44.entities.MenuSetting.create({ hidden_categories: [], deluxe });
  bustMenuSettingCache();
  return created;
}