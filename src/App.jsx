import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import { useEffect, useRef, lazy, Suspense } from 'react';
import { isKeepAliveTab } from '@/lib/keepAliveTabs';
import ProtectedRoute from '@/components/ProtectedRoute';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import ScrollToTop from './components/ScrollToTop';
import { CartProvider } from '@/context/CartContext';
import { ThemeProvider } from 'next-themes';
import BottomTabBar from './components/BottomTabBar';
import ConsentBanner from './components/ConsentBanner';
import MobileHeader from './components/MobileHeader';
import SmashieChat from './components/SmashieChat';

import { motion, AnimatePresence } from 'framer-motion';

// Page imports — keep-alive tabs (Home, Menu, Merch, Account) are eagerly
// imported so they stay mounted across tab switches. All other pages are
// lazy-loaded via React.lazy to shrink the initial bundle. The Suspense
// fallback in AuthenticatedApp matches the app loading screen so the
// lazy chunk download feels seamless.
import Home from './pages/Home';
import Menu from './pages/Menu';
import Merch from './pages/Merch';
import AccountNew from './pages/Account.jsx';

const Checkout = lazy(() => import('./pages/Checkout'));
const OrderConfirmation = lazy(() => import('./pages/OrderConfirmation'));
const Contact = lazy(() => import('./pages/Contact'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminMenu = lazy(() => import('./pages/AdminMenu'));
const AdminPrintMenu = lazy(() => import('./pages/AdminPrintMenu'));
const AdminOrders = lazy(() => import('./pages/AdminOrders'));
const AdminCommunications = lazy(() => import('./pages/AdminCommunications'));
const Milkshakes = lazy(() => import('./pages/Milkshakes'));
const MeetSmashie = lazy(() => import('./pages/MeetSmashie'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const FacebookAd = lazy(() => import('./pages/FacebookAd'));
const TastyThreadsAd = lazy(() => import('./pages/TastyThreadsAd'));
const Feedback = lazy(() => import('./pages/Feedback'));
const Reviews = lazy(() => import('./pages/Reviews'));
const Combos = lazy(() => import('./pages/Combos'));
const DownloadApp = lazy(() => import('./pages/DownloadApp'));
const SMSSignup = lazy(() => import('./pages/SMSSignup'));
const BusynessGuide = lazy(() => import('./pages/BusynessGuide'));
const Connect = lazy(() => import('./pages/Connect'));
const Gallery = lazy(() => import('./pages/Gallery'));
const FindSmashie = lazy(() => import('./pages/FindSmashie'));
const SocialReviews = lazy(() => import('./pages/SocialReviews'));
const OrderStatus = lazy(() => import('./pages/OrderStatus'));
const CommunityNews = lazy(() => import('./pages/CommunityNews'));
const Rewards = lazy(() => import('./pages/Rewards'));
const Order = lazy(() => import('./pages/Order'));
const MerchCheckout = lazy(() => import('./pages/MerchCheckout'));
const MerchConfirmation = lazy(() => import('./pages/MerchConfirmation'));
const AdminMerchCategories = lazy(() => import('./pages/AdminMerchCategories'));
const AdminReviews = lazy(() => import('./pages/AdminReviews'));
const AdminStoreSettings = lazy(() => import('./pages/AdminStoreSettings'));
const AdminEmails = lazy(() => import('./pages/AdminEmails'));
const AdminSquareLogs = lazy(() => import('./pages/AdminSquareLogs'));
const AdminKitchen = lazy(() => import('./pages/AdminKitchen'));
const AdminAnalytics = lazy(() => import('./pages/AdminAnalytics'));
const About = lazy(() => import('./pages/About'));
const Flyer = lazy(() => import('./pages/Flyer'));
const I65Exit38 = lazy(() => import('./pages/I65Exit38'));
const MammothCaveDining = lazy(() => import('./pages/MammothCaveDining'));
const CorvetteCarClubs = lazy(() => import('./pages/CorvetteCarClubs'));
import { MerchCartProvider } from '@/context/MerchCartContext';
import MerchCartDrawer from '@/components/merch/MerchCartDrawer';
import RestaurantSchema from './components/RestaurantSchema';
import CanonicalLink from './components/CanonicalLink';

// Suspense fallback — matches the app's initial loading screen so lazy
// page loads feel seamless rather than flashing a blank white page.
function LoadingFallback() {
  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ backgroundColor: 'var(--vanilla-malt)' }}>
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-midnight-cherry rounded-full animate-spin mx-auto mb-4" style={{ borderTopColor: 'var(--midnight-cherry)' }}></div>
        <p className="font-heading text-obsidian-roast text-sm">Loading Flavor Isle…</p>
      </div>
    </div>
  );
}
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
      <FindSmashieBanner />

      {/* Keep-alive bottom-tab routes: stay mounted, toggled with `hidden` so
          view state + scroll survive tab switches instead of remounting. */}
      <div className={location.pathname === '/' ? '' : 'hidden'} aria-hidden={location.pathname !== '/'}>
        <Home />
      </div>
      <div className={location.pathname === '/menu' ? '' : 'hidden'} aria-hidden={location.pathname !== '/menu'}>
        <Menu />
      </div>
      <div className={location.pathname === '/merch' ? '' : 'hidden'} aria-hidden={location.pathname !== '/merch'}>
        <Merch />
      </div>
      <div className={location.pathname === '/account' ? '' : 'hidden'} aria-hidden={location.pathname !== '/account'}>
        <AccountNew />
      </div>

      {/* All other routes mount/unmount normally with the page transition. */}
      {!isTabPath && (
        <Suspense fallback={<LoadingFallback />}>
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
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/find-smashie" element={<FindSmashie />} />
      <Route path="/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/terms-of-service" element={<TermsOfService />} />
      <Route path="/facebook-ad" element={<FacebookAd />} />
      <Route path="/tasty-threads-ad" element={<TastyThreadsAd />} />
      <Route path="/meet-smashie" element={<MeetSmashie />} />
      <Route path="/feedback" element={<Feedback />} />
      <Route path="/reviews" element={<Reviews />} />
      <Route path="/download" element={<DownloadApp />} />
      <Route path="/sms-signup" element={<SMSSignup />} />
      <Route path="/what-to-expect" element={<BusynessGuide />} />
      <Route path="/connect" element={<Connect />} />
      <Route path="/gallery" element={<Gallery />} />
      <Route path="/social-reviews" element={<SocialReviews />} />
      <Route path="/order-status" element={<OrderStatus />} />
      <Route path="/community-news" element={<CommunityNews />} />
      <Route path="/flyer" element={<Flyer />} />
      <Route path="/i65-exit-38" element={<I65Exit38 />} />
      <Route path="/mammoth-cave-dining" element={<MammothCaveDining />} />
      <Route path="/corvette-car-clubs" element={<CorvetteCarClubs />} />

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
      <Route path="/order-status" element={<OrderStatus />} />
      <Route path="/rewards" element={<Rewards />} />

      {/* Login required to view account or admin tools */}
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/login" replace />} />}>
        <Route path="/account" element={<AccountNew />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/admin/menu" element={<AdminMenu />} />
        <Route path="/admin/print-menu" element={<AdminPrintMenu />} />

        <Route path="/admin/orders" element={<AdminOrders />} />
        <Route path="/admin/merch-categories" element={<AdminMerchCategories />} />
        <Route path="/admin/communications" element={<AdminCommunications />} />
        <Route path="/admin/reviews" element={<AdminReviews />} />
        <Route path="/admin/emails" element={<AdminEmails />} />
        <Route path="/admin/square-logs" element={<AdminSquareLogs />} />
        <Route path="/admin/kitchen" element={<AdminKitchen />} />
        <Route path="/admin-analytics" element={<AdminAnalytics />} />
        <Route path="/admin/store-settings" element={<AdminStoreSettings />} />
      </Route>

      <Route path="*" element={<PageNotFound />} />
            </Routes>
          </motion.div>
        </AnimatePresence>
        </Suspense>
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
              <RestaurantSchema />
              <CanonicalLink />
              <AuthenticatedApp />
              <BottomTabBar />
              <MobileHeader />
              <ConsentBanner />
              <SmashieHunt />
              <SmashieChat />
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