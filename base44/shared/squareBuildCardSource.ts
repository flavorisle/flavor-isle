// Build cards use the unfiltered Square catalog, not the customer-facing MenuItem projection.
// No changes to Square or the online menu are made by this operation.
export function squareBuildCardSource(categories, items, lists) {
  const categoryIds = new Set(categories
    .filter(object => String(object.category_data?.name || '').trim().toLowerCase() === 'blend & bliss')
    .map(object => object.id));
  const listMap = new Map(lists.map(object => [object.id, object]));
  const ordered = values => [...values].sort((a, b) => (a.ordinal ?? 0) - (b.ordinal ?? 0));
  const overrideFlag = (value, fallback) => value === 'YES' ? true : value === 'NO' ? false : fallback;

  function resolveList(id, attachment = {}, ancestors = []) {
    if (ancestors.includes(id)) throw new Error(`Square modifier list cycle: ${id}`);
    const object = listMap.get(id);
    if (!object) throw new Error(`Square modifier list ${id} could not be loaded. Cards were not refreshed.`);
    const data = object.modifier_list_data;
    const overrides = new Map((attachment.modifier_overrides || []).map(value => [value.modifier_id, value]));
    return {
      id, name: data.name || '', enabled: attachment.enabled !== false,
      modifier_type: data.modifier_type || 'LIST', selection_type: data.selection_type || '',
      hidden_from_customer: overrideFlag(attachment.hidden_from_customer_override, data.hidden_from_customer === true),
      modifiers: ordered((data.modifiers || []).map(modifier => ({ ...modifier.modifier_data, id: modifier.id })))
        .map(modifier => {
          const override = overrides.get(modifier.id) || {};
          return {
            id: modifier.id, name: modifier.name || '', price_money: modifier.price_money || null,
            on_by_default: overrideFlag(override.on_by_default_override,
              override.on_by_default_override == null ? (override.on_by_default ?? modifier.on_by_default ?? false) : (modifier.on_by_default ?? false)),
            hidden_online: overrideFlag(override.hidden_online_override, modifier.hidden_online === true),
            sold_out: (modifier.location_overrides || []).some(value => value.sold_out === true),
            child_modifier_lists: (modifier.child_modifier_list_ids || [])
              .map(childId => resolveList(childId, {}, [...ancestors, id])),
          };
        }),
    };
  }

  return items.filter(object => categoryIds.has(object.item_data?.reporting_category?.id) ||
    (object.item_data?.categories || []).some(category => categoryIds.has(category.id)))
    .map(object => ({
      id: object.id, square_item_id: object.id, name: object.item_data.name || '',
      square_category: 'Blend & Bliss',
      is_available: object.item_data.is_archived !== true && object.is_archived !== true,
      variations: ordered((object.item_data.variations || []).map(variation => ({
        id: variation.id, name: variation.item_variation_data?.name || '',
        ordinal: variation.item_variation_data?.ordinal,
        price_money: variation.item_variation_data?.price_money || null,
        sold_out: (variation.item_variation_data?.location_overrides || []).some(value => value.sold_out === true),
      }))),
      modifiers: ordered(object.item_data.modifier_list_info || [])
        .map(attachment => resolveList(attachment.modifier_list_id, attachment)),
    }));
}