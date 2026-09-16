// In-store printable menu builder: pulls the live menu, lets staff edit the
// printed copy (titles, prices, which items appear, layout, item order, custom
// items, size pricing, section consolidation), then prints it. All edits are
// stored locally in the browser so the sheet stays re-editable.
import React, { useState, useEffect, useMemo } from 'react';
import { Printer } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import AdminNav from '@/components/admin/AdminNav';
import PrintableMenu from '@/components/admin/PrintableMenu';
import PrintMenuEditor from '@/components/admin/PrintMenuEditor';
import { itemCategoryKey, categoryLabel, sortCategories, sortItemsInCategory } from '@/lib/menuCategory';

const STORAGE_KEY = 'flavorisle_print_menu_v2';

const DEFAULT_CONFIG = {
  title: 'FLAVOR ISLE',
  subtitle: 'Hand-Patted Burgers & Shakes · Since 1964',
  footer: '103 N Main St, Smiths Grove, KY 42171 · (270) 563-4618\nOrder online at flavor-isle.com',
  accountTitle: 'Create a Free Account & Earn Rewards',
  accountInfo: 'Sign up at flavor-isle.com to earn Star Rewards points on every order, save your favorites, skip the line with online ordering, and get a text the moment your food is ready.',
  columns: 4,
  showDescriptions: true,
  showLogo: true,
};

