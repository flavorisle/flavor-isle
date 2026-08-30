// Tasty Threads storefront — powered by Printful, grouped by admin-defined categories.
import React, { useState, useEffect, useMemo } from 'react';
import { ShoppingBag, AlertCircle, Shirt } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/merch/ProductCard';
import ProductDetailModal from '@/components/merch/ProductDetailModal';
import MerchCartButton from '@/components/merch/MerchCartButton';
import { useMerchCart } from '@/context/MerchCartContext';
import { useToast } from '@/components/ui/use-toast';

const UNGROUPED = 'Other';

export default function Merch() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeProduct, setActiveProduct] = useState(null);
  const [activeSuper, setActiveSuper] = useState('All');
  const { addItem, setIsCartOpen } = useMerchCart();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const [prodRes, cats, assigns] = await Promise.all([
          base44.functions.invoke('getPrintfulProducts', {}),
          base44.entities.MerchCategory.list('-sort_order', 200).catch(() => []),
          base44.entities.MerchProductAssignment.list('-sort_order', 500).catch(() => []),
        ]);
        if (cancelled) return;
        setProducts(prodRes.data?.products || []);
        setCategories(cats || []);
        setAssignments(assigns || []);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || err.message || 'Could not load the store.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Resolve grouping for each product.
  const { supers, grouped } = useMemo(() => {
    const catByName = new Map(categories.map((c) => [c.name, c]));
    const assignByPid = new Map(assignments.map((a) => [String(a.product_id), a.category]));

    const resolveSuper = (product) => {
      const catName = assignByPid.get(String(product.id));
      if (!catName) return UNGROUPED;
      const cat = catByName.get(catName);
      if (!cat) return UNGROUPED;
      return cat.super_category || cat.name; // sub → its parent; super → itself
    };

    const resolveCategory = (product) => {
      const catName = assignByPid.get(String(product.id));
      if (!catName) return '';
      const cat = catByName.get(catName);
      if (!cat) return catName;
      return cat.super_category ? cat.name : ''; // only subs get a sub-heading
    };

    const superSet = new Map(); // superName -> sort_order
    categories
      .filter((c) => !c.super_category)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .forEach((c) => superSet.set(c.name, c.sort_order || 0));

    const grouped = new Map(); // superName -> Map(categoryName -> products[])
    for (const p of products) {
      const sup = resolveSuper(p);
      const cat = resolveCategory(p);
      if (!grouped.has(sup)) grouped.set(sup, new Map());
      const catMap = grouped.get(sup);
      if (!catMap.has(cat)) catMap.set(cat, []);
      catMap.get(cat).push(p);
      if (!superSet.has(sup)) superSet.set(sup, 999); // ungrouped last
    }

    const supers = Array.from(superSet.keys()).sort((a, b) => (superSet.get(a) - superSet.get(b)));
    // Keep "Other" last
    supers.sort((a, b) => (a === UNGROUPED ? 1 : b === UNGROUPED ? -1 : 0));
    return { supers, grouped };
  }, [products, categories, assignments]);

  const visibleSupers = activeSuper === 'All' ? supers : supers.filter((s) => s === activeSuper);

  const handleAdd = (item) => {
    addItem(item);
    setActiveProduct(null);
    toast({ title: 'Added to cart', description: `${item.name} — ${item.variantName}` });
    setIsCartOpen(true);
  };

  const renderSection = (superName) => {
    const catMap = grouped.get(superName);
    if (!catMap) return null;
    const sections = Array.from(catMap.keys());
    return (
      <div key={superName} className="mb-12">
        <h2 className="font-heading text-2xl sm:text-3xl text-obsidian-roast mb-5">{superName}</h2>
        {sections.map((cat) => (
          <div key={cat || 'flat'} className={cat ? 'mb-7' : ''}>
            {cat && (
              <h3 className="font-heading text-sm uppercase tracking-widest text-patina-mint mb-3">{cat}</h3>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {(catMap.get(cat) || []).map((p) => (
                <ProductCard key={p.id} product={p} onClick={setActiveProduct} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const hasCategories = supers.length > 1 || (supers.length === 1 && supers[0] !== UNGROUPED);

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />

      {/* Hero */}
      <section className="bg-obsidian-roast relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          {/* Tasty Threads brand logo */}
          <img
            src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/cc3a8ab5c_Copilot_20250829_140545.png"
            alt="Tasty Threads — Flavor Isle Apparel, est. 1964"
            className="w-full max-w-md h-auto bg-white rounded-2xl p-4 mb-6"
          />
          <p className="text-gray-300 mt-4 max-w-xl text-lg">
            Wear the flavor. Tees, cups, and gear printed on demand and shipped straight to your door.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm">
            <ShoppingBag size={14} /> Free shipping quotes at checkout
          </div>
        </div>
      </section>

      {/* Toolbar + category filter */}
      <div className="sticky top-0 z-30 bg-vanilla-malt/90 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <p className="font-heading text-sm text-obsidian-roast uppercase tracking-widest flex-shrink-0">
            {loading ? 'Loading…' : `${products.length} product${products.length !== 1 ? 's' : ''}`}
          </p>
          <MerchCartButton />
        </div>
        {hasCategories && !loading && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
            {['All', ...supers].map((s) => (
              <button
                key={s}
                onClick={() => setActiveSuper(s)}
                className={`px-4 py-2 rounded-full text-xs font-heading whitespace-nowrap transition-all ${
                  activeSuper === s
                    ? 'bg-midnight-cherry text-white'
                    : 'bg-white text-obsidian-roast border border-border hover:border-midnight-cherry/40'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 pb-32">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card-diner overflow-hidden">
                <div className="aspect-square bg-muted animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-3 bg-muted rounded w-2/3 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="max-w-lg mx-auto py-20 text-center">
            <div className="w-16 h-16 bg-midnight-cherry/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={28} className="text-midnight-cherry" />
            </div>
            <h2 className="font-heading text-2xl text-obsidian-roast mb-2">Store is being set up</h2>
            <p className="text-muted-foreground text-sm">{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="max-w-lg mx-auto py-20 text-center">
            <Shirt size={48} className="text-muted-foreground/40 mx-auto mb-4" />
            <h2 className="font-heading text-2xl text-obsidian-roast mb-2">No products yet</h2>
            <p className="text-muted-foreground text-sm">Check back soon — Tasty Threads is launching.</p>
          </div>
        ) : hasCategories ? (
          visibleSupers.map((s) => renderSection(s))
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} onClick={setActiveProduct} />
            ))}
          </div>
        )}
      </div>

      {activeProduct && (
        <ProductDetailModal product={activeProduct} onClose={() => setActiveProduct(null)} onAdd={handleAdd} />
      )}

      <Footer />
    </div>
  );
}