// Tasty Threads storefront — powered by Printful.
import React, { useState, useEffect } from 'react';
import { ShoppingBag, AlertCircle, Shirt } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ProductCard from '@/components/merch/ProductCard';
import ProductDetailModal from '@/components/merch/ProductDetailModal';
import MerchCartButton from '@/components/merch/MerchCartButton';
import { useMerchCart } from '@/context/MerchCartContext';
import { useToast } from '@/components/ui/use-toast';

export default function Merch() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeProduct, setActiveProduct] = useState(null);
  const { addItem, setIsCartOpen } = useMerchCart();
  const { toast } = useToast();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const res = await base44.functions.invoke('getPrintfulProducts', {});
        if (cancelled) return;
        setProducts(res.data?.products || []);
      } catch (err) {
        if (!cancelled) setError(err?.response?.data?.error || err.message || 'Could not load the store.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleAdd = (item) => {
    addItem(item);
    setActiveProduct(null);
    toast({ title: 'Added to cart', description: `${item.name} — ${item.variantName}` });
    setIsCartOpen(true);
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />

      {/* Hero */}
      <section className="bg-obsidian-roast relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
          <div className="flex items-center gap-2 mb-4">
            <Shirt size={20} className="text-[hsl(var(--primary))]" />
            <p className="text-sm font-heading uppercase tracking-widest text-[hsl(var(--primary))]">FLAVOR ISLE MERCH</p>
          </div>
          <h1 className="font-heading text-5xl sm:text-7xl text-white leading-none">Tasty Threads</h1>
          <p className="text-gray-300 mt-4 max-w-xl text-lg">
            Wear the flavor. Tees, cups, and gear printed on demand and shipped straight to your door.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-white/10 text-white px-4 py-2 rounded-full text-sm">
            <ShoppingBag size={14} /> Free shipping quotes at checkout
          </div>
        </div>
      </section>

      {/* Toolbar */}
      <div className="sticky top-0 z-30 bg-vanilla-malt/90 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <p className="font-heading text-sm text-obsidian-roast uppercase tracking-widest">
            {loading ? 'Loading…' : `${products.length} product${products.length !== 1 ? 's' : ''}`}
          </p>
          <MerchCartButton />
        </div>
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
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map(p => (
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