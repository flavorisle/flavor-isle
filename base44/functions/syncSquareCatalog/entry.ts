import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { optimizeItemImage } from '../../shared/optimizeItemImage.ts';

const SQUARE_VERSION = '2026-09-16';

async function squareFetch(accessToken, path) {
  const res = await fetch(`https://connect.squareup.com/v2${path}`, {
    headers: { 'Authorization': `Bearer ${accessToken}`, 'Square-Version': SQUARE_VERSION }
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Square API error on ${path}: ${JSON.stringify(data.errors)}`);
  return data;
}

// Paginate through all catalog objects of given types
async function fetchAllCatalog(accessToken, types) {
  const objects = [];
  let cursor = null;
  do {
    const url = `/catalog/list?types=${types}${cursor ? `&cursor=${cursor}` : ''}`;
    const data = await squareFetch(accessToken, url);
    objects.push(...(data.objects || []));
    cursor = data.cursor || null;
  } while (cursor);
  return objects;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('square');

    // 1. Fetch all object types separately (Square returns empty for combined types in some API versions)
    console.log('Fetching categories...');
    const categoryObjects = await fetchAllCatalog(accessToken, 'CATEGORY');

    console.log('Fetching modifier lists...');
    const modifierObjects = await fetchAllCatalog(accessToken, 'MODIFIER_LIST');

    console.log('Fetching images...');
    const imageObjects = await fetchAllCatalog(accessToken, 'IMAGE');

    console.log('Fetching items...');
    const itemObjects = await fetchAllCatalog(accessToken, 'ITEM');

    console.log(`Fetched: ${categoryObjects.length} categories, ${modifierObjects.length} modifier lists, ${imageObjects.length} images, ${itemObjects.length} items`);

    // 2. Build lookup maps
    const categoryMap = {};
    for (const obj of categoryObjects) {
      categoryMap[obj.id] = obj.category_data?.name || '';
    }

    const modifierListMap = {};
    for (const obj of modifierObjects) {
      modifierListMap[obj.id] = {
        id: obj.id,
        name: obj.modifier_list_data?.name || '',
        selection_type: obj.modifier_list_data?.selection_type || 'SINGLE',
        modifiers: (obj.modifier_list_data?.modifiers || []).map(m => ({
          id: m.id,
          name: m.modifier_data?.name || '',
          price: m.modifier_data?.price_money ? m.modifier_data.price_money.amount / 100 : 0,
          sold_out: (m.modifier_data?.location_overrides || []).some(o => o.sold_out === true),
          child_modifier_list_ids: m.modifier_data?.child_modifier_list_ids || [],
        })),
      };
    }

    // Recursively resolve child modifier lists (Square nested modifiers).
    // A modifier with child_modifier_list_ids reveals follow-up modifier lists
    // when selected (e.g., picking a soda reveals ice level + flavor choices,
    // picking a sauce reveals lite/regular/extra). Square supports up to 3
    // levels of nesting depth. All modifier lists were fetched above, so child
    // lists are resolved from the same map without extra API calls.
    function resolveList(listId, depth = 0) {
      if (depth > 3) return null;
      const list = modifierListMap[listId];
      if (!list) return null;
      return {
        id: list.id,
        name: list.name,
        selection_type: list.selection_type,
        modifiers: list.modifiers.map(m => {
          const childLists = (m.child_modifier_list_ids || [])
            .map(cid => resolveList(cid, depth + 1))
            .filter(Boolean);
          return {
            id: m.id,
            name: m.name,
            price: m.price,
            sold_out: m.sold_out,
            ...(childLists.length > 0 ? { child_modifier_lists: childLists } : {}),
          };
        }),
      };
    }

    const imageMap = {};
    for (const obj of imageObjects) {
      imageMap[obj.id] = obj.image_data?.url || null;
    }

    // 3. Parse ITEM objects
    const menuItems = [];
    for (const obj of itemObjects) {
      if (obj.type !== 'ITEM') continue;
      const itemData = obj.item_data || {};
      if (!itemData.name) continue;

      // Use reporting_category as the primary category (Square's designated display category)
      const primaryCatId = itemData.reporting_category?.id || itemData.categories?.[0]?.id || null;
      const rawCatName = primaryCatId ? (categoryMap[primaryCatId] || '') : '';
      // Normalize to title case so "WHIRL & TWIRL" and "Whirl & Twirl" merge into one
      const squareCategory = rawCatName
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());

      // Image: from item image_ids
      let image_url = null;
      if (itemData.image_ids && itemData.image_ids.length > 0) {
        image_url = imageMap[itemData.image_ids[0]] || null;
      }

      // Modifiers: only enabled, non-hidden modifier lists. Nested modifier
      // lists (child lists revealed when a parent modifier is selected) are
      // resolved recursively by resolveList so they're stored on each modifier
      // option and rendered by the UI when the parent is selected.
      const modifiers = [];
      if (itemData.modifier_list_info) {
        for (const mli of itemData.modifier_list_info) {
          if (!mli.enabled) continue;
          if (mli.hidden_from_customer) continue;
          const resolved = resolveList(mli.modifier_list_id);
          if (resolved && resolved.modifiers.length > 0) {
            modifiers.push(resolved);
          }
        }
      }

      // Sold-out state comes from Square location overrides on each variation.
      const isVariationSoldOut = (v) =>
        v.item_variation_data?.sellable === false ||
        (v.item_variation_data?.location_overrides || []).some(o => o.sold_out === true);

      // Base price = CHEAPEST available variation, so size upcharges are never negative.
      const variations = itemData.variations || [];
      const availableVariations = variations.filter(v => !isVariationSoldOut(v));
      const variationPrices = (availableVariations.length > 0 ? availableVariations : variations)
        .map(v => v.item_variation_data?.price_money?.amount)
        .filter(a => a != null);
      const priceAmount = variationPrices.length > 0 ? Math.min(...variationPrices) : null;
      const price = priceAmount != null ? priceAmount / 100 : 0;

      // Multiple variations (e.g. drink sizes) → expose as a required "Size"
      // choice so the selection flows through to the Square order / kitchen ticket.
      // Sorted cheapest-first so the default selection matches the displayed base price.
      if (variations.length > 1) {
        modifiers.unshift({
          name: 'Size',
          selection_type: 'SINGLE',
          modifiers: variations
            .map(v => ({
              id: v.id,
              name: v.item_variation_data?.name || '',
              price: ((v.item_variation_data?.price_money?.amount ?? priceAmount ?? 0) - (priceAmount ?? 0)) / 100,
              sold_out: isVariationSoldOut(v),
            }))
            .sort((a, b) => a.price - b.price),
        });
      }

      // Availability: item is sold out when every variation is sold out on Square.
      const isSoldOut = variations.length > 0 && variations.every(v => isVariationSoldOut(v));
      const is_available = !obj.is_archived && !itemData.is_archived && !isSoldOut;

      menuItems.push({
        name: itemData.name,
        description: itemData.description || '',
        price,
        category: 'Specials', // kept for backwards compat; use square_category for display
        square_category: squareCategory,
        image_url,
        is_available,
        is_featured: false,
        tags: [],
        square_item_id: obj.id,
        modifiers: modifiers.length > 0 ? modifiers : undefined,
      });
    }

    // 4. Upsert into MenuItem entity
    const existing = await base44.asServiceRole.entities.MenuItem.list();
    const existingBySquareId = {};
    for (const e of existing) {
      if (e.square_item_id) existingBySquareId[e.square_item_id] = e;
    }

    const toCreate = [];
    const toUpdate = [];

    for (const item of menuItems) {
      const existingItem = existingBySquareId[item.square_item_id];
      let image_url_opt = existingItem?.image_url_opt || null;
      if (!existingItem || existingItem.image_url !== item.image_url) {
        image_url_opt = null;
        if (item.image_url) {
          try {
            image_url_opt = await optimizeItemImage(
              base44,
              item.image_url,
              `menu-item-${item.square_item_id || item.name}`,
            );
          } catch (error) {
            console.error(`Square catalog image optimization failed for ${item.name}:`, error.message);
          }
        }
      }
      const itemWithOptimizedImage = { ...item, image_url_opt };
      if (existingItem) {
        toUpdate.push({
          id: existingItem.id,
          ...itemWithOptimizedImage,
          is_hidden: existingItem.is_hidden ?? false,
          is_featured: existingItem.is_featured ?? false,
        });
      } else {
        toCreate.push(itemWithOptimizedImage);
      }
    }

    if (toUpdate.length > 0) await base44.asServiceRole.entities.MenuItem.bulkUpdate(toUpdate);
    if (toCreate.length > 0) await base44.asServiceRole.entities.MenuItem.bulkCreate(toCreate);

    const created = toCreate.length;
    const updated = toUpdate.length;

    console.log(`Sync complete: ${created} created, ${updated} updated. Categories: ${[...new Set(menuItems.map(i => i.square_category).filter(Boolean))].join(', ')}`);
    return Response.json({ success: true, total: menuItems.length, created, updated });

  } catch (error) {
    console.error('Sync error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});