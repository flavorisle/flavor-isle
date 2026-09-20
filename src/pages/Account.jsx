import React, { useState, useEffect, useRef } from 'react';
import { User, ShoppingBag, Phone, MapPin, Mail, Edit2, Save, X, Car, RotateCcw, ChevronDown, ChevronUp, LogOut, LogIn, Bell, Heart, Gift, Zap, TrendingUp, Trash2, AlertTriangle, ClipboardList, CreditCard, Cake } from 'lucide-react';
import OrderLookup from '@/components/OrderLookup';
import SavedCardsPanel from '@/components/account/SavedCardsPanel';
import { base44 } from '@/api/base44Client';
import { formatChicagoDate } from '@/lib/chicagoTime';
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter,
  AlertDialogTitle, AlertDialogDescription, AlertDialogAction, AlertDialogCancel
} from '@/components/ui/alert-dialog';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CartDrawer from '@/components/CartDrawer';
import OrderStatusTracker from '@/components/OrderStatusTracker';
import PushNotificationPrompt from '@/components/PushNotificationPrompt';
import LoyaltySummaryCard from '@/components/LoyaltySummaryCard';
import StarRewardsPanel from '@/components/StarRewardsPanel';
import { useCart } from '@/context/CartContext';
import { useAuth } from '@/lib/AuthContext';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import usePullToRefresh from '@/hooks/usePullToRefresh';
import PullRefreshIndicator from '@/components/PullRefreshIndicator';

const ACTIVE_STATUSES = ['pending', 'confirmed', 'preparing', 'ready'];

