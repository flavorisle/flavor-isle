import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, RefreshCw, ChevronDown, ChevronUp, Tag, Plus, Trash2, Star, Package, SlidersHorizontal, Gift, Sparkles } from 'lucide-react';
import { getMenuSetting, setCategoryItemOrder } from '@/lib/menuSettings';
import { itemCategoryKey, categoryLabel, sortCategories, sortItemsInCategory } from '@/lib/menuCategory';
import AdminCategoriesManager from '@/components/admin/AdminCategoriesManager';
import AdminPromosManager from '@/components/admin/AdminPromosManager';
import AdminDeluxeManager from '@/components/admin/AdminDeluxeManager';
import { base44 } from '@/api/base44Client';
import BrandSelect, { BrandOption } from '@/components/BrandSelect';

import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';
import AdminNav from '@/components/admin/AdminNav';

const DAYS = ['Daily', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export default function AdminMenu() {
  const [tab, setTab] = useState('menu');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [search, setSearch] = useState('');

  // Specials state
  const [specials, setSpecials] = useState([]);
  const [specialForm, setSpecialForm] = useState({ title: '', description: '', menu_item_id: '', day_of_week: 'Daily', is_active: true });
  const [savingSpecial, setSavingSpecial] = useState(false);

  // Category renames + per-category item ordering + admin category order (Menu Items tab)
  const [renames, setRenames] = useState({});
  const [itemOrder, setItemOrder] = useState({});
  const [catSort, setCatSort] = useState([]);

  // Combo state
  const [combos, setCombos] = useState([]);
  const [comboForm, setComboForm] = useState({ name: '', description: '', main_category: '', side_category: '', drink_category: '', discount_percent: 12, is_active: true });
  const [savingCombo, setSavingCombo] = useState(false);

  useEffect(() => {
    loadItems();
    loadSpecials();
    loadCombos();
    loadMenuSetting();
  }, []);

  const loadMenuSetting = async () => {
    try {
      const setting = await getMenuSetting();
      setRenames(setting.category_renames || {});
      setItemOrder(setting.category_item_order || {});
      setCatSort(setting.category_sort_order || []);
    } catch (e) {/* ignore */}
  };

  const loadItems = async () => {
    setLoading(true);
    const data = await base44.entities.MenuItem.list();
    setItems(data || []);
    setLoading(false);
  };

  const loadSpecials = async () => {
    const data = await base44.entities.DailySpecial.list();
    setSpecials(data || []);
  };

  const loadCombos = async () => {
    const data = await base44.entities.ComboConfig.list();
    setCombos(data || []);
  };

  const saveSpecial = async () => {
    const item = items.find((i) => i.id === specialForm.menu_item_id);
    if (!item || !specialForm.title) return;
    setSavingSpecial(true);
    await base44.entities.DailySpecial.create({
      ...specialForm,
      menu_item_name: item.name,
      menu_item_price: item.price,
      menu_item_image: item.image_url || ''
    });
    setSpecialForm({ title: '', description: '', menu_item_id: '', day_of_week: 'Daily', is_active: true });
    await loadSpecials();
    setSavingSpecial(false);
  };

  const deleteSpecial = async (id) => {
    await base44.entities.DailySpecial.delete(id);
    setSpecials((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleSpecial = async (s) => {
    await base44.entities.DailySpecial.update(s.id, { is_active: !s.is_active });
    setSpecials((prev) => prev.map((x) => x.id === s.id ? { ...x, is_active: !s.is_active } : x));
  };

  const saveCombo = async () => {
    if (!comboForm.name || !comboForm.main_category || !comboForm.side_category || !comboForm.drink_category) return;
    setSavingCombo(true);
    await base44.entities.ComboConfig.create({ ...comboForm, discount_percent: Number(comboForm.discount_percent) || 12 });
    setComboForm({ name: '', description: '', main_category: '', side_category: '', drink_category: '', discount_percent: 12, is_active: true });
    await loadCombos();
    setSavingCombo(false);
  };

  const deleteCombo = async (id) => {
    await base44.entities.ComboConfig.delete(id);
    setCombos((prev) => prev.filter((c) => c.id !== id));
  };

  const toggleCombo = async (c) => {
    await base44.entities.ComboConfig.update(c.id, { is_active: !c.is_active });
    setCombos((prev) => prev.map((x) => x.id === c.id ? { ...x, is_active: !c.is_active } : x));
  };

  // All category keys for the combo builder + per-item selector: effective
  // keys (incl. custom display_category) plus any custom categories the
  // admin created in the Categories tab (tracked via category_sort_order).
  const allCategoryKeys = sortCategories(Array.from(new Set([...items.map(itemCategoryKey), ...catSort])), catSort);

  const handleSync = async () => {
    setSyncing(true);
    try {
      await base44.functions.invoke('syncSquareCatalog', {});
      await loadItems();
    } finally {
      setSyncing(false);
    }
  };

  const toggleHide = async (item) => {
    const updated = { is_hidden: !item.is_hidden };
    await base44.entities.MenuItem.update(item.id, updated);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, ...updated } : i));
  };

  const toggleAvailable = async (item) => {
    const updated = { is_available: !item.is_available };
    await base44.entities.MenuItem.update(item.id, updated);
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, ...updated } : i));
  };

  // Move an item up/down within its current category, persisting the order.
  const moveItem = async (item, dir) => {
    const key = itemCategoryKey(item);
    const groupItems = grouped[key] || [];
    const idx = groupItems.findIndex((i) => i.id === item.id);
    if (idx < 0) return;
    const newIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= groupItems.length) return;
    const ids = groupItems.map((i) => i.id);
    [ids[idx], ids[newIdx]] = [ids[newIdx], ids[idx]];
    const next = { ...itemOrder, [key]: ids };
    setItemOrder(next);
    try {await setCategoryItemOrder(next);} catch (e) {/* ignore */}
  };

  // Set a custom category for an item (or clear it to fall back to the Square default).
  const assignCategoryToItem = async (item, key) => {
    const display_category = key || null;
    await base44.entities.MenuItem.update(item.id, { display_category });
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, display_category: display_category || undefined } : i));
  };

  const grouped = {};
  items.
  filter((i) => !search || i.name.toLowerCase().includes(search.toLowerCase())).
  forEach((item) => {
    const key = itemCategoryKey(item);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(item);
  });
  // Apply the admin-defined order within each category group.
  Object.keys(grouped).forEach((k) => {
    grouped[k] = sortItemsInCategory(grouped[k], itemOrder[k] || []);
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />
      <AdminNav />

      <div className="bg-obsidian-roast py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-sm font-heading uppercase tracking-widest mb-1 text-[hsl(var(--primary))]">ADMIN</p>
            <h1 className="font-heading text-3xl text-white">Menu Manager</h1>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 btn-mint chrome-hover px-5 py-2.5 text-sm font-heading disabled:opacity-60">
            
            <RefreshCw size={15} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Syncing…' : 'Sync from Square'}
          </button>
        </div>
        {/* Tabs */}
        <div className="max-w-5xl mx-auto flex gap-2 mt-6">
          {[{ id: 'menu', label: 'Menu Items', Icon: Tag }, { id: 'categories', label: 'Categories', Icon: SlidersHorizontal }, { id: 'specials', label: 'Daily Specials', Icon: Star }, { id: 'combos', label: 'Combo Builder', Icon: Package }, { id: 'deluxe', label: 'Deluxe Preset', Icon: Sparkles }, { id: 'promos', label: 'Promos', Icon: Gift }].map((t) =>
          <button key={t.id} onClick={() => setTab(t.id)}
          className={`flex items-center gap-2 px-5 py-2 rounded-full font-heading text-sm transition-all ${tab === t.id ? 'bg-midnight-cherry text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}>
              <t.Icon size={14} />{t.label}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">

        {/* ── CATEGORIES TAB ── */}
        {tab === 'categories' &&
        <AdminCategoriesManager items={items} />
        }

        {/* ── DAILY SPECIALS TAB ── */}
        {tab === 'specials' &&
        <div className="space-y-8">
            <div className="card-diner p-6">
              <h2 className="font-heading text-lg text-obsidian-roast mb-5">Add a Daily Special</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Special Title *</label>
                  <input type="text" placeholder="e.g. Friday Burger Deal" value={specialForm.title}
                onChange={(e) => setSpecialForm((p) => ({ ...p, title: e.target.value }))}
                className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Day *</label>
                  <BrandSelect value={specialForm.day_of_week} onValueChange={(v) => setSpecialForm((p) => ({ ...p, day_of_week: v }))}>
                    {DAYS.map((d) => <BrandOption key={d} value={d}>{d}</BrandOption>)}
                  </BrandSelect>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Menu Item *</label>
                  <BrandSelect
                    value={specialForm.menu_item_id || ''}
                    onValueChange={(v) => setSpecialForm((p) => ({ ...p, menu_item_id: v }))}
                    placeholder="Select an item…"
                  >
                    {items.map((i) => <BrandOption key={i.id} value={i.id}>{i.name} — ${i.price?.toFixed(2)}</BrandOption>)}
                  </BrandSelect>
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Description (optional)</label>
                  <textarea placeholder="Short description shown on homepage…" value={specialForm.description}
                onChange={(e) => setSpecialForm((p) => ({ ...p, description: e.target.value }))} rows={2}
                className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 resize-none" />
                </div>
              </div>
              <button onClick={saveSpecial} disabled={savingSpecial || !specialForm.title || !specialForm.menu_item_id}
            className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading flex items-center gap-2 disabled:opacity-50">
                <Plus size={15} /> {savingSpecial ? 'Saving…' : 'Add Special'}
              </button>
            </div>

            <div className="space-y-3">
              {specials.length === 0 ?
            <p className="text-muted-foreground text-center py-8">No specials yet. Add one above.</p> :
            specials.map((s) =>
            <div key={s.id} className={`card-diner p-4 flex items-center gap-4 ${!s.is_active ? 'opacity-50' : ''}`}>
                  {s.menu_item_image && <img src={s.menu_item_image} alt={s.menu_item_name} className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm text-obsidian-roast">{s.title}</p>
                    <p className="text-xs text-muted-foreground">{s.menu_item_name} · ${s.menu_item_price?.toFixed(2)} · {s.day_of_week}</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => toggleSpecial(s)} className={`px-3 py-1.5 rounded-xl text-xs font-heading transition-colors ${s.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {s.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => deleteSpecial(s.id)} className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
            )}
            </div>
          </div>
        }

        {/* ── COMBO BUILDER TAB ── */}
        {tab === 'combos' &&
        <div className="space-y-8">
            <div className="card-diner p-6">
              <h2 className="font-heading text-lg text-obsidian-roast mb-2">Add a Combo</h2>
              <p className="text-sm text-muted-foreground mb-5">Pick which category covers the main, side, and drink — these include any custom categories you put together in the Categories tab. Customers get a bundle discount when they pick all three.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Combo Name *</label>
                  <input type="text" placeholder="e.g. Classic Combo" value={comboForm.name}
                onChange={(e) => setComboForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Main Category *</label>
                  <BrandSelect
                    value={comboForm.main_category || ''}
                    onValueChange={(v) => setComboForm((p) => ({ ...p, main_category: v }))}
                    placeholder="Select category…"
                  >
                    {allCategoryKeys.map((c) => <BrandOption key={c} value={c}>{categoryLabel(c, renames)}</BrandOption>)}
                  </BrandSelect>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Side Category *</label>
                  <BrandSelect
                    value={comboForm.side_category || ''}
                    onValueChange={(v) => setComboForm((p) => ({ ...p, side_category: v }))}
                    placeholder="Select category…"
                  >
                    {allCategoryKeys.map((c) => <BrandOption key={c} value={c}>{categoryLabel(c, renames)}</BrandOption>)}
                  </BrandSelect>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Drink Category *</label>
                  <BrandSelect
                    value={comboForm.drink_category || ''}
                    onValueChange={(v) => setComboForm((p) => ({ ...p, drink_category: v }))}
                    placeholder="Select category…"
                  >
                    {allCategoryKeys.map((c) => <BrandOption key={c} value={c}>{categoryLabel(c, renames)}</BrandOption>)}
                  </BrandSelect>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Discount %</label>
                  <input type="number" min="0" max="100" placeholder="12" value={comboForm.discount_percent}
                    onChange={(e) => setComboForm((p) => ({ ...p, discount_percent: e.target.value }))}
                    className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Description (optional)</label>
                  <input type="text" placeholder="Short tagline shown to customers…" value={comboForm.description}
                onChange={(e) => setComboForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30" />
                </div>
              </div>
              <button onClick={saveCombo} disabled={savingCombo || !comboForm.name || !comboForm.main_category || !comboForm.side_category || !comboForm.drink_category}
            className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading flex items-center gap-2 disabled:opacity-50">
                <Plus size={15} /> {savingCombo ? 'Saving…' : 'Create Combo'}
              </button>
            </div>

            <div className="space-y-3">
              {combos.length === 0 ?
            <p className="text-muted-foreground text-center py-8">No combos yet. Create one above.</p> :
            combos.map((c) =>
            <div key={c.id} className={`card-diner p-4 flex items-center gap-4 ${!c.is_active ? 'opacity-50' : ''}`}>
                  <div className="w-10 h-10 bg-midnight-cherry/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Package size={18} className="text-midnight-cherry" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-heading text-sm text-obsidian-roast">{c.name}</p>
                    <p className="text-xs text-muted-foreground">{c.main_category} + {c.side_category} + {c.drink_category}</p>
                    <p className="text-xs text-patina-mint font-heading mt-0.5">{c.discount_percent || 12}% off when bundled</p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => toggleCombo(c)} className={`px-3 py-1.5 rounded-xl text-xs font-heading transition-colors ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.is_active ? 'Active' : 'Inactive'}
                    </button>
                    <button onClick={() => deleteCombo(c.id)} className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
            )}
            </div>
          </div>
        }

        {/* ── DELUXE PRESET TAB ── */}
        {tab === 'deluxe' && <AdminDeluxeManager />}

        {/* ── PROMOS TAB ── */}
        {tab === 'promos' && <AdminPromosManager />}

        {/* ── MENU ITEMS TAB ── */}
        {tab === 'menu' &&
        <>
        <input
            type="text"
            placeholder="Search items…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-4 py-3 bg-white border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 mb-8" />
          

        {loading ?
          <div className="text-center py-20 text-muted-foreground">Loading…</div> :

          Object.entries(grouped).map(([category, catItems]) =>
          <div key={category} className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <Tag size={16} className="text-patina-mint" />
                <h2 className="font-heading text-lg text-obsidian-roast">{categoryLabel(category, renames)}</h2>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{catItems.length}</span>
              </div>
              <div className="space-y-3">
                {catItems.map((item) =>
              <div key={item.id} className={`card-diner overflow-hidden transition-all ${item.is_hidden ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-4 p-4">
                      {item.image_url ?
                  <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-xl flex-shrink-0" /> :

                  <div className="w-16 h-16 bg-muted rounded-xl flex-shrink-0 flex items-center justify-center text-2xl">
                          {item.category === 'Burgers' ? '🍔' : item.category === 'Shakes' ? '🥤' : item.category === 'Sides' ? '🍟' : '🍽️'}
                        </div>
                  }
                      <div className="flex-1 min-w-0">
                        <p className="font-heading text-sm text-obsidian-roast">{item.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{item.description}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-midnight-cherry font-semibold text-sm">${item.price?.toFixed(2)}</span>
                          {item.modifiers?.length > 0 &&
                      <span className="text-xs text-patina-mint">{item.modifiers.length} modifier group{item.modifiers.length !== 1 ? 's' : ''}</span>
                      }
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-muted-foreground font-heading uppercase tracking-wider">Category</span>
                          <BrandSelect
                            value={item.display_category || '__default__'}
                            onValueChange={(v) => assignCategoryToItem(item, v === '__default__' ? '' : v)}
                            className="flex-1 max-w-[220px] px-2.5 py-1.5 text-xs"
                          >
                            <BrandOption value="__default__">{itemCategoryKey(item)} (default)</BrandOption>
                            {allCategoryKeys.map((k) => <BrandOption key={k} value={k}>{categoryLabel(k, renames)}</BrandOption>)}
                          </BrandSelect>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Reorder within category */}
                        {!search &&
                    <div className="flex flex-col">
                            <button onClick={() => moveItem(item, 'up')} className="p-0.5 text-muted-foreground hover:text-obsidian-roast" title="Move up">
                              <ChevronUp size={14} />
                            </button>
                            <button onClick={() => moveItem(item, 'down')} className="p-0.5 text-muted-foreground hover:text-obsidian-roast" title="Move down">
                              <ChevronDown size={14} />
                            </button>
                          </div>
                    }
                        {/* Available toggle */}
                        <button
                      onClick={() => toggleAvailable(item)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-heading transition-colors ${
                      item.is_available !== false ?
                      'bg-green-100 text-green-700 hover:bg-green-200' :
                      'bg-red-100 text-red-600 hover:bg-red-200'}`
                      }>
                      
                          {item.is_available !== false ? 'In Stock' : 'Out of Stock'}
                        </button>

                        {/* Hide toggle */}
                        <button
                      onClick={() => toggleHide(item)}
                      title={item.is_hidden ? 'Show on menu' : 'Hide from menu'}
                      className={`p-2 rounded-xl transition-colors ${
                      item.is_hidden ?
                      'bg-gray-200 text-gray-500 hover:bg-gray-300' :
                      'bg-muted text-muted-foreground hover:bg-gray-200'}`
                      }>
                      
                          {item.is_hidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>

                        {/* Expand modifiers */}
                        {item.modifiers?.length > 0 &&
                    <button
                      onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                      className="p-2 rounded-xl bg-muted hover:bg-gray-200 transition-colors text-muted-foreground">
                      
                            {expandedId === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                    }
                      </div>
                    </div>

                    {/* Modifier detail panel */}
                    {expandedId === item.id && item.modifiers?.length > 0 &&
                <div className="border-t border-border bg-muted/40 px-4 py-4 space-y-4">
                        {item.modifiers.map((group, gi) =>
                  <div key={gi}>
                            <div className="flex items-center gap-2 mb-2">
                              <p className="font-heading text-xs uppercase tracking-widest text-obsidian-roast">{group.name}</p>
                              <span className="text-xs text-muted-foreground bg-white px-2 py-0.5 rounded-full border border-border">
                                {group.selection_type === 'MULTIPLE' ? 'Choose any' : 'Choose one'}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {(group.modifiers || []).map((mod, mi) =>
                      <span key={mi} className="bg-white border border-border rounded-xl px-3 py-1.5 text-xs text-obsidian-roast">
                                  {mod.name} {mod.price > 0 ? <span className="text-patina-mint ml-1">+${mod.price.toFixed(2)}</span> : ''}
                                </span>
                      )}
                            </div>
                          </div>
                  )}
                      </div>
                }
                  </div>
              )}
              </div>
            </div>
          )
          }
          </>
        }
      </div>
    </div>);

}