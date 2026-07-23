import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { getMenuSetting } from '@/lib/menuSettings';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cartItems, setCartItems] = useState([]);
  const [orderType, setOrderType] = useState('pickup'); // pickup | delivery | dine_in
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [orderingEnabled, setOrderingEnabledState] = useState(true);
  const [orderingClosedMessage, setOrderingClosedMessage] = useState('Ordering is temporarily closed');

  useEffect(() => {
    getMenuSetting()
      .then(s => {
        setOrderingEnabledState(s.ordering_enabled !== false);
        if (s.ordering_closed_message) setOrderingClosedMessage(s.ordering_closed_message);
      })
      .catch(() => {});
  }, []);

  // Different modifier combos on the same menu item become separate lines,
  // so each selection's modifiers are preserved and displayed.
  const lineId = (item) => {
    const mods = (item.selectedModifiers || [])
      .map(m => `${m.name}:${m.price ?? 0}`)
      .sort()
      .join('|');
    return mods ? `${item.id}__${mods}` : item.id;
  };

  const addItem = useCallback((item) => {
    const id = lineId(item);
    setCartItems(prev => {
      const existing = prev.find(i => i.id === id);
      if (existing) {
        return prev.map(i => i.id === id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, id, quantity: 1 }];
    });
  }, []);

  const removeItem = useCallback((itemId) => {
    setCartItems(prev => prev.filter(i => i.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId, quantity) => {
    if (quantity <= 0) {
      setCartItems(prev => prev.filter(i => i.id !== itemId));
    } else {
      setCartItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity } : i));
    }
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  const totalItems = cartItems.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const deliveryFee = orderType === 'delivery' ? 3.99 : 0;
  const tax = subtotal * 0.06;
  const total = subtotal + deliveryFee + tax;

  return (
    <CartContext.Provider value={{
      cartItems, addItem, removeItem, updateQuantity, clearCart,
      orderType, setOrderType,
      isCartOpen, setIsCartOpen,
      totalItems, subtotal, deliveryFee, tax, total,
      orderingEnabled, orderingClosedMessage
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
};