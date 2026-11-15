import React, { useEffect, useMemo, useState } from 'react';
import { Package } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useCart } from '@/context/CartContext';
import { applyModifierOverrides } from '@/lib/modifierOverrides';
import ComboTypeTabs from '@/components/combo/ComboTypeTabs';
import ComboStepColumn from '@/components/combo/ComboStepColumn';
import ComboSummaryBar from '@/components/combo/ComboSummaryBar';
import ComboModifierModal from '@/components/combo/ComboModifierModal';
import {
  DEFAULT_COMBO_SETTING,
  boxCharge,
  boxTotal,
  boxLabel,
  loadComboSetting,
  itemsForRole,
  shakesForSubstitution,
  requiredQuantity,
  allocateBoxUnitCharges,
  nextBoxNumber,
  round2,
  comboTypes,
  typeCategories,
  typeById,
} from '@/lib/comboIsle';

// Combo Isle is a picker, not a catalogue of prebuilt combos (Wesley, Nov 15 2026).
// The customer picks a named combo type (Burgers, Chicken, Sandwiches), then one
// main, one side and one drink from the live Square menu, and the three real items
// go into the cart as themselves — so the kitchen ticket, the Square order and the
// price verification all see ordinary catalog items. The total is Square's three
// prices added. There is no discount anywhere here.

