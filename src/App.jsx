import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { isKeepAliveTab } from '@/lib/keepAliveTabs';
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
import CaramelAppleBlissPopup from './components/CaramelAppleBlissPopup';
import TastyThreadsPopup from './components/TastyThreadsPopup';
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
import AdminPrintMenu from './pages/AdminPrintMenu';


import AdminOrders from './pages/AdminOrders';
import AdminCommunications from './pages/AdminCommunications';
import AccountNew from './pages/Account.jsx';
import Milkshakes from './pages/Milkshakes';
import MeetSmashie from './pages/MeetSmashie';
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
import SMSSignup from './pages/SMSSignup';
import BusynessGuide from './pages/BusynessGuide';
import Connect from './pages/Connect';
import Rewards from './pages/Rewards';
import Merch from './pages/Merch';
import Order from './pages/Order';
import MerchCheckout from './pages/MerchCheckout';
import MerchConfirmation from './pages/MerchConfirmation';
import AdminMerchCategories from './pages/AdminMerchCategories';
import AdminReviews from './pages/AdminReviews';
import { MerchCartProvider } from '@/context/MerchCartContext';
import MerchCartDrawer from '@/components/merch/MerchCartDrawer';
// Tasty Threads (Printful) merch store — storefront, checkout, confirmation, admin.

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();
  const location = useLocation();
  const scrollPositions = useRef({});

  // Save the scroll position of the active keep-alive tab as the user scrolls.
  useEffect(() => {
    const onSave = () => {
      if (isKeepAliveTab(location.pathname)) {
        scrollPositions.current[location.pathname] = window.scrollY;
      }
    };
    window.addEventListener('scroll', onSave, { passive: true });
    return () => window.removeEventListener('scroll', onSave);
  }, [location.pathname]);

  // Restore the saved scroll position when landing on a keep-alive tab.
  useEffect(() => {
    if (!isKeepAliveTab(location.pathname)) return;
    const saved = scrollPositions.current[location.pathname] ?? 0;
    const raf = requestAnimationFrame(() =>
      window.scrollTo({ top: saved, left: 0, behavior: 'instant' })
    );
    return () => cancelAnimationFrame(raf);
  }, [location.pathname]);

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

  const isTabPath = isKeepAliveTab(location.pathname);

  return (
    <>
      {/* Keep-alive bottom-tab routes: stay mounted, toggled with `hidden` so
          view state + scroll survive tab switches instead of remounting. */}
      <div className={location.pathname === '/' ? '' : 'hidden'} aria-hidden={location.pathname !== '/'}>
        <Home />
      </div>
      <div className={location.pathname === '/menu' ? '' : 'hidden'} aria-hidden={location.pathname !== '/menu'}>
        <Menu />
      </div>

      {/* All other routes mount/unmount normally with the page transition. */}
      {!isTabPath && (
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
      <Route path="/feedback" element={<Feedback />} />
      <Route path="/download" element={<DownloadApp />} />
      <Route path="/sms-signup" element={<SMSSignup />} />
      <Route path="/what-to-expect" element={<BusynessGuide />} />
      <Route path="/connect" element={<Connect />} />

      {/* Public — browse & order without an account */}
      <Route path="/menu" element={<Menu />} />
      <Route path="/order" element={<Order />} />
      <Route path="/combos" element={<Combos />} />
      <Route path="/milkshakes" element={<Milkshakes />} />
      <Route path="/merch" element={<Merch />} />
      <Route path="/merch-checkout" element={<MerchCheckout />} />
      <Route path="/merch-confirmation" element={<MerchConfirmation />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/order-confirmation" element={<OrderConfirmation />} />

      {/* Login required to view account, rewards, or admin tools */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/account" element={<AccountNew />} />
        <Route path="/rewards" element={<Rewards />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/menu" element={<AdminMenu />} />
        <Route path="/admin/print-menu" element={<AdminPrintMenu />} />

        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/merch-categories" element={<AdminMerchCategories />} />
        <Route path="/admin/communications" element={<AdminCommunications />} />
        <Route path="/admin/reviews" element={<AdminReviews />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
      )}
    </>
  );
};

function AppShell() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <CartProvider>
          <MerchCartProvider>
            <Router>
              <ScrollToTop />
              <AuthenticatedApp />
              <BottomTabBar />
              <MobileHeader />
              <SmashieChat />
              <CaramelAppleBlissPopup />
              <TastyThreadsPopup />
              <MerchCartDrawer />
            </Router>
            <Toaster />
          </MerchCartProvider>
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