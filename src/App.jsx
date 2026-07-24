import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { CartProvider } from '@/context/CartContext';

// Page imports
import Home from './pages/Home';
import Menu from './pages/Menu';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import About from './pages/About';
import Contact from './pages/Contact';
import Account from './pages/Account';
import AdminDashboard from './pages/AdminDashboard';
import AdminMenu from './pages/AdminMenu';
import AdminMedia from './pages/AdminMedia';
import AdminPhoneOrders from './pages/AdminPhoneOrders';
import AccountNew from './pages/Account.jsx';
import Milkshakes from './pages/Milkshakes';
import Promos from './pages/Promos';
import MeetSmashie from './pages/MeetSmashie';
import OrderStatus from './pages/OrderStatus';
import StoreLocator from './pages/StoreLocator';
import KitchenStatus from './pages/KitchenStatus';
import FAQ from './pages/FAQ';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: 'var(--midnight-cherry)' }}></div>
          <p className="font-heading text-obsidian-roast text-sm">Loading Flavor Isle…</p>
        </div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/menu" element={<Menu />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order-confirmation" element={<OrderConfirmation />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/account" element={<AccountNew />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/menu" element={<AdminMenu />} />
      <Route path="/admin/media" element={<AdminMedia />} />
      <Route path="/admin/phone-orders" element={<AdminPhoneOrders />} />
      <Route path="/milkshakes" element={<Milkshakes />} />
      <Route path="/promos" element={<Promos />} />
      <Route path="/meet-smashie" element={<MeetSmashie />} />
      <Route path="/order-status" element={<OrderStatus />} />
      <Route path="/store-locator" element={<StoreLocator />} />
      <Route path="/kitchen-status" element={<KitchenStatus />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <CartProvider>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
          </Router>
          <Toaster />
        </CartProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

export default App;