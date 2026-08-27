// Shared kitchen/POS ticket formatting for order line items.
//
// When a customer used a Deluxe preset, the preset's toppings are summarized
// on the ticket by the preset label (e.g. "Deluxe" or "Deluxe, no Tomato")
// instead of listing every topping by name — which is what the kitchen wants
// to see. Any modifiers the customer added beyond the preset are still listed
// individually so extras (Bacon, extra sauce, a Size choice) are not lost.
//
// Used by createSquareOrder (Square POS line item name) and printKitchenOrder
// (kitchen SMS ticket) so both surfaces stay in sync.

const norm = (s: string): string => (s || '').toString().toLowerCase();
const stem = (s: string): string => norm(s).replace(/(es|s)$/, '');

// Returns the ordered list of modifier strings to print for one line item.
export function formatItemModifiers(item: any): string[] {
  const mods: any[] = Array.isArray(item?.selectedModifiers) ? item.selectedModifiers : [];
  const label: string | undefined = item?.deluxeLabel;
  if (!label) {
    return mods.map((m: any) => m?.name).filter(Boolean);
  }
  // Deluxe preset active — summarize its toppings with the label, then append
  // any extras the customer added on top. `deluxeToppings` carries the full
  // preset topping list (including silent ones like Mayo) so every preset
  // selection is folded into the label and never double-printed as an extra.
  const tracked: string[] = Array.isArray(item?.deluxeToppings) ? item.deluxeToppings.map(stem) : [];
  const extras = mods
    .filter((m: any) => {
      const name = m?.name;
      if (!name) return false;
      return !tracked.some((t) => {
        const ms = stem(name);
        return ms === t || ms.includes(t) || t.includes(ms);
      });
    })
    .map((m: any) => m.name);
  return [label, ...extras];
}