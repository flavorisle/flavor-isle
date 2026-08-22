import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Milkshake order helper for Smashie.
//
// When a caller wants a shake, Smashie sends the customer's free-text request
// here. We pull the live shake menu item(s) from Square (via the MenuItem
// entity), extract the real FLAVOR CHOICE options, sizes, and any mix-in
// groups, and try to match the caller's words to a specific flavor using
// common synonyms. Smashie uses the result to quickly confirm the shake and
// add it as a line item.

// Common synonyms → canonical flavor name (matches the curated list in
// src/lib/shakeConfig.js). Keys are matched as substrings of the lowercased
// request, longest-first so multi-word keys win over short ones.
const FLAVOR_SYNONYMS = [
  ['cookies and cream', 'Cookies and Cream'],
  ['cookies and creme', 'Cookies and Cream'],
  ['oreo', 'Cookies and Cream'],
  ['hot fudge', 'Hot Fudge'],
  ['fudge', 'Hot Fudge'],
  ['orange creamsicle', 'Orange Creamsicle'],
  ['creamsicle', 'Orange Creamsicle'],
  ['peanut butter', 'Peanut Butter'],
  ['real fruit strawberry', 'Real Fruit Strawberry'],
  ['real fruit blueberry', 'Real Fruit Blueberry'],
  ['real fruit raspberry', 'Real Fruit Raspberry'],
  ['real fruit peach', 'Real Fruit Peach'],
  ['real fruit cherry', 'Real Fruit Cherry'],
  ['real fruit banana', 'Real Fruit Banana'],
  ['crushed pineapple', 'Crushed Pineapple'],
  ['butterscotch', 'Butterscotch'],
  ['caramel', 'Caramel'],
  ['strawberry', 'Strawberry'],
  ['straw', 'Strawberry'],
  ['chocolate', 'Chocolate'],
  ['choc', 'Chocolate'],
  ['vanilla', 'Vanilla'],
  ['cherry', 'Cherry'],
  ['banana', 'Real Fruit Banana'],
  ['pineapple', 'Crushed Pineapple'],
  ['blueberry', 'Real Fruit Blueberry'],
  ['raspberry', 'Real Fruit Raspberry'],
  ['peach', 'Real Fruit Peach'],
];

const norm = (s) => (s || '').toString().toLowerCase();

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const request = norm(body?.request || '');

    const items = await base44.asServiceRole.entities.MenuItem.filter(
      { is_available: true },
      '-created_date',
      300
    );

    const visibleItems = items.filter((it) => it.is_hidden !== true);
    const shakes = visibleItems.filter(
      (it) => it.category === 'Shakes' || /milkshake|shake|malt/i.test(it.name || ''),
    );
    const blisses = visibleItems
      .filter((it) => /bliss/i.test(it.name || '') || /blend\s*&\s*bliss/i.test(it.square_category || ''))
      .map((it) => ({
        id: it.id,
        name: it.name,
        price: Number(it.price) || 0,
        sizes: (it.modifiers || [])
          .find((group) => /size/i.test(group.name || ''))
          ?.modifiers?.filter((option) => !option.sold_out)
          .map((option) => ({ id: option.id, name: option.name, price: Number(option.price) || 0 })) || [],
      }));
    const milkshakes = visibleItems
      .filter((it) => /milkshake/i.test(it.name || '') && !/bliss/i.test(it.name || ''))
      .map((it) => ({
        id: it.id,
        name: it.name,
        price: Number(it.price) || 0,
        sizes: (it.modifiers || [])
          .find((group) => /size/i.test(group.name || ''))
          ?.modifiers?.filter((option) => !option.sold_out)
          .map((option) => ({ id: option.id, name: option.name, price: Number(option.price) || 0 })) || [],
      }));

    // Prefer the generic customizable Milkshake item. Individual flavor items
    // also expose add-on flavor groups, but their prices already include a flavor.
    const mainShake =
      shakes.find(
        (s) =>
          /^milkshake$/i.test((s.name || '').trim()) &&
          (s.modifiers || []).some((g) => /^flavor choice$/i.test((g.name || '').trim())),
      ) ||
      shakes.find((s) => (s.modifiers || []).some((g) => /^flavor choice$/i.test((g.name || '').trim()))) ||
      shakes[0] ||
      null;

    let flavors = [];
    let sizes = [];
    let mixIns = [];

    if (mainShake && Array.isArray(mainShake.modifiers)) {
      for (const g of mainShake.modifiers) {
        const gname = norm(g.name || '');
        const opts = (g.modifiers || [])
          .filter((m) => !m.sold_out)
          .map((m) => ({ id: m.id, name: m.name, price: m.price || 0 }));
        if (/flavor/i.test(gname)) flavors = opts;
        else if (/size/i.test(gname)) sizes = opts;
        else mixIns.push({ group: g.name, options: opts });
      }
    }

    // Match the spoken request to a flavor via synonyms (longest key first).
    let matchedFlavor = null;
    for (const [key, label] of FLAVOR_SYNONYMS) {
      if (request.includes(key)) {
        matchedFlavor = flavors.find((f) => norm(f.name) === norm(label)) || null;
        if (matchedFlavor) break;
      }
    }

    return Response.json({
      success: true,
      shake_item: mainShake
        ? { id: mainShake.id, name: mainShake.name, price: mainShake.price }
        : null,
      flavors,
      sizes,
      milkshakes,
      blisses,
      mix_ins: mixIns,
      matched_flavor: matchedFlavor,
      included_flavor_count: 1,
      pricing: {
        base_price: mainShake?.price || 0,
        rule: 'The base milkshake price includes exactly one flavor. Do not add the selected first flavor price to the line item. Charge only the base price, any size upcharge, paid mix-ins, and additional flavors beyond the first.',
      },
      note:
        'When the caller asks what milkshakes are available, list only the items returned in milkshakes and blisses, including every live Bliss. Confirm the selected item and size from its live record. Use each item’s own returned price and size options; never infer an unlisted item or option.',
      line_item_template: {
        name: '<Flavor> Milkshake',
        price: mainShake?.price || 0,
        quantity: 1,
        selected_modifiers: ['Flavor Choice: <one included flavor>', 'Size: <size>'],
        notes: 'One flavor included in base price',
      },
    });
  } catch (error) {
    console.error('milkshakeOrderHelper error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});