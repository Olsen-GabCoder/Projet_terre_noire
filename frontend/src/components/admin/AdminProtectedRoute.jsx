// Protection des routes admin — redirection si non connecté ou non staff
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminProtectedRoute = ({ children }) => {
  const { user, loading, authChecked, isAdmin } = useAuth();
  const location = useLocation();

  if (!authChecked || loading) {
    return (
      <div className="adm-loading-screen">
        <div style={{
          width: 54, height: 54, borderRadius: '50%',
          border: '3px solid var(--tn-cream-2)',
          borderTopColor: 'var(--tn-orange)',
          margin: '0 auto',
          animation: 'tn-spin 1s linear infinite',
        }} />
        <p style={{ fontFamily: 'var(--tn-serif)', fontSize: 18, fontWeight: 600, marginTop: 22, color: 'var(--tn-gray-900)' }}>Chargement...</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
};

export default AdminProtectedRoute;
