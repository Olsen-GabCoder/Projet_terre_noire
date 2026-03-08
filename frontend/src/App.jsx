import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { DeliveryConfigProvider } from './context/DeliveryConfigContext';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Catalog from './pages/Catalog';
import BookDetail from './pages/BookDetail';
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

// Import des pages admin
import AdminLayout from './components/admin/AdminLayout';
import AdminProtectedRoute from './components/admin/AdminProtectedRoute';
import AdminBooks from './pages/admin/AdminBooks';
import AdminOrders from './pages/admin/AdminOrders';
import AdminManuscripts from "./pages/admin/AdminManuscripts";
import AdminAuthors from './pages/admin/AdminAuthors';
import AdminUsers from './pages/admin/AdminUsers';

import './App.css';

function AppContent() {
  const location = useLocation();
  const isAdminRoute = location.pathname.startsWith('/admin-dashboard');
  const isFullWidthPage = ['/profile', '/contact', '/about', '/delivery', '/privacy', '/cgv', '/faq', '/support', '/terms', '/cookies', '/settings', '/submit-manuscript', '/wishlist', '/orders', '/checkout', '/order-success', '/cart', '/forgot-password', '/reset-password'].includes(location.pathname) || location.pathname.startsWith('/books/') || location.pathname.startsWith('/authors/');

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">
        Aller au contenu principal
      </a>
      <Header />
      <main id="main-content" role="main" className={`main-content ${isAdminRoute ? 'main-content--admin' : ''} ${isFullWidthPage ? 'main-content--full' : ''}`}>
              <Routes>
                {/* Routes principales */}
                <Route path="/" element={<Home />} />
                <Route path="/catalog" element={<Catalog />} />
                <Route path="/books/:id" element={<BookDetail />} />
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
                
                {/* Routes Admin — protégées, layout sidebar */}
                <Route path="/admin-dashboard" element={<AdminProtectedRoute><AdminLayout /></AdminProtectedRoute>}>
                  <Route index element={<Navigate to="/admin-dashboard/books" replace />} />
                  <Route path="books" element={<AdminBooks />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="manuscripts" element={<AdminManuscripts />} />
                  <Route path="authors" element={<AdminAuthors />} />
                  <Route path="users" element={<AdminUsers />} />
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
      {!isAdminRoute && <Footer />}
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
              <AppContent />
            </DeliveryConfigProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;