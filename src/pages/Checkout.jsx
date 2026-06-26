import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ShoppingBag, Bike, Utensils, AlertCircle } from 'lucide-react';
import { useCart } from '@/context/CartContext';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import CartDrawer from '@/components/CartDrawer';

const ORDER_TYPE_LABELS = { pickup: 'Pickup', delivery: 'Delivery', dine_in: 'Dine-In' };

export default function Checkout() {
  const { cartItems, orderType, setOrderType, subtotal, deliveryFee, tax, total, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', phone: '', address: '', table: '', instructions: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const updateForm = (field, val) => setForm(prev => ({ ...prev, [field]: val }));

  const handleCheckout = async () => {
    setError('');
    if (!form.name.trim() || !form.email.trim()) {
      setError('Please fill in your name and email.');
      return;
    }
    if (orderType === 'delivery' && !form.address.trim()) {
      setError('Please enter a delivery address.');
      return;
    }

    // Check if running in iframe (preview)
    if (window.self !== window.top) {
      alert('Checkout is only available from the published app at flavor-isle.com');
      return;
    }

    setLoading(true);
    try {
      const res = await base44.functions.invoke('createStripeCheckout', {
        items: cartItems.map(i => ({ name: i.name, price: i.price, quantity: i.quantity, image_url: i.image_url })),
        orderType,
        customer: { name: form.name, email: form.email, phone: form.phone, address: form.address, table: form.table },
        instructions: form.instructions,
        subtotal, deliveryFee, tax, total
      });

      if (res.data?.url) {
        clearCart();
        window.location.href = res.data.url;
      } else {
        setError('Could not create checkout session. Please try again.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
        <Navbar />
        <CartDrawer />
        <div className="max-w-lg mx-auto py-24 px-4 text-center">
          <div className="text-6xl mb-6">🛒</div>
          <h2 className="font-heading text-2xl text-obsidian-roast mb-3">Your cart is empty</h2>
          <p className="text-muted-foreground mb-8">Add some delicious items from our menu first!</p>
          <Link to="/menu" className="btn-cherry chrome-hover px-8 py-4 text-sm font-heading inline-block">Browse Menu</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <Link to="/menu" className="inline-flex items-center gap-2 text-muted-foreground hover:text-midnight-cherry transition-colors text-sm mb-8">
          <ArrowLeft size={16} /> Back to Menu
        </Link>

        <h1 className="font-heading text-4xl text-obsidian-roast mb-10">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Left – Form */}
          <div className="lg:col-span-3 space-y-6">
            {/* Order Type */}
            <div className="card-diner p-6">
              <h2 className="font-heading text-lg text-obsidian-roast mb-4">Order Type</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { type: 'pickup', Icon: ShoppingBag, label: 'Pickup', sub: '15–25 min' },
                  { type: 'delivery', Icon: Bike, label: 'Delivery', sub: '35–50 min' },
                  { type: 'dine_in', Icon: Utensils, label: 'Dine-In', sub: 'Seat yourself' },
                ].map(({ type, Icon, label, sub }) => (
                  <button
                    key={type}
                    onClick={() => setOrderType(type)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all font-heading text-sm ${
                      orderType === type
                        ? 'border-midnight-cherry bg-midnight-cherry/5 text-midnight-cherry'
                        : 'border-border text-muted-foreground hover:border-midnight-cherry/40'
                    }`}
                  >
                    <Icon size={20} />
                    {label}
                    <span className="text-xs font-body opacity-60">{sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Contact Info */}
            <div className="card-diner p-6">
              <h2 className="font-heading text-lg text-obsidian-roast mb-4">Your Info</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Full Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => updateForm('name', e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => updateForm('email', e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={e => updateForm('phone', e.target.value)}
                    placeholder="(270) 555-0000"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                  />
                </div>
                {orderType === 'dine_in' && (
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Table Number</label>
                    <input
                      type="text"
                      value={form.table}
                      onChange={e => updateForm('table', e.target.value)}
                      placeholder="e.g. 7"
                      className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                    />
                  </div>
                )}
              </div>

              {orderType === 'delivery' && (
                <div className="mt-4">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Delivery Address *</label>
                  <input
                    type="text"
                    value={form.address}
                    onChange={e => updateForm('address', e.target.value)}
                    placeholder="123 Main St, Smiths Grove, KY 42171"
                    className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                  />
                </div>
              )}

              <div className="mt-4">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Special Instructions</label>
                <textarea
                  value={form.instructions}
                  onChange={e => updateForm('instructions', e.target.value)}
                  placeholder="Allergies, extra sauce, no pickles…"
                  rows={3}
                  className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry resize-none"
                />
              </div>
            </div>
          </div>

          {/* Right – Order Summary */}
          <div className="lg:col-span-2">
            <div className="card-diner p-6 sticky top-32">
              <h2 className="font-heading text-lg text-obsidian-roast mb-4">Order Summary</h2>

              <div className="space-y-3 mb-5">
                {cartItems.map(item => (
                  <div key={item.id} className="flex justify-between items-start gap-3">
                    <div>
                      <p className="font-heading text-sm text-obsidian-roast">{item.name}</p>
                      {item.selectedModifiers && item.selectedModifiers.length > 0 && (
                        <p className="text-xs text-patina-mint mt-0.5">
                          {item.selectedModifiers.map(m => m.name).join(', ')}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">× {item.quantity}</p>
                    </div>
                    <span className="text-midnight-cherry font-semibold text-sm">${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t border-border pt-4 space-y-2 text-sm mb-5">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Delivery</span><span>${deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax (6%)</span><span>${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-heading text-obsidian-roast text-base pt-2 border-t border-border">
                  <span>Total</span><span>${total.toFixed(2)}</span>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-2xl p-3 text-sm mb-4">
                  <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <button
                onClick={handleCheckout}
                disabled={loading}
                className="btn-cherry chrome-hover w-full py-4 text-sm font-heading flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>Place Order · ${total.toFixed(2)}</>
                )}
              </button>

              <p className="text-xs text-muted-foreground text-center mt-3">
                🔒 Secure checkout · 256-bit SSL encryption
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}