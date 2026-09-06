// Tasty Threads cart drawer.
import React, { useEffect } from 'react';
import { X, Plus, Minus, Trash2, ArrowRight, ShoppingBag } from 'lucide-react';
import { useMerchCart } from '@/context/MerchCartContext';
import { useNavigate } from 'react-router-dom';
import { trackViewCart, merchItemToGa4 } from '@/lib/ga4Ecommerce';

export default function MerchCartDrawer() {
  const { items, isCartOpen, setIsCartOpen, updateQuantity, removeItem, clearCart, subtotal, totalItems } = useMerchCart();
  const navigate = useNavigate();

  useEffect(() => {
    if (isCartOpen && items.length > 0) {
      trackViewCart(items.map(merchItemToGa4), subtotal);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/merch-checkout');
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[70] backdrop-blur-sm" onClick={() => setIsCartOpen(false)} />
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-vanilla-malt z-[71] flex flex-col shadow-float-lg animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-midnight-cherry/10 flex items-center justify-center">
              <ShoppingBag size={20} className="text-midnight-cherry" />
            </div>
            <div>
              <h2 className="font-heading text-lg text-obsidian-roast">Tasty Threads Cart</h2>
              <p className="text-xs text-muted-foreground">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <ShoppingBag size={56} className="opacity-30" />
              <p className="font-body">Your merch cart is empty</p>
              <button onClick={() => setIsCartOpen(false)} className="btn-cherry px-6 py-2.5 text-sm">
                Browse Tasty Threads
              </button>
            </div>
          ) : (
            items.map(item => (
              <div key={item.id} className="card-diner p-3 flex gap-3">
                {item.image && (
                  <img src={item.image} alt={item.name} className="w-16 h-16 object-cover rounded-xl flex-shrink-0 bg-muted" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-sm text-obsidian-roast truncate">{item.name}</p>
                  {(item.color || item.size) && (
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {item.color && (
                        <span className="px-2 py-0.5 rounded-full bg-midnight-cherry/10 text-midnight-cherry text-[11px] font-heading">
                          {item.color}
                        </span>
                      )}
                      {item.size && (
                        <span className="px-2 py-0.5 rounded-full bg-patina-mint/10 text-patina-mint text-[11px] font-heading">
                          {item.size}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-midnight-cherry font-semibold text-sm mt-1">${(item.price * item.quantity).toFixed(2)}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-midnight-cherry hover:text-white transition-colors">
                      <Minus size={12} />
                    </button>
                    <span className="font-heading text-sm w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-midnight-cherry hover:text-white transition-colors">
                      <Plus size={12} />
                    </button>
                    <button onClick={() => removeItem(item.id)} className="ml-auto p-1 text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 bg-white border-t border-border space-y-3 safe-bottom">
            <div className="flex justify-between font-heading text-obsidian-roast text-base">
              <span>Subtotal</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Shipping & tax calculated at checkout.</p>
            <button onClick={handleCheckout} className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2">
              Checkout <ArrowRight size={16} />
            </button>
            <button onClick={clearCart} className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors py-1">
              Clear cart
            </button>
          </div>
        )}
      </div>
    </>
  );
}