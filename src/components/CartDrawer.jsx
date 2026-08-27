import React, { useState } from 'react';
import { X, Plus, Minus, Trash2, ArrowRight, Users } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useNavigate } from 'react-router-dom';
import CartItemModifiers from './CartItemModifiers';
import AdBannerStrip from './AdBannerStrip';
import CheckoutRewardsPanel from '@/components/checkout/CheckoutRewardsPanel';

const ORDER_TYPE_LABELS = {
  pickup: 'Pickup',
  delivery: 'Delivery',
  dine_in: 'Dine-In',
};

export default function CartDrawer() {
  const {
    cartItems, isCartOpen, setIsCartOpen,
    updateQuantity, removeItem, reassignItem,
    orderType, setOrderType,
    subtotal, deliveryFee, tax, total, totalItems,
    orderingEnabled, orderingClosedMessage,
    cutoffStatus,
    groupMode, people, activePerson, startGroupOrder,
    appliedReward, setAppliedReward,
  } = useCart();
  const navigate = useNavigate();
  const [assignFor, setAssignFor] = useState(null);
  const [rewardsPhone, setRewardsPhone] = useState('');

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setIsCartOpen(false);
    navigate('/checkout');
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-[70] backdrop-blur-sm"
        onClick={() => setIsCartOpen(false)}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full sm:w-96 bg-vanilla-malt z-[71] flex flex-col shadow-float-lg animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border bg-white">
          <div className="flex items-center gap-3">
            <img
              src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/7c5e40c67_shoppingcart.png"
              alt="Your cart"
              className="w-10 h-10 object-contain"
            />
            <div>
              <h2 className="font-heading text-lg text-obsidian-roast">Your Order</h2>
              <p className="text-xs text-muted-foreground">{totalItems} item{totalItems !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Order Type Selector */}
        <div className="p-4 bg-white border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-widest">Order Type</p>
          <div className="flex gap-2">
            {['pickup', 'delivery', 'dine_in'].map(type => (
              <button
                key={type}
                onClick={() => setOrderType(type)}
                disabled={cutoffStatus[type]}
                className={`flex-1 py-2 text-xs font-heading rounded-xl transition-all ${
                  cutoffStatus[type]
                    ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : orderType === type
                    ? 'bg-midnight-cherry text-white shadow-float'
                    : 'bg-muted text-muted-foreground hover:bg-gray-200'
                }`}
              >
                {ORDER_TYPE_LABELS[type]}
              </button>
            ))}
          </div>
        </div>

        {/* Promo banners */}
        {cartItems.length > 0 && (
          <div className="px-4 pt-3">
            <AdBannerStrip placement="cart" compact />
          </div>
        )}

        {/* Items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cartItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground">
              <img
                src="https://media.base44.com/images/public/6a3d84f2fe4ae4efe7f629bf/7c5e40c67_shoppingcart.png"
                alt="Your cart"
                className="w-28 h-28 object-contain animate-float-up"
              />
              <p className="font-body">Your cart is empty</p>
              <button
                onClick={() => setIsCartOpen(false)}
                className="btn-cherry px-6 py-2.5 text-sm"
              >
                Browse Menu
              </button>
              <button
                onClick={() => { startGroupOrder(); setIsCartOpen(false); navigate('/menu'); }}
                className="text-xs text-patina-mint hover:text-midnight-cherry font-heading inline-flex items-center gap-1 transition-colors"
              >
                <Users size={13} /> Start a Group Order
              </button>
            </div>
          ) : (
            cartItems.map(item => (
              <div key={item.id} className="card-diner p-3 flex gap-3">
                {item.image_url && (
                  <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-heading text-sm text-obsidian-roast truncate">{item.name}</p>
                  <CartItemModifiers modifiers={item.selectedModifiers} />
                  <p className="text-patina-mint font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</p>

                  {groupMode && (
                    <div className="mt-1.5">
                      <button
                        onClick={() => setAssignFor(assignFor === item.id ? null : item.id)}
                        className="inline-flex items-center gap-1 text-xs bg-patina-mint/10 text-patina-mint px-2 py-0.5 rounded-full font-heading hover:bg-patina-mint/20 transition-colors"
                      >
                        <Users size={10} /> {item.person_name || 'Unassigned'}
                      </button>
                      {assignFor === item.id && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {people.map(p => (
                            <button
                              key={p.id}
                              onClick={() => { reassignItem(item.id, p.id, p.name); setAssignFor(null); }}
                              className={`text-xs px-2 py-0.5 rounded-full font-heading transition-all ${item.person_id === p.id ? 'bg-patina-mint text-white' : 'bg-muted text-obsidian-roast hover:bg-patina-mint/20'}`}
                            >
                              {p.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-midnight-cherry hover:text-white transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="font-heading text-sm w-4 text-center">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-muted flex items-center justify-center hover:bg-midnight-cherry hover:text-white transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="ml-auto p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
          {cartItems.length > 0 && (
            <div className="space-y-3 pt-2">
              <div>
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">Phone (for Star Rewards)</label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={rewardsPhone}
                  onChange={e => { setRewardsPhone(e.target.value); setAppliedReward(null); }}
                  placeholder="(270) 555-0000"
                  className="w-full px-3 py-2.5 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                />
              </div>
              <CheckoutRewardsPanel
                subtotal={subtotal}
                phone={rewardsPhone}
                appliedReward={appliedReward}
                onApply={setAppliedReward}
                showRewards={!groupMode}
              />
            </div>
          )}
        </div>

        {/* Footer totals + checkout */}
        {cartItems.length > 0 && (
          <div className="p-4 bg-white border-t border-border space-y-3 safe-bottom">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery Fee</span>
                  <span>${deliveryFee.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-muted-foreground">
                <span>Tax (6%)</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-heading text-obsidian-roast text-base pt-2 border-t border-border">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
            </div>
            {orderingEnabled ? (
              <button
                onClick={handleCheckout}
                className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2"
              >
                Checkout <ArrowRight size={16} />
              </button>
            ) : (
              <div className="rounded-2xl bg-muted text-center py-4 px-4 text-sm text-muted-foreground font-heading">
                {orderingClosedMessage}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}