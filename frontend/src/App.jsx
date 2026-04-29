import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HelmetProvider } from 'react-helmet-async';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { DeliveryConfigProvider } from './context/DeliveryConfigContext';
import { CurrencyProvider } from './components/CurrencyToggle';
import Header from './components/Header';
import Footer from './components/Footer';
import CosmosBackground from './components/CosmosBackground';
import ErrorBoundary from './components/ErrorBoundary';
import Breadcrumbs from './components/Breadcrumbs';
import AppSidebar from './components/AppSidebar';

// Sidebars contextuelles (lazy pour ne pas alourdir le bundle initial)
const CatalogSidebar = lazy(() => import('./components/sidebar/content/CatalogSidebar'));
const BookDetailSidebar = lazy(() => import('./components/sidebar/content/BookDetailSidebar'));
const SocialSidebar = lazy(() => import('./components/sidebar/content/SocialSidebar'));
const AuthorsSidebar = lazy(() => import('./components/sidebar/content/AuthorsSidebar'));
const UserSidebar = lazy(() => import('./components/sidebar/content/UserSidebar'));
const ConnectSidebar = lazy(() => import('./components/sidebar/content/ConnectSidebar'));
const ShopSidebar = lazy(() => import('./components/sidebar/content/ShopSidebar'));
const AuthSidebar = lazy(() => import('./components/sidebar/content/AuthSidebar'));
const LegalSidebar = lazy(() => import('./components/sidebar/content/LegalSidebar'));
import SessionTimeoutWarning from './components/SessionTimeoutWarning';
import OnboardingModal from './components/OnboardingModal';
import { Toaster } from 'react-hot-toast';
import PushRegistrar from './components/PushRegistrar';
import ChatbotWidget from './components/ChatbotWidget';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,      // 5 min avant re-fetch
      gcTime: 10 * 60 * 1000,         // 10 min en cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Home chargée en synchrone (page d'atterrissage critique)
import Home from './pages/Home';

// Composants layout/protection chargés en synchrone (utilisés par plusieurs routes)
import ProtectedRoute from './components/ProtectedRoute';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';

// Toutes les autres pages en lazy loading (code splitting)
const Search = lazy(() => import('./pages/Search'));
const Catalog = lazy(() => import('./pages/Catalog'));
const BookDetail = lazy(() => import('./pages/BookDetail'));
const BookReader = lazy(() => import('./pages/BookReader'));
const Cart = lazy(() => import('./pages/Cart'));
const Checkout = lazy(() => import('./pages/Checkout'));
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'));
const SubmitManuscript = lazy(() => import('./pages/SubmitManuscript'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
// Profile.jsx supprimé (phase 2 refonte) — redirect via ProfileRedirect
const Authors = lazy(() => import('./pages/Authors'));
const About = lazy(() => import('./pages/About'));
const Contact = lazy(() => import('./pages/Contact'));
const Delivery = lazy(() => import('./pages/Delivery'));
const Privacy = lazy(() => import('./pages/Privacy'));
const CGV = lazy(() => import('./pages/CGV'));
const FAQ = lazy(() => import('./pages/FAQ'));
const Support = lazy(() => import('./pages/Support'));
const Terms = lazy(() => import('./pages/Terms'));
const Cookies = lazy(() => import('./pages/Cookies'));
const NotFound = lazy(() => import('./pages/NotFound'));
const SettingsPage = lazy(() => import('./pages/dashboard/SettingsPage'));
const AuthorDetail = lazy(() => import('./pages/AuthorDetail'));
const Wishlist = lazy(() => import('./pages/Wishlist'));
const Orders = lazy(() => import('./pages/Orders'));
const Notifications = lazy(() => import('./pages/Notifications'));

// Pages admin
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminBooks = lazy(() => import('./pages/admin/AdminBooks'));
const AdminOrders = lazy(() => import('./pages/admin/AdminOrders'));
const AdminManuscripts = lazy(() => import('./pages/admin/AdminManuscripts'));
const AdminAuthors = lazy(() => import('./pages/admin/AdminAuthors'));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));

