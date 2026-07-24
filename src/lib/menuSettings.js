import { base44 } from '@/api/base44Client';

// Single-record settings document for menu-wide configuration.
export async function getMenuSetting() {
  const list = await base44.entities.MenuSetting.list();
  const existing = (list || [])[0];
  if (existing) return existing;
  return base44.entities.MenuSetting.create({ hidden_categories: [] });
}

export async function setHiddenCategories(hiddenCategories) {
  const setting = await getMenuSetting();
  if (setting?.id) {
    await base44.entities.MenuSetting.update(setting.id, { hidden_categories: hiddenCategories });
    return setting.id;
  }
  const created = await base44.entities.MenuSetting.create({ hidden_categories: hiddenCategories });
  return created.id;
}

export async function setCategorySortOrder(order) {
  const setting = await getMenuSetting();
  if (setting?.id) {
    await base44.entities.MenuSetting.update(setting.id, { category_sort_order: order });
    return setting.id;
  }
  const created = await base44.entities.MenuSetting.create({ hidden_categories: [], category_sort_order: order });
  return created.id;
}

export async function setOrderCutoffs({ closingTime, deliveryCutoff, pickupCutoff }) {
  const setting = await getMenuSetting();
  const updates = {
    closing_time: closingTime,
    delivery_cutoff_minutes: deliveryCutoff,
    pickup_cutoff_minutes: pickupCutoff,
  };
  await base44.entities.MenuSetting.update(setting.id, updates);
  return { ...setting, ...updates };
}

export async function setOrderingEnabled(enabled, closedMessage) {
  const setting = await getMenuSetting();
  const updates = { ordering_enabled: enabled };
  if (typeof closedMessage === 'string') updates.ordering_closed_message = closedMessage;
  if (setting?.id) {
    await base44.entities.MenuSetting.update(setting.id, updates);
    return { ...setting, ...updates };
  }
  return base44.entities.MenuSetting.create({
    hidden_categories: [],
    ordering_enabled: enabled,
    ordering_closed_message: typeof closedMessage === 'string' ? closedMessage : 'Ordering is temporarily closed',
  });
}