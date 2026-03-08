// Protection des routes admin — redirection si non connecté ou non staff
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const AdminProtectedRoute = ({ children }) => {
  const { user, loading, authChecked, isAdmin } = useAuth();
  const location = useLocation();

  if (!authChecked || loading) {
    return (
      <div className="admin-loading-screen">
        <div className="admin-spinner" />
        <p>Chargement...</p>
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
