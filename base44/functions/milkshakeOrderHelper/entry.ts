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

    const shakes = items.filter(
      (it) =>
        (it.category === 'Shakes' || /milkshake|shake|malt/i.test(it.name || '')) &&
        !it.is_hidden
    );

    // Prefer the item that carries a FLAVOR CHOICE modifier (the customizable one).
    const mainShake =
      shakes.find((s) => (s.modifiers || []).some((g) => /flavor/i.test(g.name || ''))) ||
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
      mix_ins: mixIns,
      matched_flavor: matchedFlavor,
      note:
        'Use this to build the customer shake. Pick a flavor from `flavors` (matched_flavor is a best guess — confirm it with the caller), a size from `sizes` if present, and any mix-ins. Then include the shake as a line item when logging the order with logPhoneOrder.',
      line_item_template: {
        name: '<Flavor> Milkshake',
        price: 0,
        quantity: 1,
        selected_modifiers: ['Flavor Choice: <flavor>', 'Size: <size>'],
        notes: '',
      },
    });
  } catch (error) {
    console.error('milkshakeOrderHelper error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});