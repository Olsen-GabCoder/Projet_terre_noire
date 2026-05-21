import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { DeliveryConfigProvider } from './context/DeliveryConfigContext';
import Header from './components/Header';
import Footer from './components/Footer';
import SeparatorDefs from './components/SeparatorDefs';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import BookDetail from './pages/BookDetail';
import BookReader from './pages/BookReader';
import Cart from './pages/Cart';
import Checkout from './pages/Checkout';
import OrderSuccess from './pages/OrderSuccess';
import SubmitManuscript from './pages/SubmitManuscript';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Profile from './pages/Profile';
import Authors from './pages/Authors';
import About from './pages/About';
import Contact from './pages/Contact';
import Delivery from './pages/Delivery';
import Privacy from './pages/Privacy';
import CGV from './pages/CGV';
import FAQ from './pages/FAQ';
import Support from './pages/Support';
import Terms from './pages/Terms';
import Cookies from './pages/Cookies';
import NotFound from './pages/NotFound';
import Settings from './pages/Settings';
import AuthorDetail from './pages/AuthorDetail';
import Wishlist from './pages/Wishlist';
import Orders from './pages/Orders';
import NewsletterConfirm from './pages/NewsletterConfirm';
import NewsletterUnsubscribe from './pages/NewsletterUnsubscribe';

// Import des pages admin
import AdminLayout from './components/admin/AdminLayout';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
import AdminBooks from './pages/admin/AdminBooks';
import AdminOrders from './pages/admin/AdminOrders';
import AdminManuscripts from "./pages/admin/AdminManuscripts";
import AdminAuthors from './pages/admin/AdminAuthors';
import AdminUsers from './pages/admin/AdminUsers';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminNewsletter from './pages/admin/AdminNewsletter';
import AdminCoupons from './pages/admin/AdminCoupons';
import AdminContact from './pages/admin/AdminContact';
import AdminConfig from './pages/admin/AdminConfig';

import BottomNav from './components/BottomNav';
import { ToastProvider } from './components/ui/ToastProvider';
import './App.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

function ScrollProgressBar() {
  const [progress, setProgress] = useState(0);
  const location = useLocation();
  const hidden = location.pathname.startsWith('/admin') || location.pathname.match(/\/read$/);

  useEffect(() => {
    if (hidden) return;
    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(docHeight > 0 ? Math.min((scrollTop / docHeight) * 100, 100) : 0);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [hidden, location.pathname]);

  if (hidden || progress === 0) return null;

  return (
    <div className="scroll-progress" aria-hidden="true">
      <div className="scroll-progress__bar" style={{ width: `${progress}%` }} />
    </div>
  );
}

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin-dashboard');
  const isFullWidthPage = ['/profile', '/contact', '/about', '/delivery', '/privacy', '/cgv', '/faq', '/support', '/terms', '/cookies', '/settings', '/submit-manuscript', '/wishlist', '/orders', '/checkout', '/order-success', '/cart', '/forgot-password', '/reset-password'].includes(location.pathname) || location.pathname.startsWith('/books/') || location.pathname.startsWith('/authors/') || location.pathname.startsWith('/newsletter/');
  const isReaderPage = location.pathname.match(/^\/books\/[^/]+\/read$/);

  return (
    <div className="app">
      <SeparatorDefs />
      <ScrollToTop />
      <ScrollProgressBar />
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>
      {!isReaderPage && !isAdminRoute && <Header />}
      <main id="main-content" role="main" className={`main-content ${isAdminRoute ? 'main-content--admin' : ''} ${isFullWidthPage ? 'main-content--full' : ''} ${isReaderPage ? 'main-content--reader' : ''}`}>
              <Routes>
                {/* Routes principales */}
                <Route path="/" element={<Home />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/books/:id" element={<BookDetail />} />
                <Route path="/books/:id/read" element={<BookReader />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/order-success" element={<OrderSuccess />} />
                <Route path="/submit-manuscript" element={<SubmitManuscript />} />
                
                {/* Routes utilisateur */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/newsletter/confirm/:status" element={<NewsletterConfirm />} />
                <Route path="/newsletter/unsubscribe/:status" element={<NewsletterUnsubscribe />} />
                
                {/* Routes Admin — protégées, layout sidebar */}
                <Route path="/admin-dashboard" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="books" element={<AdminBooks />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="manuscripts" element={<AdminManuscripts />} />
                  <Route path="authors" element={<AdminAuthors />} />
                  <Route path="users" element={<AdminUsers />} />
                  <Route path="newsletter" element={<AdminNewsletter />} />
                  <Route path="coupons" element={<AdminCoupons />} />
                  <Route path="contact" element={<AdminContact />} />
                  <Route path="config" element={<AdminConfig />} />
                </Route>
                
                {/* Routes informatives */}
                <Route path="/authors" element={<Authors />} />
                <Route path="/authors/:id" element={<AuthorDetail />} />
                <Route path="/settings" element={<Settings />} />
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
      </main>
      {!isAdminRoute && !isReaderPage && <Footer />}
      {!isAdminRoute && !isReaderPage && <BottomNav />}
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <DeliveryConfigProvider>
              <ToastProvider>
                <AppContent />
              </ToastProvider>
            </DeliveryConfigProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;