// Pages dashboard
const DashboardLayout = lazy(() => import('./components/DashboardLayout'));
const DashboardOverview = lazy(() => import('./pages/dashboard/DashboardOverview'));
const MyOrganizations = lazy(() => import('./pages/dashboard/MyOrganizations'));
const OrgDashboard = lazy(() => import('./pages/dashboard/OrgDashboard'));
const EditorialProjects = lazy(() => import('./pages/dashboard/EditorialProjects'));
const EditorialProjectDetail = lazy(() => import('./pages/dashboard/EditorialProjectDetail'));
const MyLoans = lazy(() => import('./pages/dashboard/MyLoans'));
const ServiceOrderDetail = lazy(() => import('./pages/dashboard/ServiceOrderDetail'));
const DeliveryAssignmentDetail = lazy(() => import('./pages/dashboard/DeliveryAssignmentDetail'));
const UnifiedProfile = lazy(() => import('./pages/UnifiedProfile'));
import { ProfileByIdRedirect, ProfessionalRedirect, AuthorRedirect } from './components/ProfileRedirects';

const LibraryRedirect = () => {
  const { slug } = useParams();
  return <Navigate to={`/organizations/${slug}`} replace />;
};
const MyReservations = lazy(() => import('./pages/dashboard/MyReservations'));
const LibraryAdmin = lazy(() => import('./pages/dashboard/LibraryAdmin'));
const MyManuscripts = lazy(() => import('./pages/dashboard/MyManuscripts'));
const OrgManuscripts = lazy(() => import('./pages/dashboard/OrgManuscripts'));
const OrgBooks = lazy(() => import('./pages/dashboard/OrgBooks'));
const OrgSettings = lazy(() => import('./pages/dashboard/OrgSettings'));
const OrgPrintRequests = lazy(() => import('./pages/dashboard/OrgPrintRequests'));

// Pages dashboard — Mon compte
const SecuritySettings = lazy(() => import('./pages/dashboard/SecuritySettings'));
const MyInvitations = lazy(() => import('./pages/dashboard/MyInvitations'));

// Pages espace auteur
const AuthorDashboard = lazy(() => import('./pages/dashboard/AuthorDashboard'));
const AuthorBooks = lazy(() => import('./pages/dashboard/AuthorBooks'));
const AuthorSales = lazy(() => import('./pages/dashboard/AuthorSales'));
const AuthorReviews = lazy(() => import('./pages/dashboard/AuthorReviews'));
const AuthorManuscripts = lazy(() => import('./pages/dashboard/AuthorManuscripts'));
const AuthorProfile = lazy(() => import('./pages/dashboard/AuthorProfile'));

// Page client : mes demandes de services
const MyServiceRequests = lazy(() => import('./pages/dashboard/MyServiceRequests'));

// Pages devis (quotes)
const Quotes = lazy(() => import('./pages/dashboard/Quotes'));
const QuoteCreate = lazy(() => import('./pages/dashboard/QuoteCreate'));
const QuoteDetail = lazy(() => import('./pages/dashboard/QuoteDetail'));

// Pages espace services pro
const ProDashboard = lazy(() => import('./pages/dashboard/ProDashboard'));
const ProRequests = lazy(() => import('./pages/dashboard/ProRequests'));
const ProOrders = lazy(() => import('./pages/dashboard/ProOrders'));
const ProListings = lazy(() => import('./pages/dashboard/ProListings'));
const ProWallet = lazy(() => import('./pages/dashboard/ProWallet'));

// Pages espace livreur
const DeliveryDashboard = lazy(() => import('./pages/dashboard/DeliveryDashboard'));
const DeliveryAssignments = lazy(() => import('./pages/dashboard/DeliveryAssignments'));
const DeliveryWalletPage = lazy(() => import('./pages/dashboard/DeliveryWallet'));
const DeliveryProfile = lazy(() => import('./pages/dashboard/DeliveryProfile'));
const DeliveryRatesPage = lazy(() => import('./pages/dashboard/DeliveryRates'));

