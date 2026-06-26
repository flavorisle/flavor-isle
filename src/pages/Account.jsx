import React, { useState } from 'react';
import { User, ShoppingBag, Phone, MapPin, Mail, Edit2, Save, X, Car, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import OrderStatusTracker from '@/components/OrderStatusTracker';
import { useCart } from '@/context/CartContext';
import { Link } from 'react-router-dom';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];

function OrderCard({ order, onReorder }) {
  const [expanded, setExpanded] = useState(ACTIVE_STATUSES.includes(order.status));
  const isActive = ACTIVE_STATUSES.includes(order.status);

  const statusColors = {
    pending: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-blue-100 text-blue-700',
    preparing: 'bg-orange-100 text-orange-700',
    ready: 'bg-green-100 text-green-700',
    delivered: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-600',
  };

  return (
    <div className={`card-diner overflow-hidden ${isActive ? 'ring-2 ring-midnight-cherry/30' : ''}`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="font-heading text-sm text-obsidian-roast">Order #{order.order_number || order.id?.slice(-6).toUpperCase()}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
              </span>
              {isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-midnight-cherry/10 text-midnight-cherry font-semibold">Live</span>}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Date(order.created_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              {' · '}{order.order_type?.replace('_', ' ')}
              {' · '}{(order.items || []).length} item{order.items?.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-heading text-midnight-cherry text-lg">${order.total?.toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => onReorder(order)}
            className="flex items-center gap-1.5 text-xs font-semibold text-patina-mint hover:text-teal-700 transition-colors"
          >
            <RotateCcw size={13} /> Reorder
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-obsidian-roast transition-colors ml-auto"
          >
            {expanded ? <><ChevronUp size={14} /> Hide details</> : <><ChevronDown size={14} /> Track order</>}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-5 pb-5">
          <OrderStatusTracker order={order} />
          {(order.items || []).length > 0 && (
            <div className="mt-4 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Items</p>
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm text-obsidian-roast">
                  <span>{item.quantity || 1}× {item.name}</span>
                  <span className="text-muted-foreground">${((item.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const EMPTY_FORM = { name: '', phone: '', address: '', delivery_address: '', curbside_address: '', car_make: '', car_model: '', car_color: '' };

export default function Account() {
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [email, setEmail] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('orders');
  const [lookupDone, setLookupDone] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const { addItem, setOrderType, setIsCartOpen } = useCart();

  const lookup = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    const results = await base44.entities.CustomerProfile.filter({ email: email.trim().toLowerCase() });
    if (results && results.length > 0) {
      const p = results[0];
      setProfile(p);
      setForm({
        name: p.name || '',
        phone: p.phone || '',
        address: p.address || '',
        delivery_address: p.delivery_address || '',
        curbside_address: p.curbside_address || '',
        car_make: p.car_make || '',
        car_model: p.car_model || '',
        car_color: p.car_color || '',
      });
      const ords = await base44.entities.Order.filter({ customer_email: email.trim().toLowerCase() });
      setOrders(ords || []);
      setNotFound(false);
    } else {
      setNotFound(true);
    }
    setLookupDone(true);
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await base44.entities.CustomerProfile.update(profile.id, form);
      setProfile(p => ({ ...p, ...form }));
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = (order) => {
    if (!order.items || order.items.length === 0) return;
    order.items.forEach(item => addItem(item));
    if (order.order_type) setOrderType(order.order_type);
    setIsCartOpen(true);
  };

  if (!profile) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
        <Navbar />
        <CartDrawer />
        <div className="max-w-lg mx-auto py-24 px-4">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-midnight-cherry/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={36} className="text-midnight-cherry" />
            </div>
            <h1 className="font-heading text-3xl text-obsidian-roast mb-2">My Account</h1>
            <p className="text-muted-foreground text-sm">Enter your email to view your orders and profile.</p>
          </div>
          <form onSubmit={lookup} className="card-diner p-8 space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
              />
            </div>
            {lookupDone && notFound && (
              <p className="text-sm text-muted-foreground">No account found. <Link to="/menu" className="text-midnight-cherry font-semibold">Place your first order</Link> to create one!</p>
            )}
            <button type="submit" className="btn-cherry chrome-hover w-full py-4 text-sm font-heading">
              Look Up My Account
            </button>
          </form>
        </div>
        <Footer />
      </div>
    );
  }

  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const pastOrders = orders.filter(o => !ACTIVE_STATUSES.includes(o.status));

  const profileFields = [
    { label: 'Full Name', key: 'name', icon: User, placeholder: 'Jane Smith' },
    { label: 'Phone', key: 'phone', icon: Phone, placeholder: '(270) 555-0000', type: 'tel' },
    { label: 'Home / Billing Address', key: 'address', icon: MapPin, placeholder: '123 Main St, City, KY' },
    { label: 'Delivery Address', key: 'delivery_address', icon: MapPin, placeholder: 'Delivery address if different' },
    { label: 'Curbside Pickup Address / Spot', key: 'curbside_address', icon: MapPin, placeholder: 'e.g. Spot #3, parking lot' },
    { label: 'Car Make', key: 'car_make', icon: Car, placeholder: 'Toyota' },
    { label: 'Car Model', key: 'car_model', icon: Car, placeholder: 'Camry' },
    { label: 'Car Color', key: 'car_color', icon: Car, placeholder: 'Silver' },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <Navbar />
      <CartDrawer />

      {/* Header */}
      <div className="bg-obsidian-roast py-14 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-16 h-16 bg-midnight-cherry rounded-full flex items-center justify-center flex-shrink-0">
            <User size={28} className="text-white" />
          </div>
          <div>
            <h1 className="font-heading text-3xl text-white">{profile.name}</h1>
            <p className="text-gray-400 text-sm">{profile.email}</p>
          </div>
          <div className="sm:ml-auto flex gap-6 text-center">
            <div>
              <p className="font-heading text-2xl text-white">{profile.total_orders || orders.length}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Orders</p>
            </div>
            <div>
              <p className="font-heading text-2xl text-midnight-cherry">${(profile.total_spent || orders.reduce((s, o) => s + (o.total || 0), 0)).toFixed(2)}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Spent</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-white sticky top-[88px] z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-0">
          {[
            { key: 'orders', label: 'My Orders', icon: ShoppingBag },
            { key: 'profile', label: 'Profile & Preferences', icon: User },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-heading border-b-2 transition-colors ${
                tab === key
                  ? 'border-midnight-cherry text-midnight-cherry'
                  : 'border-transparent text-muted-foreground hover:text-obsidian-roast'
              }`}
            >
              <Icon size={16} /> {label}
              {key === 'orders' && activeOrders.length > 0 && (
                <span className="ml-1 bg-midnight-cherry text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-heading">
                  {activeOrders.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {/* Orders Tab */}
        {tab === 'orders' && (
          <div className="space-y-6">
            {orders.length === 0 ? (
              <div className="text-center py-20">
                <ShoppingBag size={48} strokeWidth={1} className="mx-auto mb-4 text-muted-foreground" />
                <p className="font-heading text-lg text-obsidian-roast mb-2">No orders yet</p>
                <Link to="/menu" className="btn-cherry chrome-hover px-8 py-3 text-sm font-heading inline-block mt-2">Order Now</Link>
              </div>
            ) : (
              <>
                {activeOrders.length > 0 && (
                  <div>
                    <h2 className="font-heading text-lg text-obsidian-roast mb-4">Active Orders</h2>
                    <div className="space-y-4">
                      {activeOrders
                        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                        .map(o => <OrderCard key={o.id} order={o} onReorder={handleReorder} />)}
                    </div>
                  </div>
                )}
                {pastOrders.length > 0 && (
                  <div>
                    <h2 className="font-heading text-lg text-obsidian-roast mb-4">Past Orders</h2>
                    <div className="space-y-4">
                      {pastOrders
                        .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
                        .map(o => <OrderCard key={o.id} order={o} onReorder={handleReorder} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Profile Tab */}
        {tab === 'profile' && (
          <div className="max-w-lg space-y-6">
            <div className="card-diner p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-heading text-lg text-obsidian-roast">Personal Info & Preferences</h2>
                {!editing ? (
                  <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm text-patina-mint hover:text-teal-700 font-semibold transition-colors">
                    <Edit2 size={14} /> Edit
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => { setEditing(false); }} className="p-1.5 hover:bg-muted rounded-full transition-colors">
                      <X size={16} />
                    </button>
                    <button onClick={saveProfile} disabled={saving} className="flex items-center gap-1.5 text-sm btn-cherry px-4 py-1.5 font-heading disabled:opacity-60">
                      <Save size={14} /> {saving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {/* Email (read-only) */}
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Mail size={15} className="text-midnight-cherry" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                    <p className="text-sm text-obsidian-roast">{profile.email}</p>
                  </div>
                </div>

                {profileFields.map(({ label, key, icon: Icon, placeholder, type }) => (
                  <div key={key} className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                      <Icon size={15} className="text-midnight-cherry" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                      {editing ? (
                        <input
                          type={type || 'text'}
                          value={form[key]}
                          onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                          placeholder={placeholder}
                          className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry"
                        />
                      ) : (
                        <p className="text-sm text-obsidian-roast">
                          {profile[key] || <span className="text-muted-foreground italic">Not set</span>}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {/* Car summary when not editing */}
                {!editing && (profile.car_make || profile.car_model || profile.car_color) && (
                  <div className="mt-2 p-3 bg-midnight-cherry/5 rounded-2xl text-sm text-obsidian-roast">
                    <span className="font-semibold">Your car: </span>
                    {[profile.car_color, profile.car_make, profile.car_model].filter(Boolean).join(' ')}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}