// Layout admin — contenu uniquement (navigation via le Header du site)
import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import '../../styles/Admin.css';

const AdminLayout = () => {
  const { user, isAdmin } = useAuth();

  if (!isAdmin && user) {
    return (
      <div className="admin-forbidden">
        <h1>Accès refusé</h1>
        <p>Vous n&apos;avez pas les droits pour accéder à cette section.</p>
        <Link to="/" className="admin-btn admin-btn-primary">Retour à l&apos;accueil</Link>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