// Pages vendeur
const VendorDashboard = lazy(() => import('./pages/vendor/VendorDashboard'));
const VendorListings = lazy(() => import('./pages/vendor/VendorListings'));
const VendorOrders = lazy(() => import('./pages/vendor/VendorOrders'));
const VendorWallet = lazy(() => import('./pages/vendor/VendorWallet'));
const CouponTemplates = lazy(() => import('./pages/dashboard/CouponTemplates'));
const CouponSend = lazy(() => import('./pages/dashboard/CouponSend'));
const CouponIssued = lazy(() => import('./pages/dashboard/CouponIssued'));
const MyCoupons = lazy(() => import('./pages/MyCoupons'));
const AdminCoupons = lazy(() => import('./pages/admin/AdminCoupons'));

// Pages services professionnels
const Services = lazy(() => import('./pages/Services'));
const ServiceDetail = lazy(() => import('./pages/ServiceDetail'));
const ServiceRequest = lazy(() => import('./pages/ServiceRequest'));

// Frollot Connect — Annuaire & Vitrines
const Organizations = lazy(() => import('./pages/Organizations'));
const OrganizationDetail = lazy(() => import('./pages/OrganizationDetail'));
const Professionals = lazy(() => import('./pages/Professionals'));
const Inquiries = lazy(() => import('./pages/Inquiries'));
const InquiryDetail = lazy(() => import('./pages/InquiryDetail'));
const InquiryNew = lazy(() => import('./pages/InquiryNew'));

// Page bibliothèque

// Auth
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));

// Pages sociales
const Feed = lazy(() => import('./pages/Feed'));
const ReadingLists = lazy(() => import('./pages/ReadingLists'));
const ReadingListDetail = lazy(() => import('./pages/ReadingListDetail'));
const BookClubs = lazy(() => import('./pages/BookClubs'));
const BookClubCreate = lazy(() => import('./pages/BookClubCreate'));
const BookClubDetail = lazy(() => import('./pages/BookClubDetail'));
const ClubInvite = lazy(() => import('./pages/ClubInvite'));

import './App.css';

// Redirect smart pour les anciennes URL /profile?tab=X
const ProfileRedirect = () => {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get('tab');
  const MAP = {
    overview: '/dashboard',
    info: '/dashboard/settings',
    orders: '/dashboard/orders',
    roles: '/dashboard/settings',
    organizations: '/dashboard',
    invitations: '/dashboard/invitations',
    security: '/dashboard/security',
  };
  return <Navigate to={MAP[tab] || '/dashboard/settings'} replace />;
};

// ── Routeur de sidebar contextuelle ──
function SidebarRouter({ pathname }) {
  const p = pathname;

  // Catalogue & Recherche
  if (p === '/catalog' || p === '/search') return <CatalogSidebar />;

  // Détail livre
  if (p.match(/^\/books\/[^/]+$/) && !p.endsWith('/read')) return <BookDetailSidebar />;

  // Sociales
  if (['/feed', '/lists', '/clubs'].includes(p) || p.startsWith('/lists/') || p === '/clubs/create') return <SocialSidebar />;

  // Auteurs
  if (p === '/authors' || p.startsWith('/authors/')) return <AuthorsSidebar />;

  // Utilisateur
  if (['/orders', '/wishlist', '/submit-manuscript'].includes(p)) return <UserSidebar pathname={p} />;

  // Frollot Connect
  if (p.startsWith('/organizations') || p.startsWith('/professionals') || p.startsWith('/services') || p.startsWith('/inquiries')) return <ConnectSidebar pathname={p} />;

  // Achat
  if (['/cart', '/checkout', '/order-success'].includes(p) || p.startsWith('/order-success/') || p.startsWith('/library/')) return <ShopSidebar pathname={p} />;

  // Auth
  if (['/login', '/register', '/forgot-password', '/reset-password', '/verify-email'].includes(p)) return <AuthSidebar pathname={p} />;

  // Pages légales
  if (['/about', '/contact', '/delivery', '/privacy', '/cgv', '/faq', '/support', '/terms', '/cookies'].includes(p)) return <LegalSidebar />;

  // Fallback
  return <LegalSidebar />;
}