// Retry with exponential backoff on rate-limit errors. The account page fires
// several parallel entity calls on mount (and sub-components fire more), so a
// burst can trip the API rate limit; backing off lets the call succeed on a
// later attempt instead of crashing the whole view.
const withRateLimitRetry = async (fn, retries = 3) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const msg = `${err?.message || ''}`;
      const isRateLimit = /rate limit/i.test(msg) || err?.code === 'rate_limit_exceeded';
      if (!isRateLimit || attempt === retries - 1) throw err;
      await new Promise(r => setTimeout(r, 500 * Math.pow(2, attempt)));
    }
  }
};

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
              <span className={`text-sm px-2 py-0.5 rounded-full font-semibold ${statusColors[order.status] || 'bg-gray-100 text-gray-600'}`}>
                {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
              </span>
              {order.order_source === 'in_store' && <span className="text-sm px-2 py-0.5 rounded-full bg-patina-mint/10 text-patina-mint font-semibold">In-Store</span>}
              {isActive && <span className="text-sm px-2 py-0.5 rounded-full bg-midnight-cherry/10 text-midnight-cherry font-semibold">Live</span>}
            </div>
            <p className="text-sm text-muted-foreground">
              {formatChicagoDate(order.created_date, { month: 'short', day: 'numeric', year: 'numeric' })}
              {' · '}{order.order_source === 'in_store' ? 'In-Store' : order.order_type?.replace('_', ' ')}
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
            className="flex items-center gap-1.5 text-sm font-semibold text-patina-mint hover:text-teal-700 transition-colors tap-44"
          >
            <RotateCcw size={13} /> Reorder
          </button>
          <button
            onClick={() => setExpanded(e => !e)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-obsidian-roast transition-colors ml-auto tap-44"
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

const EMPTY_FORM = { 
  name: '', 
  phone: '', 
  address: '', 
  delivery_address: '', 
  curbside_address: '', 
  car_make: '', 
  car_model: '', 
  car_color: '',
  no_contact_delivery: false,
  preferred_communication: 'email',
  birthday: ''
};

// ── Logged-in account view ──
function LoggedInAccount({ user, logout }) {
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [orders, setOrders] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [starStatus, setStarStatus] = useState(null);
  const [starLoading, setStarLoading] = useState(false);
  // Read the ?tab= URL param (set by the Rewards "Add Phone" flow) so the user
  // lands directly on the relevant tab. Unknown/missing values fall back to
  // 'orders' exactly as before.
  const [searchParams] = useSearchParams();
  const VALID_TABS = ['orders', 'track', 'rewards', 'payments', 'favorites', 'profile'];
  const initialTab = (() => {
    const t = searchParams.get('tab');
    return t && VALID_TABS.includes(t) ? t : 'orders';
  })();
  // When arriving via /account?tab=profile (Rewards Add Phone), open the
  // profile editor immediately so the user can type their phone number.
  const fromProfileDeepLink = initialTab === 'profile';
  const [editing, setEditing] = useState(fromProfileDeepLink);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const phoneInputRef = useRef(null);

  // Focus + scroll the Phone field into view once the profile tab renders
  // after the Add Phone deep link (loading must clear first).
  useEffect(() => {
    if (fromProfileDeepLink && editing && !loading && phoneInputRef.current) {
      phoneInputRef.current.focus();
      phoneInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [fromProfileDeepLink, editing, loading]);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteStep, setDeleteStep] = useState(1);
  const [deleting, setDeleting] = useState(false);
  const { addItem, setOrderType, setIsCartOpen } = useCart();

  const refreshStarStatus = async () => {
    setStarLoading(true);
    try {
      // The backend reads the phone from the saved CustomerProfile (phone is
      // the primary key for Square loyalty), so this re-sync surfaces the
      // customer's star progress immediately after they add/update it.
      const res = await base44.functions.invoke('squareLoyalty', { action: 'status' });
      setStarStatus(res.data);
    } catch (e) {
      setStarStatus(null);
    } finally {
      setStarLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    setStarLoading(true);
    try {
      const results = await Promise.all([
        withRateLimitRetry(() => base44.entities.CustomerProfile.filter({ email: user.email })),
        withRateLimitRetry(() => base44.entities.Order.filter({ customer_email: user.email })),
        withRateLimitRetry(() => base44.entities.Favorite.filter({ user_id: user.id })),
      ]);
      const [profiles, ords, favs] = results;
      if (profiles && profiles.length > 0) {
        const p = profiles[0];
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
          no_contact_delivery: p.no_contact_delivery || false,
          preferred_communication: p.preferred_communication || 'email',
          birthday: p.birthday || ''
        });
      } else {
        const newProfile = await withRateLimitRetry(() => base44.entities.CustomerProfile.create({ name: user.full_name || '', email: user.email, total_orders: 0, total_spent: 0 }));
        setProfile(newProfile);
        setForm({ ...EMPTY_FORM, name: user.full_name || '' });
      }
      setOrders(ords || []);
      setFavorites(favs || []);
      await refreshStarStatus();
    } catch (err) {
      // A rate limit or transient API error shouldn't crash the whole account
      // page — surface empty state so the user still sees the page and can
      // retry by re-visiting.
      console.error('Account loadData failed:', err);
      setOrders([]);
      setFavorites([]);
    } finally {
      setLoading(false);
      setStarLoading(false);
    }
  };

  const loadedOnceRef = useRef(false);
  useEffect(() => {
    // StrictMode double-invokes effects in dev, which fired this burst of
    // calls twice and tripped the rate limit. Guard so loadData runs once
    // per mount; a real account switch re-mounts the component (new ref).
    if (loadedOnceRef.current) return;
    loadedOnceRef.current = true;
    loadData();
  }, [user.email, user.id]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      await base44.entities.CustomerProfile.update(profile.id, form);
      setProfile(p => ({ ...p, ...form }));
      setEditing(false);
      // Push name + phone to the Square customer directory so the online
      // account and the in-store POS customer stay in sync. Fire-and-forget
      // after the profile save so the UI stays responsive — a Square failure
      // shouldn't block the local profile update.
      base44.functions.invoke('syncCustomerToSquare', {
        full_name: form.name,
        phone: form.phone,
      }).catch((e) => console.error('Square customer sync failed:', e));
      // Re-sync Star Rewards whenever the profile changes — phone is what
      // links the online account to the in-store Square loyalty program, so
      // adding/updating it should surface the customer's star progress live.
      await refreshStarStatus();
    } finally {
      setSaving(false);
    }
  };

  const handleReorder = (order) => {
    if (!order.items || order.items.length === 0) return;
    order.items.forEach(item => {
      // Rebuild each line fresh: respect the original quantity and drop stale
      // group-order person tags from the past order.
      const { quantity, person_id, person_name, ...rest } = item;
      for (let n = 0; n < (quantity || 1); n++) addItem(rest);
    });
    if (order.order_type) setOrderType(order.order_type);
    setIsCartOpen(true);
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await base44.functions.invoke('deleteMyAccount', {});
      // Clear local state, then log out (which redirects server-side).
      logout();
    } catch (err) {
      console.error('Account deletion failed:', err);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
      </div>
    );
  }

  const activeOrders = orders.filter(o => ACTIVE_STATUSES.includes(o.status));
  const pastOrders = orders.filter(o => !ACTIVE_STATUSES.includes(o.status));

  const personalFields = [
    { label: 'Full Name', key: 'name', icon: User, placeholder: 'Jane Smith' },
    { label: 'Phone', key: 'phone', icon: Phone, placeholder: '(270) 555-0000', type: 'tel' },
    { label: 'Birthday', key: 'birthday', icon: Cake, type: 'date', format: (v) => v ? new Date(v + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric' }) : null },
    { label: 'Billing Address', key: 'address', icon: MapPin, placeholder: '123 Main St, City, KY' },
  ];

  const deliveryFields = [
    { label: 'Delivery Address', key: 'delivery_address', icon: MapPin, placeholder: 'Delivery address if different' },
  ];

  const pickupFields = [
    { label: 'Curbside Pickup Spot', key: 'curbside_address', icon: MapPin, placeholder: 'e.g. Spot #3, parking lot' },
    { label: 'Car Make', key: 'car_make', icon: Car, placeholder: 'Toyota' },
    { label: 'Car Model', key: 'car_model', icon: Car, placeholder: 'Camry' },
    { label: 'Car Color', key: 'car_color', icon: Car, placeholder: 'Silver' },
  ];

  return (
    <>
      {/* Header */}
      <div className="bg-obsidian-roast py-14 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <div className="w-16 h-16 bg-midnight-cherry rounded-full flex items-center justify-center flex-shrink-0">
            <User size={28} className="text-white" />
          </div>
          <div className="flex-1">
            <h1 className="font-heading text-3xl text-white">{profile?.name || user.full_name || 'Welcome!'}</h1>
            <p className="text-gray-400 text-sm">{user.email}</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="font-heading text-2xl text-white">{orders.length}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Orders</p>
            </div>
            <div className="text-center">
              <p className="font-heading text-2xl text-midnight-cherry">${orders.reduce((s, o) => s + (o.total || 0), 0).toFixed(2)}</p>
              <p className="text-xs text-gray-400 uppercase tracking-wider">Spent</p>
            </div>
            <button onClick={() => logout()} className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors border border-white/20 px-4 py-2 rounded-xl">
              <LogOut size={14} /> Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-border bg-white sticky top-[88px] z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex gap-0 overflow-x-auto scrollbar-hide">
          {[
            { key: 'orders', label: 'My Orders', icon: ShoppingBag },
            { key: 'track', label: 'Track Order', icon: ClipboardList },
            { key: 'favorites', label: 'Favorites', icon: Heart },
            { key: 'rewards', label: 'Rewards', icon: Gift },
            { key: 'payments', label: 'Payment Methods', icon: CreditCard },
            { key: 'profile', label: 'Profile & Preferences', icon: User },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 px-5 sm:px-6 py-4 text-sm font-heading border-b-2 transition-colors flex-shrink-0 whitespace-nowrap ${tab === key ? 'border-midnight-cherry text-midnight-cherry' : 'border-transparent text-muted-foreground hover:text-obsidian-roast'}`}
            >
              <Icon size={16} /> {label}
              {key === 'orders' && activeOrders.length > 0 && (
                <span className="ml-1 bg-midnight-cherry text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-heading">{activeOrders.length}</span>
              )}
              {key === 'favorites' && favorites.length > 0 && (
                <span className="ml-1 bg-midnight-cherry text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-heading">{favorites.length}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        {tab === 'orders' && (
          <LoyaltySummaryCard status={starStatus} loading={starLoading} onOpenRewards={() => navigate('/rewards')} />
        )}

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
                      {activeOrders.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(o => <OrderCard key={o.id} order={o} onReorder={handleReorder} />)}
                    </div>
                  </div>
                )}
                {pastOrders.length > 0 && (
                  <div>
                    <h2 className="font-heading text-lg text-obsidian-roast mb-4">Past Orders</h2>
                    <div className="space-y-4">
                      {pastOrders.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(o => <OrderCard key={o.id} order={o} onReorder={handleReorder} />)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {tab === 'track' && (
          <div>
            <div className="text-center mb-8">
              <h2 className="font-heading text-3xl text-obsidian-roast mb-2">Track an Order</h2>
              <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                Drop in your order number to see if it's still sizzling or ready to roll — real-time, no guessing.
              </p>
            </div>
            <OrderLookup />
          </div>
        )}

        {tab === 'rewards' && (
          <StarRewardsPanel status={starStatus} loading={starLoading} onAddPhone={() => setTab('profile')} />
        )}

        {tab === 'payments' && (
          <div className="max-w-2xl">
            <SavedCardsPanel />
          </div>
        )}

        {tab === 'favorites' && (
          <div className="space-y-6">
            {favorites.length === 0 ? (
              <div className="text-center py-20">
                <Heart size={48} strokeWidth={1} className="mx-auto mb-4 text-muted-foreground" />
                <p className="font-heading text-lg text-obsidian-roast mb-2">No favorites yet</p>
                <p className="text-sm text-muted-foreground mb-4">Save your favorite menu items for quick reordering</p>
                <Link to="/menu" className="btn-cherry chrome-hover px-8 py-3 text-sm font-heading inline-block">Browse Menu</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map(fav => (
                  <div key={fav.id} className="card-diner overflow-hidden">
                    {fav.menu_item_image && (
                      <div className="h-40 overflow-hidden bg-gray-100">
                        <img src={fav.menu_item_image} alt={fav.menu_item_name} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h3 className="font-heading text-base text-obsidian-roast">{fav.menu_item_name}</h3>
                        <span className="text-midnight-cherry font-heading text-lg flex-shrink-0">${fav.menu_item_price?.toFixed(2)}</span>
                      </div>
                      {fav.menu_item_category && (
                        <p className="text-xs text-muted-foreground mb-3">{fav.menu_item_category}</p>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            addItem({ id: fav.menu_item_id, name: fav.menu_item_name, price: fav.menu_item_price, image_url: fav.menu_item_image });
                            setIsCartOpen(true);
                          }}
                          className="flex-1 btn-cherry chrome-hover py-3 text-sm font-heading rounded-xl"
                        >
                          Add to Order
                        </button>
                        <button
                          onClick={async () => {
                            await base44.entities.Favorite.delete(fav.id);
                            setFavorites(f => f.filter(x => x.id !== fav.id));
                          }}
                          className="px-4 py-3 bg-muted text-muted-foreground hover:bg-destructive hover:text-white rounded-xl transition-colors text-sm font-heading"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'profile' && (
          <div className="max-w-2xl space-y-6">
            {/* Top action bar */}
            <div className="flex items-center justify-between">
              {!editing ? (
                <button onClick={() => setEditing(true)} className="flex items-center gap-1.5 text-sm text-patina-mint hover:text-teal-700 font-semibold transition-colors tap-44">
                  <Edit2 size={14} /> Edit Profile
                </button>
              ) : (
                <div className="flex gap-2">
                  <button onClick={() => setEditing(false)} className="p-1.5 hover:bg-muted rounded-full transition-colors tap-44"><X size={16} /></button>
                  <button onClick={saveProfile} disabled={saving} className="flex items-center gap-1.5 text-sm btn-cherry px-4 py-1.5 font-heading disabled:opacity-60">
                    <Save size={14} /> {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              )}
            </div>

            {/* Sign out — always visible here, since the header button is tight on mobile */}
            <div className="card-diner p-6 flex items-center justify-between gap-4">
              <div>
                <h3 className="font-heading text-lg text-obsidian-roast mb-1">Sign Out</h3>
                <p className="text-sm text-muted-foreground">Log out of your Flavor Isle account on this device.</p>
              </div>
              <button
                onClick={() => logout()}
                className="btn-mint chrome-hover flex items-center gap-2 px-5 py-3 text-sm tap-44 flex-shrink-0"
              >
                <LogOut size={16} /> Sign Out
              </button>
            </div>

            {/* Danger Zone — account deletion (App Store requirement) */}
            <div className="rounded-2xl border-2 border-red-200 bg-red-50/50 p-6">
              <h3 className="font-heading text-lg text-obsidian-roast mb-1">Delete Account</h3>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                Permanently erase your Flavor Isle account, profile, favorites, rewards, and order history. This cannot be undone.
              </p>
              <button
                onClick={() => { setDeleteStep(1); setDeleteOpen(true); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-heading hover:bg-red-700 transition-colors tap-44"
              >
                <Trash2 size={16} /> Delete Account
              </button>
            </div>

            {/* Personal Information */}
            <div className="card-diner p-6">
              <h3 className="font-heading text-lg text-obsidian-roast mb-4">Personal Information</h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><Mail size={15} className="text-midnight-cherry" /></div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email</p>
                    <p className="text-sm text-obsidian-roast">{user.email}</p>
                  </div>
                </div>
                {personalFields.map(({ label, key, icon: Icon, placeholder, type, format }) => (
                  <div key={key} className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><Icon size={15} className="text-midnight-cherry" /></div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                      {editing ? (
                        <input ref={key === 'phone' ? phoneInputRef : undefined} type={type || 'text'} value={form[key] || ''} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                      ) : (
                        <p className="text-sm text-obsidian-roast">{(format ? format(profile?.[key]) : profile?.[key]) || <span className="text-muted-foreground italic">Not set</span>}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Delivery Preferences */}
            <div className="card-diner p-6">
              <h3 className="font-heading text-lg text-obsidian-roast mb-4">Delivery Preferences</h3>
              <div className="space-y-4">
                {deliveryFields.map(({ label, key, icon: Icon, placeholder, type }) => (
                  <div key={key} className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><Icon size={15} className="text-midnight-cherry" /></div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                      {editing ? (
                        <input type={type || 'text'} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                      ) : (
                        <p className="text-sm text-obsidian-roast">{profile?.[key] || <span className="text-muted-foreground italic">Not set</span>}</p>
                      )}
                    </div>
                  </div>
                ))}
                {editing && (
                  <div className="flex items-start gap-3 pt-2">
                    <div className="w-9 h-9 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><Bell size={15} className="text-midnight-cherry" /></div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">No-Contact Delivery</p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={form.no_contact_delivery} onChange={e => setForm(f => ({ ...f, no_contact_delivery: e.target.checked }))} className="w-4 h-4 rounded accent-midnight-cherry" />
                        <span className="text-sm text-obsidian-roast">Leave delivery at door, no signature required</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pickup Preferences */}
            <div className="card-diner p-6">
              <h3 className="font-heading text-lg text-obsidian-roast mb-4">Pickup Preferences</h3>
              <div className="space-y-4">
                {pickupFields.map(({ label, key, icon: Icon, placeholder, type }) => (
                  <div key={key} className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><Icon size={15} className="text-midnight-cherry" /></div>
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                      {editing ? (
                        <input type={type || 'text'} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder} className="w-full px-3 py-2 bg-muted border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
                      ) : (
                        <p className="text-sm text-obsidian-roast">{profile?.[key] || <span className="text-muted-foreground italic">Not set</span>}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Communication Preferences */}
            <div className="card-diner p-6">
              <h3 className="font-heading text-lg text-obsidian-roast mb-4">Communication Preferences</h3>
              {editing ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Preferred Contact Method</p>
                    <div className="space-y-2">
                      {['email', 'phone', 'sms'].map(method => (
                        <label key={method} className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="radio" 
                            name="communication" 
                            value={method} 
                            checked={form.preferred_communication === method}
                            onChange={e => setForm(f => ({ ...f, preferred_communication: e.target.value }))}
                            className="w-4 h-4 accent-midnight-cherry"
                          />
                          <span className="text-sm text-obsidian-roast capitalize">{method}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-midnight-cherry/10 rounded-full flex items-center justify-center flex-shrink-0 mt-1"><Bell size={15} className="text-midnight-cherry" /></div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Preferred Contact Method</p>
                    <p className="text-sm text-obsidian-roast capitalize">{form.preferred_communication || 'email'}</p>
                  </div>
                </div>
              )}
            </div>

            <PushNotificationPrompt />
          </div>
        )}
      </div>

      {/* Delete account — double confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={(o) => { setDeleteOpen(o); if (!o) setDeleteStep(1); }}>
        <AlertDialogContent className="max-w-md">
          {deleteStep === 1 ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-obsidian-roast">
                  <AlertTriangle size={18} className="text-red-600" /> Delete your account?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This permanently removes your profile, favorites, loyalty points, and order history from Flavor Isle. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="tap-44">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => setDeleteStep(2)}
                  className="bg-red-600 text-white hover:bg-red-700 tap-44"
                >
                  Continue
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-obsidian-roast">
                  <AlertTriangle size={18} className="text-red-600" /> Are you absolutely sure?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This is your final warning. Tap <strong>Delete Forever</strong> to permanently erase your Flavor Isle account and all its data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting} className="tap-44">Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAccount}
                  disabled={deleting}
                  className="bg-red-600 text-white hover:bg-red-700 tap-44 disabled:opacity-60"
                >
                  {deleting ? 'Deleting…' : 'Delete Forever'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ── Guest login/register ──
function GuestAuth({ onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [step, setStep] = useState('form'); // 'form' | 'otp'
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await base44.auth.loginViaEmailPassword(email, password);
        window.location.href = '/account';
      } else {
        await base44.auth.register({ email, password, full_name: name });
        setStep('otp');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { access_token } = await base44.auth.verifyOtp({ email, otpCode });
      base44.auth.setToken(access_token);
      window.location.href = '/account';
    } catch (err) {
      setError(err.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="max-w-md mx-auto py-24 px-4">
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">📬</div>
          <h2 className="font-heading text-2xl text-obsidian-roast mb-2">Check Your Email</h2>
          <p className="text-muted-foreground text-sm">We sent a verification code to <strong>{email}</strong></p>
        </div>
        <form onSubmit={handleVerifyOtp} className="card-diner p-8 space-y-4">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Verification Code</label>
            <input type="text" value={otpCode} onChange={e => setOtpCode(e.target.value)} placeholder="123456" className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 text-center text-lg font-heading tracking-widest" maxLength={6} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button type="submit" disabled={loading} className="btn-cherry chrome-hover w-full py-4 text-sm font-heading disabled:opacity-60">{loading ? 'Verifying…' : 'Verify & Sign In'}</button>
          <button type="button" onClick={() => base44.auth.resendOtp(email)} className="w-full text-center text-xs text-muted-foreground hover:text-obsidian-roast transition-colors">Resend code</button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto py-24 px-4">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-midnight-cherry/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <User size={36} className="text-midnight-cherry" />
        </div>
        <h1 className="font-heading text-3xl text-obsidian-roast mb-2">My Account</h1>
        <p className="text-muted-foreground text-sm">Sign in to track orders, save preferences, and reorder your favorites.</p>
      </div>

      {/* Toggle */}
      <div className="flex bg-muted rounded-2xl p-1 mb-6">
        <button onClick={() => setMode('login')} className={`flex-1 py-2.5 rounded-xl text-sm font-heading transition-all ${mode === 'login' ? 'bg-white shadow-float text-obsidian-roast' : 'text-muted-foreground'}`}>Sign In</button>
        <button onClick={() => setMode('register')} className={`flex-1 py-2.5 rounded-xl text-sm font-heading transition-all ${mode === 'register' ? 'bg-white shadow-float text-obsidian-roast' : 'text-muted-foreground'}`}>Create Account</button>
      </div>

      <form onSubmit={handleSubmit} className="card-diner p-8 space-y-4">
        {mode === 'register' && (
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Full Name</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" required className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
          </div>
        )}
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Email Address</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@example.com" required className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
        </div>
        <div>
          <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1.5 block">Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="w-full px-4 py-3 bg-muted border border-border rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-midnight-cherry/30 focus:border-midnight-cherry" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <button type="submit" disabled={loading} className="btn-cherry chrome-hover w-full py-4 text-sm font-heading disabled:opacity-60">
          {loading ? (mode === 'login' ? 'Signing in…' : 'Creating account…') : (mode === 'login' ? 'Sign In' : 'Create Account')}
        </button>
        {mode === 'login' && (
          <Link to="/forgot-password" className="block text-center text-xs text-muted-foreground hover:text-midnight-cherry transition-colors">Forgot password?</Link>
        )}
      </form>

      {/* Google */}
      <div className="mt-4">
        <div className="relative flex items-center my-4">
          <div className="flex-1 border-t border-border" />
          <span className="px-3 text-xs text-muted-foreground">or</span>
          <div className="flex-1 border-t border-border" />
        </div>
        <button
          onClick={() => base44.auth.loginWithProvider('google', window.location.href)}
          className="w-full flex items-center justify-center gap-3 px-4 py-3 border-2 border-border rounded-2xl text-sm font-heading text-obsidian-roast hover:border-midnight-cherry/40 transition-colors"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>
      </div>
    </div>
  );
}

export default function Account() {
  const { user, isLoadingAuth, logout } = useAuth();
  const { pull, refreshing } = usePullToRefresh(() => window.location.reload());

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <PullRefreshIndicator pull={pull} refreshing={refreshing} />
      <Navbar />
      <CartDrawer />

      {isLoadingAuth ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin" style={{ borderTopColor: 'var(--midnight-cherry)' }} />
        </div>
      ) : user ? (
        <LoggedInAccount user={user} logout={logout} />
      ) : (
        <div>
          {/* Order tracking — available to everyone, no sign-in needed */}
          <div className="bg-patina-mint/5 border-b border-border">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
              <div className="text-center mb-8">
                <p className="text-midnight-cherry text-sm font-heading uppercase tracking-widest mb-2">Track Your Order</p>
                <h2 className="font-heading text-4xl text-obsidian-roast mb-3">Where's My Food?</h2>
                <p className="text-muted-foreground font-body max-w-lg mx-auto">
                  Drop in your order number and we'll tell you if it's still sizzling or ready to roll.
                </p>
              </div>
              <OrderLookup />
            </div>
          </div>
          <GuestAuth />
        </div>
      )}

      <Footer />
    </div>
  );
}