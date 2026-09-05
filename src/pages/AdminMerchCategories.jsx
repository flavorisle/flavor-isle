// Admin — manage Tasty Threads super categories, categories, and product assignments.
import React, { useState, useEffect } from 'react';
import { Shirt, Plus, Trash2, RefreshCw, Layers, Tag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import AdminNav from '@/components/admin/AdminNav';
import { useToast } from '@/components/ui/use-toast';

export default function AdminMerchCategories() {
  const { toast } = useToast();
  const [categories, setCategories] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const [superName, setSuperName] = useState('');
  const [catName, setCatName] = useState('');
  const [catParent, setCatParent] = useState('');

  // Full initial load — products, categories, and assignments in one batch.
  const loadAll = async () => {
    setLoading(true);
    setError('');
    try {
      const [cats, assigns, prodRes] = await Promise.all([
        base44.entities.MerchCategory.list('-sort_order', 200),
        base44.entities.MerchProductAssignment.list('-sort_order', 500),
        base44.functions.invoke('getPrintfulProducts', {}).catch(() => ({ data: { products: [] } })),
      ]);
      setCategories(cats || []);
      setAssignments(assigns || []);
      setProducts(prodRes.data?.products || []);
    } catch (e) {
      setError(e?.message || 'Could not load categories.');
    } finally {
      setLoading(false);
    }
  };

  // Refresh only categories + assignments (after category changes). Skips the
  // expensive Printful catalog fetch since products don't change here.
  const refreshMeta = async () => {
    try {
      const [cats, assigns] = await Promise.all([
        base44.entities.MerchCategory.list('-sort_order', 200),
        base44.entities.MerchProductAssignment.list('-sort_order', 500),
      ]);
      setCategories(cats || []);
      setAssignments(assigns || []);
    } catch (e) {
      /* keep last known state */
    }
  };

  // Refresh only assignments (after a single product assignment). One call.
  const refreshAssignments = async () => {
    try {
      const assigns = await base44.entities.MerchProductAssignment.list('-sort_order', 500);
      setAssignments(assigns || []);
    } catch (e) {
      /* keep last known state */
    }
  };

  useEffect(() => { loadAll(); }, []);

  const supers = categories
    .filter((c) => !c.super_category)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  const subs = categories
    .filter((c) => !!c.super_category)
    .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));

  const assignmentFor = (productId) =>
    assignments.find((a) => String(a.product_id) === String(productId));

  const addSuper = async () => {
    if (!superName.trim()) return;
    setBusy(true);
    try {
      await base44.entities.MerchCategory.create({
        name: superName.trim(),
        super_category: '',
        sort_order: supers.length,
      });
      setSuperName('');
      await refreshMeta();
      toast({ title: 'Super category created' });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const addCat = async () => {
    if (!catName.trim() || !catParent) return;
    setBusy(true);
    try {
      const count = subs.filter((s) => s.super_category === catParent).length;
      await base44.entities.MerchCategory.create({
        name: catName.trim(),
        super_category: catParent,
        sort_order: count,
      });
      setCatName('');
      await refreshMeta();
      toast({ title: 'Category created' });
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const removeCat = async (cat) => {
    if (!confirm(`Delete "${cat.name}"? Products assigned to it will become ungrouped.`)) return;
    setBusy(true);
    try {
      await base44.entities.MerchCategory.delete(cat.id);
      await refreshMeta();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const assignProduct = async (product, categoryName) => {
    const existing = assignmentFor(product.id);
    setBusy(true);
    try {
      if (!categoryName) {
        if (existing) await base44.entities.MerchProductAssignment.delete(existing.id);
      } else if (existing) {
        await base44.entities.MerchProductAssignment.update(existing.id, {
          category: categoryName,
          product_name: product.name,
        });
      } else {
        await base44.entities.MerchProductAssignment.create({
          product_id: product.id,
          product_name: product.name,
          category: categoryName,
        });
      }
      await refreshAssignments();
    } catch (e) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  // Flat list of assignable category names (subs first, then supers), grouped.
  const assignableOptions = [
    ...subs.map((s) => ({ value: s.name, label: `${s.super_category} › ${s.name}` })),
    ...supers.map((s) => ({ value: s.name, label: s.name })),
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <AdminNav />
      <div className="bg-obsidian-roast py-10 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Shirt size={24} className="text-[hsl(var(--primary))]" />
            <p className="text-sm font-heading uppercase tracking-widest text-[hsl(var(--primary))]">TASTY THREADS</p>
          </div>
          <h1 className="font-heading text-4xl text-white">Merch Categories</h1>
          <p className="text-gray-300 mt-3">
            Group your Printful products into super categories and categories. The storefront displays them grouped automatically.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {error && (
          <div className="card-diner p-4 bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}
        {/* Super categories */}
        <section className="card-diner p-5">
          <div className="flex items-center gap-2 mb-4">
            <Layers size={18} className="text-midnight-cherry" />
            <h2 className="font-heading text-lg text-obsidian-roast">Super Categories</h2>
          </div>
          <div className="flex flex-wrap gap-2 mb-4">
            {supers.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground">No super categories yet.</p>
            )}
            {supers.map((s) => (
              <span key={s.id} className="inline-flex items-center gap-2 bg-midnight-cherry/10 text-midnight-cherry px-3 py-1.5 rounded-full text-sm font-heading">
                {s.name}
                <button
                  onClick={() => removeCat(s)}
                  disabled={busy}
                  className="hover:text-destructive disabled:opacity-50"
                  aria-label={`Delete ${s.name}`}
                >
                  <Trash2 size={13} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={superName}
              onChange={(e) => setSuperName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSuper()}
              placeholder="e.g. Apparel, Accessories, Drinkware"
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-midnight-cherry"
            />
            <button onClick={addSuper} disabled={busy || !superName.trim()} className="btn-cherry px-5 py-2.5 text-sm font-heading inline-flex items-center gap-1.5 disabled:opacity-60">
              <Plus size={15} /> Add
            </button>
          </div>
        </section>

        {/* Categories (sub) */}
        <section className="card-diner p-5">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={18} className="text-patina-mint" />
            <h2 className="font-heading text-lg text-obsidian-roast">Categories</h2>
          </div>
          {supers.length === 0 ? (
            <p className="text-sm text-muted-foreground mb-4">Create a super category first.</p>
          ) : (
            <div className="space-y-3 mb-4">
              {supers.map((sup) => {
                const kids = subs.filter((s) => s.super_category === sup.name);
                return (
                  <div key={sup.id} className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-heading uppercase tracking-widest text-muted-foreground w-28 flex-shrink-0">{sup.name}</span>
                    {kids.length === 0 ? (
                      <span className="text-xs text-muted-foreground/70">—</span>
                    ) : (
                      kids.map((k) => (
                        <span key={k.id} className="inline-flex items-center gap-2 bg-patina-mint/10 text-patina-mint px-3 py-1.5 rounded-full text-sm font-heading">
                          {k.name}
                          <button onClick={() => removeCat(k)} disabled={busy} className="hover:text-destructive disabled:opacity-50" aria-label={`Delete ${k.name}`}>
                            <Trash2 size={13} />
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              value={catParent}
              onChange={(e) => setCatParent(e.target.value)}
              className="px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-midnight-cherry"
            >
              <option value="">Select super category…</option>
              {supers.map((s) => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
            <input
              value={catName}
              onChange={(e) => setCatName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCat()}
              placeholder="e.g. T-Shirts, Hoodies, Mugs"
              className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-white text-sm focus:outline-none focus:border-midnight-cherry"
            />
            <button onClick={addCat} disabled={busy || !catName.trim() || !catParent} className="btn-mint px-5 py-2.5 text-sm font-heading inline-flex items-center gap-1.5 disabled:opacity-60">
              <Plus size={15} /> Add
            </button>
          </div>
        </section>

        {/* Product assignments */}
        <section className="card-diner p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shirt size={18} className="text-obsidian-roast" />
              <h2 className="font-heading text-lg text-obsidian-roast">Product Assignments</h2>
            </div>
            <button onClick={loadAll} className="text-sm text-patina-mint hover:text-midnight-cherry inline-flex items-center gap-1">
              <RefreshCw size={14} /> Refresh
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading products…</p>
          ) : products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No Printful products loaded. Check your Printful connection.</p>
          ) : (
            <div className="space-y-2">
              {products.map((p) => {
                const assigned = assignmentFor(p.id);
                return (
                  <div key={p.id} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
                    {p.thumbnail_url ? (
                      <img src={p.thumbnail_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-muted flex-shrink-0" />
                    )}
                    <span className="flex-1 text-sm text-obsidian-roast truncate">{p.name}</span>
                    <select
                      value={assigned?.category || ''}
                      onChange={(e) => assignProduct(p, e.target.value)}
                      disabled={busy}
                      className="px-3 py-2 rounded-lg border border-border bg-white text-sm focus:outline-none focus:border-midnight-cherry max-w-[220px]"
                    >
                      <option value="">Unassigned</option>
                      {assignableOptions.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}