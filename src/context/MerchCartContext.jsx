// Dedicated merch cart context — kept separate from the food cart.
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

import { trackAddToCart, merchItemToGa4 } from '@/lib/ga4Ecommerce';

const MerchCartContext = createContext(null);
const SESSION_KEY = 'flavor-isle-merch-cart';

const readSession = (key, fallback) => {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed[key] ?? fallback;
  } catch {
    return fallback;
  }
};

export function MerchCartProvider({ children }) {
  const [items, setItems] = useState(() => readSession('items', []));
  const [isCartOpen, setIsCartOpen] = useState(false);

  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ items }));
    } catch { /* storage unavailable */ }
  }, [items]);

  // Each variant is its own line; adding the same variant merges quantities.
  const addItem = useCallback((item) => {
    trackAddToCart(merchItemToGa4(item));
    setItems(prev => {
      const id = String(item.sync_variant_id);
      const existing = prev.find(i => i.id === id);
      if (existing) {
        return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + (item.quantity || 1) } : i);
      }
      return [...prev, {
        id,
        productId: item.productId,
        name: item.name,
        variantName: item.variantName || '',
        sku: item.sku || '',
        sync_variant_id: item.sync_variant_id,
        variant_id: item.variant_id || null,
        price: item.price,
        image: item.image || '',
        size: item.size || '',
        color: item.color || '',
        quantity: item.quantity || 1,
      }];
    });
  }, []);

  const updateQuantity = useCallback((id, quantity) => {
    if (quantity <= 0) {
      setItems(prev => prev.filter(i => i.id !== id));
    } else {
      setItems(prev => prev.map(i => i.id === id ? { ...i, quantity } : i));
    }
  }, []);

  const removeItem = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

  return (
    <MerchCartContext.Provider value={{
      items, addItem, removeItem, updateQuantity, clearCart,
      isCartOpen, setIsCartOpen,
      totalItems, subtotal,
    }}>
      {children}
    </MerchCartContext.Provider>
  );
}

export const useMerchCart = () => {
  const ctx = useContext(MerchCartContext);
  if (!ctx) throw new Error('useMerchCart must be used within MerchCartProvider');
  return ctx;
};