// Transition de page — fade-in au changement de route
function PageTransition({ children }) {
  const location = useLocation();
  const [displayLocation, setDisplayLocation] = React.useState(location);
  const [transitionClass, setTransitionClass] = React.useState('page-enter-active');

  React.useEffect(() => {
    if (location.pathname !== displayLocation.pathname) {
      setTransitionClass('page-enter');
      const timeout = setTimeout(() => {
        setDisplayLocation(location);
        setTransitionClass('page-enter-active');
      }, 150);
      return () => clearTimeout(timeout);
    }
  }, [location, displayLocation]);

  return (
    <div className={`page-transition ${transitionClass}`}>
      {children}
    </div>
  );
}

// Fallback de chargement pour Suspense
function PageLoader() {
  const { t } = useTranslation();
  return (
    <div className="page-loader">
      <div className="page-loader__spinner" />
      <p className="page-loader__text">{t('common.loading')}</p>
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin-dashboard');
  const isDashboardRoute = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/vendor');
  const isFullWidthPage = ['/contact', '/about', '/delivery', '/privacy', '/cgv', '/faq', '/support', '/terms', '/cookies', '/submit-manuscript', '/wishlist', '/orders', '/notifications', '/checkout', '/order-success', '/cart', '/forgot-password', '/reset-password', '/feed', '/lists', '/clubs', '/services', '/organizations', '/professionals', '/inquiries', '/verify-email', '/search'].includes(location.pathname) || location.pathname.startsWith('/books/') || location.pathname.startsWith('/authors/') || location.pathname.startsWith('/lists/') || location.pathname.startsWith('/clubs/') || location.pathname.startsWith('/services/') || location.pathname.startsWith('/organizations/') || location.pathname.startsWith('/professionals/') || location.pathname.startsWith('/inquiries/') || location.pathname.startsWith('/library/') || location.pathname.startsWith('/order-success/');
  const isReaderPage = location.pathname.match(/^\/books\/[^/]+\/read$/);
  const isClubChatPage = location.pathname.match(/^\/clubs\/[^/]+$/) && !location.pathname.endsWith('/create');
  const FOOTER_PAGES = ['/'];
  const showFooter = FOOTER_PAGES.includes(location.pathname);
  // Sidebar droite globale — masquée sur Admin, Dashboard, Reader, Club Chat, Home (a sa propre sidebar)
  const showAppSidebar = !isAdminRoute && !isDashboardRoute && !isReaderPage && !isClubChatPage && location.pathname !== '/';

  return (
    <div className="app">
      <CosmosBackground />
      <PushRegistrar />
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>
      {!isReaderPage && <Header />}
      <div className={`app-layout ${showAppSidebar ? 'app-layout--with-sidebar' : ''}`}>
      {showAppSidebar && (
        <AppSidebar>
          <Suspense fallback={<div style={{padding:'1rem',textAlign:'center',color:'var(--color-text-muted-ui)'}}><i className="fas fa-spinner fa-spin"/></div>}>
            <SidebarRouter pathname={location.pathname} />
          </Suspense>
        </AppSidebar>
      )}
      <main id="main-content" role="main" className={`main-content ${isAdminRoute ? 'main-content--admin' : ''} ${isDashboardRoute ? 'main-content--dashboard' : ''} ${isFullWidthPage ? 'main-content--full' : ''} ${isReaderPage ? 'main-content--reader' : ''}`}>
        <Breadcrumbs />
        <ErrorBoundary>
        <PageTransition>
        <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Routes principales */}
                <Route path="/" element={<Home />} />
                <Route path="/search" element={<Search />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/books/:id" element={<BookDetail />} />
                <Route path="/books/:id/read" element={<BookReader />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/order-success/:orderId" element={<OrderSuccess />} />
                <Route path="/submit-manuscript" element={<ProtectedRoute><SubmitManuscript /></ProtectedRoute>} />
                
                {/* Routes utilisateur */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/verify-email" element={<VerifyEmail />} />
                <Route path="/profile" element={<ProfileRedirect />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

                {/* Frollot Connect — Annuaire & Vitrines */}
                <Route path="/organizations" element={<Organizations />} />
                <Route path="/organizations/:slug" element={<OrganizationDetail />} />
                <Route path="/professionals" element={<Professionals />} />
                <Route path="/professionals/:slug" element={<ProfessionalRedirect />} />

                {/* Frollot Connect — Demandes de renseignement */}
                <Route path="/inquiries" element={<ProtectedRoute><Inquiries /></ProtectedRoute>} />
                <Route path="/inquiries/new" element={<ProtectedRoute><InquiryNew /></ProtectedRoute>} />
                <Route path="/inquiries/:id" element={<ProtectedRoute><InquiryDetail /></ProtectedRoute>} />

                {/* Routes services professionnels */}
                <Route path="/services" element={<Services />} />
                <Route path="/services/:slug" element={<ServiceDetail />} />
                <Route path="/services/request/:listingId" element={<ProtectedRoute><ServiceRequest /></ProtectedRoute>} />

                {/* Route bibliothèque */}
                <Route path="/library/:slug" element={<LibraryRedirect />} />

                {/* Routes sociales */}
                <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
                <Route path="/lists" element={<ProtectedRoute><ReadingLists /></ProtectedRoute>} />
                <Route path="/lists/:slug" element={<ReadingListDetail />} />
                <Route path="/clubs" element={<BookClubs />} />
                <Route path="/clubs/create" element={<ProtectedRoute><BookClubCreate /></ProtectedRoute>} />
                <Route path="/clubs/invite/:token" element={<ClubInvite />} />
                <Route path="/clubs/:slug" element={<BookClubDetail />} />

                {/* ══════ Dashboard — route parent unique ══════ */}
                <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route index element={<DashboardOverview />} />

                  {/* Mon espace — activités personnelles */}
                  <Route path="orders" element={<Orders embedded />} />
                  <Route path="wishlist" element={<Wishlist embedded />} />
                  <Route path="my-manuscripts" element={<MyManuscripts />} />
                  <Route path="my-service-requests" element={<MyServiceRequests />} />
                  <Route path="my-quotes" element={<Quotes />} />
                  <Route path="my-quotes/:id" element={<QuoteDetail />} />
                  <Route path="my-loans" element={<MyLoans />} />
                  <Route path="my-reservations" element={<MyReservations />} />
                  <Route path="lists" element={<ReadingLists />} />
                  <Route path="clubs" element={<BookClubs />} />
                  <Route path="profile" element={<Navigate to="/dashboard/settings" replace />} />
                  <Route path="security" element={<SecuritySettings />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="invitations" element={<MyInvitations />} />
                  <Route path="coupons" element={<MyCoupons />} />
                  <Route path="coupons/templates" element={<CouponTemplates />} />
                  <Route path="coupons/send" element={<CouponSend />} />
                  <Route path="coupons/issued" element={<CouponIssued />} />
                  <Route path="projects" element={<EditorialProjects />} />
                  <Route path="projects/:id" element={<EditorialProjectDetail />} />

                  {/* Organisations */}
                  <Route path="organizations" element={<MyOrganizations />} />
                  <Route path="organizations/:id" element={<OrgDashboard />} />
                  <Route path="organizations/:id/manuscripts" element={<OrgManuscripts />} />
                  <Route path="organizations/:id/books" element={<OrgBooks />} />
                  <Route path="organizations/:id/print-requests" element={<OrgPrintRequests />} />
                  <Route path="organizations/:id/projects" element={<EditorialProjects />} />
                  <Route path="organizations/:id/projects/:projectId" element={<EditorialProjectDetail />} />
                  <Route path="organizations/:id/settings" element={<OrgSettings />} />
                  <Route path="organizations/:id/library-admin" element={<LibraryAdmin />} />

                  {/* Espace Auteur */}
                  <Route path="author" element={<AuthorDashboard />} />
                  <Route path="author/books" element={<AuthorBooks />} />
                  <Route path="author/sales" element={<AuthorSales />} />
                  <Route path="author/reviews" element={<AuthorReviews />} />
                  <Route path="author/manuscripts" element={<AuthorManuscripts />} />
                  <Route path="author/profile" element={<AuthorProfile />} />

                  {/* Espace Services Pro */}
                  <Route path="services" element={<ProDashboard />} />
                  <Route path="services/requests" element={<ProRequests />} />
                  <Route path="services/orders" element={<ProOrders />} />
                  <Route path="services/orders/:id" element={<ServiceOrderDetail />} />
                  <Route path="services/listings" element={<ProListings />} />
                  <Route path="services/wallet" element={<ProWallet />} />
                  <Route path="services/quotes" element={<Quotes />} />
                  <Route path="services/quotes/create" element={<QuoteCreate />} />
                  <Route path="services/quotes/:id" element={<QuoteDetail />} />

                  {/* Espace Livreur */}
                  <Route path="delivery" element={<DeliveryDashboard />} />
                  <Route path="delivery/assignments" element={<DeliveryAssignments />} />
                  <Route path="delivery/assignments/:id" element={<DeliveryAssignmentDetail />} />
                  <Route path="delivery/wallet" element={<DeliveryWalletPage />} />
                  <Route path="delivery/profile" element={<DeliveryProfile />} />
                  <Route path="delivery/rates" element={<DeliveryRatesPage />} />
                </Route>

                {/* Espace Vendeur — route séparée (prefix /vendor) */}
                <Route path="/vendor" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
                  <Route index element={<VendorDashboard />} />
                  <Route path="listings" element={<VendorListings />} />
                  <Route path="orders" element={<VendorOrders />} />
                  <Route path="wallet" element={<VendorWallet />} />
                  <Route path="coupons/templates" element={<Navigate to="/dashboard/coupons/templates" replace />} />
                  <Route path="coupons/send" element={<Navigate to="/dashboard/coupons/send" replace />} />
                  <Route path="coupons/issued" element={<Navigate to="/dashboard/coupons/issued" replace />} />
                </Route>

                {/* Routes Admin — protégées, layout sidebar */}
                <Route path="/admin-dashboard" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="books" element={<AdminBooks />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="manuscripts" element={<AdminManuscripts />} />
                  <Route path="authors" element={<AdminAuthors />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                </Route>
                
                {/* Routes informatives */}
                <Route path="/authors" element={<Authors />} />
                <Route path="/authors/:id" element={<AuthorRedirect fallback={AuthorDetail} />} />
                <Route path="/u/:slug" element={<UnifiedProfile />} />
                <Route path="/profile/:id" element={<ProfileByIdRedirect />} />
                <Route path="/settings" element={<Navigate to="/dashboard/settings" replace />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/delivery" element={<Delivery />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/cgv" element={<CGV />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/support" element={<Support />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/cookies" element={<Cookies />} />
                
                {/* Redirections et 404 */}
                <Route path="/catalogue" element={<Navigate to="/catalog" replace />} />
                <Route path="/livres" element={<Navigate to="/catalog" replace />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
        </Suspense>
        </PageTransition>
        </ErrorBoundary>
      </main>
      </div>
      {showFooter && <div className={showAppSidebar ? 'app-footer-shifted' : ''}><Footer /></div>}
      <SessionTimeoutWarning />
      <OnboardingModal />
      {!isReaderPage && <ChatbotWidget />}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            borderRadius: '12px',
            padding: '12px 16px',
            fontSize: '0.88rem',
            fontWeight: 500,
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
          },
          success: {
            iconTheme: { primary: '#10b981', secondary: '#fff' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#fff' },
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <HelmetProvider>
        <Router>
          <AuthProvider>
            <CartProvider>
              <WishlistProvider>
                <DeliveryConfigProvider>
                  <CurrencyProvider>
                    <AppContent />
                  </CurrencyProvider>
                </DeliveryConfigProvider>
              </WishlistProvider>
            </CartProvider>
          </AuthProvider>
        </Router>
      </HelmetProvider>
    </QueryClientProvider>
  );
}

export default App;