export default function ComboBuilderSection() {
  const [menuItems, setMenuItems] = useState([]);
  const [setting, setSetting] = useState(DEFAULT_COMBO_SETTING);
  const [loading, setLoading] = useState(true);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [picks, setPicks] = useState({ main: null, side: null, drink: null, shake: null });
  const [shakeInstead, setShakeInstead] = useState(false);
  const [search, setSearch] = useState({ main: '', side: '', drink: '' });
  const [added, setAdded] = useState(false);
  const [modifierModal, setModifierModal] = useState(null);
  const { addItem, cartItems, setIsCartOpen, menuSetting } = useCart();
  const overrides = menuSetting?.modifier_overrides;

  useEffect(() => {
    let alive = true;
    Promise.all([
      base44.entities.MenuItem.filter({ is_available: true, is_hidden: false }, '-name', 500),
      loadComboSetting(),
    ])
      .then(([rows, saved]) => {
        if (!alive) return;
        // Only catalog-backed items: the server reprices every line from Square.
        setMenuItems((rows || []).filter((i) => i.square_item_id));
        const loaded = saved || DEFAULT_COMBO_SETTING;
        setSetting(loaded);
        setSelectedTypeId(comboTypes(loaded)[0]?.id || '');
      })
      .catch(() => { if (alive) setMenuItems([]); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const types = useMemo(() => comboTypes(setting), [setting]);
  const type = typeById(types, selectedTypeId);

  // A type's own categories win; the empty ones inherit the shared lists.
  const typeSetting = useMemo(() => {
    if (!type) return setting;
    return {
      ...setting,
      main_categories: typeCategories(setting, type, 'main'),
      side_categories: typeCategories(setting, type, 'side'),
      drink_categories: typeCategories(setting, type, 'drink'),
      shake_categories: (type.shake_categories || []).length
        ? type.shake_categories
        : (setting.shake_categories || []),
    };
  }, [setting, type]);

  const mains = useMemo(() => itemsForRole(menuItems, typeSetting, 'main'), [menuItems, typeSetting]);
  const sides = useMemo(() => itemsForRole(menuItems, typeSetting, 'side'), [menuItems, typeSetting]);
  const shakes = useMemo(() => shakesForSubstitution(menuItems, typeSetting), [menuItems, typeSetting]);

  // The drink step lists drinks. A large milkshake stands in for the drink through
  // the "or a large milkshake" switch, so it is not listed twice.
  const drinks = useMemo(() => {
    const shakeIds = new Set(shakes.map((i) => i.id));
    return itemsForRole(menuItems, typeSetting, 'drink').filter((i) => !shakeIds.has(i.id));
  }, [menuItems, typeSetting, shakes]);

  const drinkChoices = shakeInstead ? shakes : drinks;
  const drinkPick = shakeInstead ? picks.shake : picks.drink;
  const components = [picks.main, picks.side, drinkPick].filter(Boolean);
  const total = boxTotal(components);
  const price = boxCharge(total);
  const allPicked = Boolean(picks.main && picks.side && drinkPick);

  const quantityOf = (item) => requiredQuantity(typeSetting, item);

  const selectType = (id) => {
    setSelectedTypeId(id);
    setPicks({ main: null, side: null, drink: null, shake: null });
    setSearch({ main: '', side: '', drink: '' });
    setShakeInstead(false);
  };

  const handleSelectItem = (item, slot) => {
    const quantity = quantityOf(item);
    if (applyModifierOverrides(item.modifiers, overrides).length > 0) {
      setModifierModal({ item, slot, quantity });
    } else {
      setPicks((p) => ({ ...p, [slot]: { ...item, quantity, selectedModifiers: [] } }));
    }
  };

  const handleModifierConfirm = (selectedMods, extraCost) => {
    const { item, slot, quantity } = modifierModal;
    setPicks((p) => ({
      ...p,
      [slot]: { ...item, quantity, price: round2((item.price || 0) + extraCost), selectedModifiers: selectedMods },
    }));
    setModifierModal(null);
  };

  // One box goes in as its real Square items, in a numbered group. The lines carry
  // the box's charged price between them — so nothing on the page, in the cart, or
  // on the ticket ever reads as a discount — and each keeps its full Square price
  // so a broken box can go back to being singles at that price.
  const handleAddCombo = () => {
    if (!allPicked) return;
    const chosen = [picks.main, picks.side, drinkPick];
    const roles = ['main', 'side', 'drink'];
    const units = allocateBoxUnitCharges(chosen);
    const comboGroup = `box-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const boxNumber = nextBoxNumber(cartItems);
    const typeName = type?.name || 'Combo Isle';
    // Ticket prefix: "Box 1 — Burgers" only when the admin turned the combo name
    // on; otherwise exactly "Box 1", as approved. The numbering never changes.
    const prefix = setting.show_combo_name_on_ticket === true
      ? `${boxLabel(boxNumber)} — ${typeName}`
      : boxLabel(boxNumber);
    const description = `${typeName} combo — ${chosen.map((p) => p.name).join(' + ')}`;
    chosen.forEach((pick, i) => {
      addItem({
        ...pick,
        productId: pick.id,
        selectedModifiers: pick.selectedModifiers || [],
        price: units[i],
        comboFullPrice: round2(pick.price || 0),
        initialQuantity: pick.quantity || 1,
        comboGroup,
        comboRole: roles[i],
        comboBox: boxNumber,
        comboTypeName: typeName,
        comboDescription: description,
        alwaysUnique: true,
        bundleName: prefix,
      });
    });
    setAdded(true);
    setIsCartOpen(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const canBuild = mains.length > 0 && sides.length > 0 && (drinks.length > 0 || shakes.length > 0);

  return (
    <>
      {modifierModal && (
        <ComboModifierModal
          item={modifierModal.item}
          overrides={overrides}
          onClose={() => setModifierModal(null)}
          onConfirm={handleModifierConfirm}
        />
      )}

      <section id="combo-builder" className="py-16 px-4 sm:px-6 bg-obsidian-roast">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-smashie-yellow text-obsidian-roast px-4 py-1.5 rounded-full text-xs font-heading uppercase tracking-widest mb-3">
              <Package size={12} /> Build It Now
            </div>
            <h2 className="font-heading text-4xl text-white mb-2">Build Your Combo</h2>
            <p className="text-gray-400 text-sm">Pick a main, a side, and a drink.</p>
          </div>

          {!canBuild ? (
            <div className="bg-white rounded-3xl p-8 text-center">
              <p className="font-heading text-lg text-obsidian-roast mb-2">The combo builder is off right now</p>
              <p className="text-muted-foreground text-sm">
                {loading
                  ? 'Loading the menu…'
                  : 'One of the three steps has nothing available, so there is no combo to build. Everything is still on the menu.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-3xl p-6 md:p-8">
              <ComboTypeTabs types={types} activeId={type?.id} onSelect={selectType} />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ComboStepColumn
                  step={1}
                  label={`${type?.name || 'Combo Isle'} Main`}
                  hint="Pick the main"
                  items={mains}
                  selected={picks.main}
                  onSelect={(item) => handleSelectItem(item, 'main')}
                  quantityOf={quantityOf}
                  search={search.main}
                  onSearch={(v) => setSearch((s) => ({ ...s, main: v }))}
                />
                <ComboStepColumn
                  step={2}
                  label="Side"
                  hint="Fries, tots, rings and munchies"
                  items={sides}
                  selected={picks.side}
                  onSelect={(item) => handleSelectItem(item, 'side')}
                  quantityOf={quantityOf}
                  search={search.side}
                  onSearch={(v) => setSearch((s) => ({ ...s, side: v }))}
                />
                <ComboStepColumn
                  step={3}
                  label="Drink"
                  hint={shakeInstead ? 'A large milkshake, same box' : 'Sodas, teas and floats — or a large milkshake'}
                  items={drinkChoices}
                  selected={drinkPick}
                  onSelect={(item) => handleSelectItem(item, shakeInstead ? 'shake' : 'drink')}
                  quantityOf={quantityOf}
                  search={search.drink}
                  onSearch={(v) => setSearch((s) => ({ ...s, drink: v }))}
                  action={shakes.length > 0 ? (
                    <button
                      onClick={() => setShakeInstead((v) => !v)}
                      className={`text-[11px] font-heading px-2 py-1 rounded-full border transition-colors ${
                        shakeInstead
                          ? 'bg-midnight-cherry text-white border-midnight-cherry'
                          : 'border-border text-muted-foreground hover:border-midnight-cherry/40'
                      }`}
                    >
                      {shakeInstead ? 'Milkshake' : 'Large milkshake'}
                    </button>
                  ) : null}
                />
              </div>

              <ComboSummaryBar
                typeName={type?.name || 'Combo Isle'}
                picks={[picks.main, picks.side, drinkPick]}
                price={price}
                onAdd={handleAddCombo}
                added={added}
                disabled={!allPicked}
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}