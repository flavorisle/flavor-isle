import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Gift, ChevronDown, ChevronUp, Star, Pencil, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

// Literal Tailwind classes so the purge keeps them.
const BADGE_COLORS = [
  { value: 'bg-midnight-cherry', label: 'Cherry' },
  { value: 'bg-patina-mint', label: 'Navy' },
  { value: 'bg-amber-500', label: 'Amber' },
  { value: 'bg-purple-600', label: 'Purple' },
  { value: 'bg-emerald-600', label: 'Emerald' },
  { value: 'bg-pink-500', label: 'Pink' },
];

const LINK_OPTIONS = [
  { value: '/menu', label: 'Order / Menu' },
  { value: '/milkshakes', label: 'Milkshakes' },
  { value: '/contact', label: 'Contact' },
];

const EMPTY_FORM = {
  badge: '',
  badge_color: 'bg-midnight-cherry',
  emoji: '🍔',
  title: '',
  description: '',
  detail: '',
  cta_label: 'Order Now',
  cta_link: '/menu',
  featured: false,
  is_active: true,
  sort_order: 0,
};

export default function AdminPromosManager() {
  const [promos, setPromos] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => { loadPromos(); }, []);

  const loadPromos = async () => {
    try {
      const data = await base44.entities.Promo.list('sort_order', 100);
      setPromos(data || []);
    } catch (e) {
      console.error('Failed to load promos', e);
    }
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setExpandedId(null);
  };

  const startEdit = (p) => {
    setForm({
      badge: p.badge || '',
      badge_color: p.badge_color || 'bg-midnight-cherry',
      emoji: p.emoji || '🍔',
      title: p.title || '',
      description: p.description || '',
      detail: p.detail || '',
      cta_label: p.cta_label || 'Order Now',
      cta_link: p.cta_link || '/menu',
      featured: !!p.featured,
      is_active: p.is_active !== false,
      sort_order: p.sort_order || 0,
    });
    setEditingId(p.id);
    setExpandedId(p.id);
  };

  const save = async () => {
    if (!form.title) return;
    setSaving(true);
    try {
      const payload = {
        badge: form.badge,
        badge_color: form.badge_color,
        emoji: form.emoji,
        title: form.title,
        description: form.description,
        detail: form.detail,
        cta_label: form.cta_label,
        cta_link: form.cta_link,
        featured: form.featured,
        is_active: form.is_active,
        sort_order: Number(form.sort_order) || 0,
      };
      if (editingId) {
        await base44.entities.Promo.update(editingId, payload);
      } else {
        await base44.entities.Promo.create(payload);
      }
      resetForm();
      await loadPromos();
    } catch (e) {
      console.error('Save promo failed', e);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p) => {
    await base44.entities.Promo.update(p.id, { is_active: !p.is_active });
    setPromos(prev => prev.map(x => x.id === p.id ? { ...x, is_active: !x.is_active } : x));
  };

  const toggleFeatured = async (p) => {
    await base44.entities.Promo.update(p.id, { featured: !p.featured });
    setPromos(prev => prev.map(x => x.id === p.id ? { ...x, featured: !x.featured } : x));
  };

  const remove = async (id) => {
    await base44.entities.Promo.delete(id);
    setPromos(prev => prev.filter(p => p.id !== id));
    if (editingId === id) resetForm();
  };

  return (
    <div className="space-y-8">
      {/* Add / Edit form */}
      <div className="card-diner p-6">
        <div className="flex items-center gap-2 mb-5">
          <Gift size={18} className="text-midnight-cherry" />
          <h2 className="font-heading text-lg text-obsidian-roast">
            {editingId ? 'Edit Promo' : 'Add a Promo'}
          </h2>
          {editingId && (
            <button onClick={resetForm} className="ml-auto p-2 rounded-xl text-muted-foreground hover:bg-muted" title="Cancel edit">
              <X size={16} />
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Title *</label>
            <input type="text" placeholder="e.g. Kids Eat Free Tuesdays" value={form.title}
              onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Badge Label</label>
            <input type="text" placeholder="e.g. Every Day" value={form.badge}
              onChange={e => setForm(p => ({ ...p, badge: e.target.value }))}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Badge Color</label>
            <select value={form.badge_color} onChange={e => setForm(p => ({ ...p, badge_color: e.target.value }))}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30">
              {BADGE_COLORS.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Emoji</label>
            <input type="text" placeholder="🍔" value={form.emoji}
              onChange={e => setForm(p => ({ ...p, emoji: e.target.value }))}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Description</label>
            <textarea placeholder="Main description shown on the card" value={form.description} rows={2}
              onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 resize-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Details (optional)</label>
            <input type="text" placeholder="Revealed when a guest expands 'See details'" value={form.detail}
              onChange={e => setForm(p => ({ ...p, detail: e.target.value }))}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Button Label</label>
            <input type="text" placeholder="Order Now" value={form.cta_label}
              onChange={e => setForm(p => ({ ...p, cta_label: e.target.value }))}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30" />
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Button Links To</label>
            <select value={form.cta_link} onChange={e => setForm(p => ({ ...p, cta_link: e.target.value }))}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30">
              {LINK_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Sort Order</label>
            <input type="number" placeholder="0" value={form.sort_order}
              onChange={e => setForm(p => ({ ...p, sort_order: e.target.value }))}
              className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30" />
            <p className="text-xs text-muted-foreground mt-1">Lower numbers appear first.</p>
          </div>
          <div className="flex items-end gap-6 pb-1">
            <label className="flex items-center gap-2 text-sm text-obsidian-roast cursor-pointer">
              <input type="checkbox" checked={form.featured} onChange={e => setForm(p => ({ ...p, featured: e.target.checked }))}
                className="w-4 h-4 accent-midnight-cherry" />
              Featured banner
            </label>
            <label className="flex items-center gap-2 text-sm text-obsidian-roast cursor-pointer">
              <input type="checkbox" checked={form.is_active} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                className="w-4 h-4 accent-midnight-cherry" />
              Active
            </label>
          </div>
        </div>
        <button onClick={save} disabled={saving || !form.title}
          className="btn-cherry chrome-hover px-6 py-3 text-sm font-heading flex items-center gap-2 disabled:opacity-50">
          <Plus size={15} /> {saving ? 'Saving…' : (editingId ? 'Update Promo' : 'Add Promo')}
        </button>
      </div>

      {/* Existing promos */}
      <div className="space-y-3">
        {promos.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No promos yet. Add one above.</p>
        ) : promos.map(p => (
          <div key={p.id} className={`card-diner p-4 ${!p.is_active ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-4">
              <div className="text-3xl flex-shrink-0">{p.emoji || '🎁'}</div>
              <div className="flex-1 min-w-0">
                <p className="font-heading text-sm text-obsidian-roast">{p.title}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {p.badge || 'No badge'} · {p.cta_label || 'Order Now'} → {p.cta_link || '/menu'} · Order {p.sort_order || 0}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => toggleFeatured(p)} title="Featured banner"
                  className={`p-2 rounded-xl transition-colors ${p.featured ? 'bg-amber-100 text-amber-600' : 'bg-muted text-muted-foreground hover:bg-gray-200'}`}>
                  <Star size={15} fill={p.featured ? 'currentColor' : 'none'} />
                </button>
                <button onClick={() => toggleActive(p)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-heading transition-colors ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {p.is_active ? 'Active' : 'Inactive'}
                </button>
                <button onClick={() => (expandedId === p.id ? resetForm() : startEdit(p))}
                  className={`p-2 rounded-xl transition-colors ${expandedId === p.id && editingId === p.id ? 'bg-midnight-cherry text-white' : 'bg-muted text-muted-foreground hover:bg-gray-200'}`}
                  title="Edit">
                  {expandedId === p.id && editingId === p.id ? <ChevronUp size={15} /> : <Pencil size={15} />}
                </button>
                <button onClick={() => remove(p.id)}
                  className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-red-50 transition-colors"
                  title="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}