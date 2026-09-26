import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Deluxe order helper for Smashie.
//
// When a caller orders a burger or sandwich, Smashie sends the customer's
// free-text request here. We pull the live burger/chicken menu items (with their
// real Square modifier groups — toppings, size, doneness, etc.), score them
// against the request, and return a compact structured view plus the "Deluxe"
// preset definition. Smashie uses this to accurately build the line item and
// confirm toppings back to the customer before logging the order.

// Flavor Isle "Deluxe" requires one condiment choice, never both by default.
// Web orders default to mayo (the web preset's condiment); on the phone Smashie
// asks the caller which one they want.
const DELUXE_PRESET = {
  name: 'Deluxe',
  condiment_choice: ['Mustard', 'Mayo'],
  default_condiment: 'Mayo',
  toppings: ['Pickles', 'Onions', 'Tomatoes', 'Lettuce'],
};

// Menu sections that carry burgers and sandwiches. Square's section names are
// what the live menu actually groups by (an admin regroup via display_category
// overrides them), so the old category labels ('Burgers'/'Chicken') matched
// nothing — every MenuItem's category field reads 'Specials', which is why this
// helper came back with zero burgers.
const BURGER_SECTIONS = [
  'Old-Fashioned Burgers',
  'Handheld Classics',
  'Seasonal & Supreme',
  'Crisp & Cluck',
  'Golden Crisp & Savory',
  'Grill',
];

const BURGER_NAME_RE = /burger|cheeseburger|sandwich|b\.l\.t/i;

const itemSection = (it) => it.display_category || it.square_category || it.category || '';

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

    const candidates = items.filter(
      (it) => !it.is_hidden
        && (BURGER_SECTIONS.includes(itemSection(it)) || BURGER_NAME_RE.test(it.name || ''))
    );

    // Score each candidate by keyword overlap with the spoken request.
    const scored = candidates
      .map((it) => {
        const name = norm(it.name);
        const tokens = name.split(/[\s\-]+/).filter((t) => t.length > 2);
        let score = 0;
        if (request.includes(name)) score += 5;
        for (const t of tokens) {
          if (request.includes(t)) score += 2;
        }
        return { item: it, score };
      })
      .sort((a, b) => b.score - a.score);

    // If nothing scored, surface the whole list so Smashie can still read options.
    const top = (scored.some((s) => s.score > 0) ? scored.filter((s) => s.score > 0) : scored).slice(0, 6).map((s) => s.item);

    const view = top.map((it) => ({
      id: it.id,
      name: it.name,
      price: it.price,
      category: it.category,
      description: it.description || '',
      modifiers: (it.modifiers || []).map((g) => ({
        group: g.name,
        selection_type: g.selection_type,
        options: (g.modifiers || [])
          .filter((m) => !m.sold_out)
          .map((m) => ({ id: m.id, name: m.name, price: m.price || 0 })),
      })),
    }));

    return Response.json({
      success: true,
      deluxe_preset: DELUXE_PRESET,
      note:
        '"Deluxe" (or "all the way") means Pickles, Onions, Tomatoes, and Lettuce, plus exactly ONE condiment: Mustard OR Mayo. Ask the customer which condiment they want; never add both unless they explicitly request both. "No X" removes a single topping. Only offer modifiers returned for the matched live item, then read the order back before logging it.',
      matched_items: view,
      line_item_template: {
        name: '<item name>',
        price: 0,
        quantity: 1,
        selected_modifiers: ['<group>: <option name>'],
        notes: '<customer special instructions>',
      },
    });
  } catch (error) {
    console.error('deluxeOrderHelper error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});