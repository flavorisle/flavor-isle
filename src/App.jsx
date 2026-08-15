import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { CartProvider } from '@/context/CartContext';
import { ThemeProvider } from 'next-themes';
import BottomTabBar from './components/BottomTabBar';
import MobileHeader from './components/MobileHeader';
import SmashieChat from './components/SmashieChat';
import { motion, AnimatePresence } from 'framer-motion';

// Page imports
import Home from './pages/Home';
import Menu from './pages/Menu';
import Checkout from './pages/Checkout';
import OrderConfirmation from './pages/OrderConfirmation';
import Contact from './pages/Contact';
import Account from './pages/Account';
import AdminDashboard from './pages/AdminDashboard';
import AdminMenu from './pages/AdminMenu';
import AdminMedia from './pages/AdminMedia';
import AdminPhoneOrders from './pages/AdminPhoneOrders';
import AdminCommunications from './pages/AdminCommunications';
import AccountNew from './pages/Account.jsx';
import Milkshakes from './pages/Milkshakes';
import MeetSmashie from './pages/MeetSmashie';
import KitchenStatus from './pages/KitchenStatus';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import FacebookAd from './pages/FacebookAd';
import Feedback from './pages/Feedback';
import Combos from './pages/Combos';
import DownloadApp from './pages/DownloadApp';
import Rewards from './pages/Rewards';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();

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
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, x: 8 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
      >
        <Routes location={location}>
      {/* Public — no login required */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<Home />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/facebook-ad" element={<FacebookAd />} />
      <Route path="/meet-smashie" element={<MeetSmashie />} />
      <Route path="/kitchen-status" element={<KitchenStatus />} />
      <Route path="/feedback" element={<Feedback />} />
      <Route path="/download" element={<DownloadApp />} />

      {/* Public — browse & order without an account */}
      <Route path="/menu" element={<Menu />} />
      <Route path="/combos" element={<Combos />} />
      <Route path="/milkshakes" element={<Milkshakes />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order-confirmation" element={<OrderConfirmation />} />

      {/* Login required to view account, rewards, or admin tools */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/account" element={<AccountNew />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/menu" element={<AdminMenu />} />
        <Route path="/admin/media" element={<AdminMedia />} />
        <Route path="/admin/phone-orders" element={<AdminPhoneOrders />} />
        <Route path="/admin/communications" element={<AdminCommunications />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
        </Routes>
      </motion.div>
    </AnimatePresence>
  );
};

function AppShell() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <CartProvider>
          <Router>
            <ScrollToTop />
            <AuthenticatedApp />
            <BottomTabBar />
            <MobileHeader />
            <SmashieChat />
          </Router>
          <Toaster />
        </CartProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <AppShell />
    </ThemeProvider>
  );
}

export default App;