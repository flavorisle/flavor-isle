import React, { useState, useEffect } from 'react';
import { X, Plus, Minus, Trash2, ArrowRight, Users, UserCircle, UserCheck } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import CartItemModifiers from './CartItemModifiers';
import AdBannerStrip from './AdBannerStrip';
import CartDessertUpsell from './CartDessertUpsell';
import { trackViewCart, foodItemToGa4 } from '@/lib/ga4Ecommerce';

// Curbside is a pickup method — it maps to orderType 'pickup' with
// pickupMethod 'curbside' so cutoffs and fees behave exactly like pickup.
const ORDER_OPTIONS = [
  { key: 'pickup', label: 'Pickup', orderType: 'pickup', method: 'counter' },
  { key: 'curbside', label: 'Curbside', orderType: 'pickup', method: 'curbside' },
  { key: 'delivery', label: 'Delivery', orderType: 'delivery' },
  { key: 'dine_in', label: 'Dine-In', orderType: 'dine_in' },
];

export default function CartDrawer() {
  const {
    cartItems, isCartOpen, setIsCartOpen,
    updateQuantity, removeItem, reassignItem,
    orderType, setOrderType,
    pickupMethod, setPickupMethod,
    subtotal, deliveryFee, tax, total, totalItems,
    orderingEnabled, orderingClosedMessage,
    cutoffStatus,
    happyHourDiscount,
    groupMode, people, activePerson, startGroupOrder,
  } = useCart();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [assignFor, setAssignFor] = useState(null);
  const [showGuestPrompt, setShowGuestPrompt] = useState(false);

  useEffect(() => {
    if (isCartOpen && cartItems.length > 0) {
      trackViewCart(cartItems.map(foodItemToGa4), cartItems.reduce((s, i) => s + i.price * i.quantity, 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCartOpen]);

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    // Signed-in customers go straight to checkout. Guests see a quick prompt
    // to log in (for saved details + rewards) or continue as a guest.
    if (isAuthenticated) {
      setIsCartOpen(false);
      navigate('/checkout');
    } else {
      setShowGuestPrompt(true);
    }
  };

  const goToLogin = () => {
    setIsCartOpen(false);
    setShowGuestPrompt(false);
    navigate('/login?returnTo=%2Fcheckout');
  };

  const continueAsGuest = () => {
    setIsCartOpen(false);
    setShowGuestPrompt(false);
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
          <div className="grid grid-cols-4 gap-2">
            {ORDER_OPTIONS.map(opt => {
              const disabled = cutoffStatus[opt.orderType];
              const active = orderType === opt.orderType && (!opt.method || pickupMethod === opt.method);
              return (
                <button
                  key={opt.key}
                  onClick={() => { setOrderType(opt.orderType); if (opt.method) setPickupMethod(opt.method); }}
                  disabled={disabled}
                  className={`py-2 text-xs font-heading rounded-xl transition-all ${
                    disabled
                      ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                      : active
                      ? 'bg-midnight-cherry text-white shadow-float'
                      : 'bg-muted text-muted-foreground hover:bg-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
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
            <>
            {cartItems.map(item => (
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
            ))}
            <CartDessertUpsell />
            </>
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
              {happyHourDiscount > 0 && (
                <div className="flex justify-between text-midnight-cherry font-semibold">
                  <span>Happy Hour — Unbeatable value (online)</span>
                  <span>−${happyHourDiscount.toFixed(2)}</span>
                </div>
              )}
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

      {/* Guest checkout prompt — log in for saved details + rewards, or continue as guest */}
      {showGuestPrompt && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={() => setShowGuestPrompt(false)}>
          <div className="bg-white rounded-3xl shadow-float-lg max-w-sm w-full p-6 animate-float-up" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className="w-14 h-14 rounded-full bg-midnight-cherry/10 flex items-center justify-center mx-auto mb-3">
                <UserCircle size={28} className="text-midnight-cherry" />
              </div>
              <h3 className="font-heading text-xl text-obsidian-roast mb-1">Checking out?</h3>
              <p className="text-sm text-muted-foreground">Log in to save your details, track orders, and earn Star Rewards — or continue as a guest.</p>
            </div>
            <div className="space-y-2.5">
              <button
                onClick={goToLogin}
                className="btn-cherry chrome-hover w-full py-3.5 text-sm font-heading flex items-center justify-center gap-2"
              >
                <UserCheck size={16} /> Log In to My Account
              </button>
              <button
                onClick={continueAsGuest}
                className="w-full py-3.5 text-sm font-heading rounded-full border-2 border-border text-obsidian-roast hover:border-midnight-cherry/40 transition-colors"
              >
                Continue as Guest
              </button>
            </div>
            <button
              onClick={() => setShowGuestPrompt(false)}
              className="mt-4 w-full text-xs text-muted-foreground hover:text-obsidian-roast transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}