import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const SQUARE_VERSION = '2024-01-18';
const CATEGORY_MAP = {
  'burgers': 'Burgers',
  'burger': 'Burgers',
  'chicken': 'Chicken',
  'sides': 'Sides',
  'side': 'Sides',
  'shakes': 'Shakes',
  'shake': 'Shakes',
  'milkshake': 'Shakes',
  'drinks': 'Drinks',
  'drink': 'Drinks',
  'beverages': 'Drinks',
  'beverage': 'Drinks',
  'breakfast': 'Breakfast',
  'specials': 'Specials',
  'special': 'Specials',
};
const VALID_CATEGORIES = ['Burgers', 'Chicken', 'Sides', 'Shakes', 'Drinks', 'Breakfast', 'Specials'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('square');

    // 1. Fetch all catalog objects (items, images, categories, modifier lists)
    const catalogRes = await fetch(
      'https://connect.squareup.com/v2/catalog/list?types=ITEM,IMAGE,CATEGORY,MODIFIER_LIST',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Square-Version': SQUARE_VERSION,
        },
      }
    );
    const catalogData = await catalogRes.json();
    if (!catalogRes.ok) {
      console.error('Square catalog error:', JSON.stringify(catalogData));
      return Response.json({ error: 'Failed to fetch Square catalog', details: catalogData }, { status: 500 });
    }

    const objects = catalogData.objects || [];

    // Build lookup maps
    const imageMap = {};
    const categoryMap = {};
    const modifierListMap = {};

    for (const obj of objects) {
      if (obj.type === 'IMAGE') {
        imageMap[obj.id] = obj.image_data?.url || null;
      }
      if (obj.type === 'CATEGORY') {
        categoryMap[obj.id] = obj.category_data?.name || '';
      }
      if (obj.type === 'MODIFIER_LIST') {
        modifierListMap[obj.id] = {
          name: obj.modifier_list_data?.name || '',
          selection_type: obj.modifier_list_data?.selection_type || 'SINGLE',
          modifiers: (obj.modifier_list_data?.modifiers || []).map(m => ({
            id: m.id,
            name: m.modifier_data?.name || '',
            price: m.modifier_data?.price_money
              ? m.modifier_data.price_money.amount / 100
              : 0,
          })),
        };
      }
    }

    // 2. Parse ITEM objects into menu items
    const menuItems = [];
    for (const obj of objects) {
      if (obj.type !== 'ITEM') continue;
      const itemData = obj.item_data || {};
      if (!itemData.name) continue;

      // Resolve category
      const squareCatName = itemData.category_id
        ? (categoryMap[itemData.category_id] || '').toLowerCase()
        : '';
      const mappedCategory = CATEGORY_MAP[squareCatName] || 'Specials';

      // Resolve image — use first image from item or variation
      let image_url = null;
      if (itemData.image_ids && itemData.image_ids.length > 0) {
        image_url = imageMap[itemData.image_ids[0]] || null;
      }

      // Resolve modifiers
      const modifiers = [];
      if (itemData.modifier_list_info) {
        for (const mli of itemData.modifier_list_info) {
          if (mli.modifier_list_id && modifierListMap[mli.modifier_list_id]) {
            modifiers.push(modifierListMap[mli.modifier_list_id]);
          }
        }
      }

      // Use first variation price as base price
      const variations = itemData.variations || [];
      const baseVariation = variations[0];
      const priceAmount = baseVariation?.item_variation_data?.price_money?.amount;
      const price = priceAmount != null ? priceAmount / 100 : 0;

      menuItems.push({
        name: itemData.name,
        description: itemData.description || '',
        price,
        category: mappedCategory,
        image_url,
        is_available: !itemData.is_archived,
        is_featured: false,
        tags: itemData.label_color ? [itemData.label_color] : [],
        square_item_id: obj.id,
        modifiers: modifiers.length > 0 ? modifiers : undefined,
      });
    }

    // 3. Sync into MenuItem entity — upsert by square_item_id
    const existing = await base44.asServiceRole.entities.MenuItem.list();
    const existingBySquareId = {};
    for (const e of existing) {
      if (e.square_item_id) existingBySquareId[e.square_item_id] = e;
    }

    let created = 0;
    let updated = 0;

    for (const item of menuItems) {
      const existingItem = existingBySquareId[item.square_item_id];
      if (existingItem) {
        await base44.asServiceRole.entities.MenuItem.update(existingItem.id, item);
        updated++;
      } else {
        await base44.asServiceRole.entities.MenuItem.create(item);
        created++;
      }
    }

    console.log(`Square sync complete: ${created} created, ${updated} updated, ${menuItems.length} total`);
    return Response.json({
      success: true,
      total: menuItems.length,
      created,
      updated,
    });
  } catch (error) {
    console.error('Sync error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});