export default function AdminPrintMenu() {
  const [items, setItems] = useState([]);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [hiddenIds, setHiddenIds] = useState([]);
  const [overrides, setOverrides] = useState({});
  const [sectionTitles, setSectionTitles] = useState({});
  const [sectionOrder, setSectionOrder] = useState([]);
  // Print-only item order within a section, keyed by category key.
  const [itemOrder, setItemOrder] = useState({});
  // Print-only custom items not in the live menu.
  const [customItems, setCustomItems] = useState([]);
  // Per-section consolidation: { [key]: { price, flavors, extraCost } }
  // Presence of key = consolidated (one price + flavor list instead of items).
  const [consolidatedSections, setConsolidatedSections] = useState({});

  useEffect(() => {
    (async () => {
      const [menuItems, menuSettings] = await Promise.all([
        base44.entities.MenuItem.list(),
        base44.entities.MenuSetting.list(),
      ]);
      setItems(menuItems || []);
      setSettings((menuSettings || [])[0] || {});
      setLoading(false);
    })();

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      setConfig({ ...DEFAULT_CONFIG, ...(parsed.config || {}) });
      setHiddenIds(parsed.hiddenIds || []);
      setOverrides(parsed.overrides || {});
      setSectionTitles(parsed.sectionTitles || {});
      setSectionOrder(parsed.sectionOrder || []);
      setItemOrder(parsed.itemOrder || {});
      setCustomItems(parsed.customItems || []);
      setConsolidatedSections(parsed.consolidatedSections || {});
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      config, hiddenIds, overrides, sectionTitles, sectionOrder, itemOrder, customItems, consolidatedSections,
    }));
  }, [config, hiddenIds, overrides, sectionTitles, sectionOrder, itemOrder, customItems, consolidatedSections, loading]);

  const setSectionTitle = (key, value) =>
    setSectionTitles(prev => ({ ...prev, [key]: value }));

  const toggleItem = id =>
    setHiddenIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));

  const setOverride = (id, field, value) =>
    setOverrides(prev => {
      if (value === undefined) {
        const next = { ...(prev[id] || {}) };
        delete next[field];
        return { ...prev, [id]: next };
      }
      return { ...prev, [id]: { ...(prev[id] || {}), [field]: value } };
    });

  const moveSection = (key, dir) => {
    const current = sectionOrder.length ? sectionOrder : sections.map(s => s.key);
    const from = current.indexOf(key);
    const to = from + dir;
    if (from === -1 || to < 0 || to >= current.length) return;
    const next = [...current];
    [next[from], next[to]] = [next[to], next[from]];
    setSectionOrder(next);
  };

  const moveItem = (categoryKey, itemId, dir) => {
    setItemOrder(prev => {
      const section = sections.find(s => s.key === categoryKey);
      if (!section) return prev;
      const current = prev[categoryKey]?.length
        ? [...prev[categoryKey]]
        : section.allItems.map(i => i.id);
      const from = current.indexOf(itemId);
      const to = from + dir;
      if (from === -1 || to < 0 || to >= current.length) return prev;
      const next = [...current];
      [next[from], next[to]] = [next[to], next[from]];
      return { ...prev, [categoryKey]: next };
    });
  };

  const addCustomItem = (categoryKey) => {
    const id = `custom-${Date.now()}`;
    setCustomItems(prev => [...prev, { id, category: categoryKey, name: 'New Item', price: 0, description: '', sizes: [] }]);
  };

  const removeCustomItem = (id) => {
    setCustomItems(prev => prev.filter(ci => ci.id !== id));
  };

  const updateCustomItem = (id, field, value) => {
    setCustomItems(prev => prev.map(ci => (ci.id === id ? { ...ci, [field]: value } : ci)));
  };

  const toggleConsolidate = (categoryKey) => {
    setConsolidatedSections(prev => {
      if (prev[categoryKey]) {
        const { [categoryKey]: _, ...rest } = prev;
        return rest;
      }
      const section = sections.find(s => s.key === categoryKey);
      const flavors = section?.allItems.map(i => i.name).join(', ') || '';
      const firstPrice = section?.allItems[0]?.price || 0;
      return { ...prev, [categoryKey]: { price: firstPrice, flavors, extraCost: 0 } };
    });
  };

  const updateConsolidated = (categoryKey, field, value) => {
    setConsolidatedSections(prev => ({
      ...prev,
      [categoryKey]: { ...prev[categoryKey], [field]: value },
    }));
  };

  const resetAll = () => {
    setConfig(DEFAULT_CONFIG);
    setHiddenIds([]);
    setOverrides({});
    setSectionTitles({});
    setSectionOrder([]);
    setItemOrder({});
    setCustomItems([]);
    setConsolidatedSections({});
  };

  const sections = useMemo(() => {
    if (!settings) return [];
    const renames = settings.category_renames || {};
    const hiddenCats = settings.hidden_categories || [];
    const visible = items.filter(i => !i.is_hidden);

    const grouped = {};
    for (const item of visible) {
      const key = itemCategoryKey(item);
      if (hiddenCats.includes(key)) continue;
      (grouped[key] ||= []).push(item);
    }

    // Merge print-only custom items into their sections
    for (const ci of customItems) {
      (grouped[ci.category] ||= []).push({ ...ci, is_custom: true, print_sizes: ci.sizes });
    }

    const baseKeys = sortCategories(Object.keys(grouped), settings.category_sort_order || []);
    const orderedKeys = sectionOrder.length
      ? [...baseKeys].sort((a, b) => {
          const ia = sectionOrder.indexOf(a);
          const ib = sectionOrder.indexOf(b);
          return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
        })
      : baseKeys;

    return orderedKeys.map(key => {
      let ordered = sortItemsInCategory(grouped[key], (settings.category_item_order || {})[key] || []);

      // Apply print-only item order when set
      const printOrder = itemOrder[key];
      if (printOrder && printOrder.length) {
        ordered = [...ordered].sort((a, b) => {
          const ia = printOrder.indexOf(a.id);
          const ib = printOrder.indexOf(b.id);
          return (ia === -1 ? Infinity : ia) - (ib === -1 ? Infinity : ib);
        });
      }

      const applied = ordered.map(i => {
        if (i.is_custom) return i;
        const ov = overrides[i.id] || {};
        return {
          ...i,
          name: ov.name ?? i.name,
          description: ov.description ?? i.description,
          price: ov.price !== undefined ? Number(ov.price) : i.price,
          print_sizes: ov.sizes,
        };
      });

      return {
        key,
        label: sectionTitles[key] ?? categoryLabel(key, renames),
        allItems: applied,
        items: applied.filter(i => !hiddenIds.includes(i.id)),
      };
    });
  }, [items, settings, overrides, hiddenIds, sectionTitles, sectionOrder, itemOrder, customItems]);

  const printSections = sections.filter(s => s.items.length > 0 || consolidatedSections[s.key]);

  if (loading) {
    return (
      <div className="min-h-screen bg-vanilla-malt">
        <AdminNav />
        <p className="text-center py-20 text-muted-foreground">Loading menu…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-vanilla-malt">
      <div className="print:hidden">
        <AdminNav />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6 print:hidden">
          <div>
            <h1 className="font-heading text-3xl text-obsidian-roast">In-Store Printable Menu</h1>
            <p className="text-sm text-muted-foreground">
              Edit the printed copy on the left or click any item text on the sheet to edit it in place, then print or save as PDF. Your online menu stays unchanged.
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="btn-cherry chrome-hover px-6 py-3 text-sm flex items-center gap-2"
          >
            <Printer size={16} /> Print Menu
          </button>
        </div>

        <div className="grid lg:grid-cols-[22rem_1fr] gap-8 items-start">
          <div className="print:hidden">
            <PrintMenuEditor
              config={config}
              setConfig={setConfig}
              sections={sections}
              hiddenIds={hiddenIds}
              toggleItem={toggleItem}
              overrides={overrides}
              setOverride={setOverride}
              setSectionTitle={setSectionTitle}
              moveSection={moveSection}
              moveItem={moveItem}
              addCustomItem={addCustomItem}
              removeCustomItem={removeCustomItem}
              updateCustomItem={updateCustomItem}
              consolidatedSections={consolidatedSections}
              toggleConsolidate={toggleConsolidate}
              updateConsolidated={updateConsolidated}
              resetAll={resetAll}
            />
          </div>

          <div id="print-area">
            <PrintableMenu
              sections={printSections}
              config={config}
              onEditItem={setOverride}
              onEditSection={setSectionTitle}
              consolidatedSections={consolidatedSections}
            />
          </div>
        </div>
      </div>
    </div>
  );
}