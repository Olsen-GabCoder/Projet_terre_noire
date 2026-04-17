import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/AdminUsers.css';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/users/');
      const data = response.data;
      setUsers(Array.isArray(data) ? data : (data.results || []));
    } catch (err) {
      setError('Impossible de charger la liste des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const toggleUserStatus = async (userId, currentStatus) => {
    if (!window.confirm(`Êtes-vous sûr de vouloir ${currentStatus ? 'désactiver' : 'activer'} cet utilisateur ?`)) {
      return;
    }
    try {
      await api.patch(`/users/${userId}/`, { is_active: !currentStatus });
      fetchUsers();
      setSelectedUser(null);
    } catch (err) {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const fullName = (user) => {
    const parts = [user.first_name, user.last_name].filter(Boolean);
    return parts.length ? parts.join(' ') : null;
  };

  if (loading) {
    return (
      <div className="admin-users-loading">
        Chargement des utilisateurs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-users-error">
        {error}
      </div>
    );
  }

  const totalUsers = users.length;
  const activeUsers = users.filter(u => u.is_active).length;
  const inactiveUsers = totalUsers - activeUsers;

  return (
    <div className="admin-users-page">
      <section className="admin-users-hero">
        <div className="admin-users-hero__orb admin-users-hero__orb--1" />
        <div className="admin-users-hero__orb admin-users-hero__orb--2" />
        <div className="admin-users-hero__grid-bg" />
        <div className="admin-users-hero__inner">
          <div className="admin-users-hero__line" />
          <h1 className="admin-users-hero__title">Gestion des Utilisateurs</h1>
          <p className="admin-users-hero__sub">
            Consultez et gérez les comptes utilisateurs. Activez ou désactivez les accès selon vos besoins.
          </p>
          <Link to="/admin-dashboard" className="admin-users-hero__back">
            <i className="fas fa-arrow-left" />
            Retour
          </Link>
        </div>
      </section>

      <div className="admin-users-hero-fade" />

      <section className="admin-users-content">
        <div className="admin-users-inner">
          <div className="admin-users-stats">
            <div className="admin-users-stat">
              <div className="admin-users-stat__number admin-users-stat__number--total">{totalUsers}</div>
              <div className="admin-users-stat__label">Total</div>
            </div>
            <div className="admin-users-stat">
              <div className="admin-users-stat__number admin-users-stat__number--active">{activeUsers}</div>
              <div className="admin-users-stat__label">Actifs</div>
            </div>
            <div className="admin-users-stat">
              <div className="admin-users-stat__number admin-users-stat__number--inactive">{inactiveUsers}</div>
              <div className="admin-users-stat__label">Inactifs</div>
            </div>
          </div>

          <div className="admin-users-table admin-users-table--desktop">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nom d&apos;utilisateur</th>
                  <th>Email</th>
                  <th>Date d&apos;inscription</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => (
                  <tr key={user.id}>
                    <td><strong>#{user.id}</strong></td>
                    <td className="user-name-cell">
                      <strong>{user.username}</strong>
                      {fullName(user) && <small>{fullName(user)}</small>}
                    </td>
                    <td>{user.email}</td>
                    <td>{formatDate(user.date_joined)}</td>
                    <td>
                      <span className={`admin-users-status-badge ${user.is_active ? 'admin-users-status-badge--active' : 'admin-users-status-badge--inactive'}`}>
                        {user.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="btn-view"
                      >
                        <i className="fas fa-eye" />
                        Détails
                      </button>
                      <button
                        onClick={() => toggleUserStatus(user.id, user.is_active)}
                        className={`btn-toggle ${user.is_active ? 'btn-toggle--deactivate' : ''}`}
                      >
                        {user.is_active ? (
                          <>
                            <i className="fas fa-user-slash" />
                            Désactiver
                          </>
                        ) : (
                          <>
                            <i className="fas fa-user-check" />
                            Activer
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="admin-users-mobile">
            {users.map(user => (
              <div key={user.id} className="admin-users-mobile-card">
                <div className="admin-users-mobile-card__header">
                  <span className="admin-users-mobile-card__id">#{user.id}</span>
                  <span className={`admin-users-status-badge ${user.is_active ? 'admin-users-status-badge--active' : 'admin-users-status-badge--inactive'}`}>
                    {user.is_active ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                <div className="admin-users-mobile-card__name">{user.username}</div>
                {fullName(user) && (
                  <div className="admin-users-mobile-card__meta">{fullName(user)}</div>
                )}
                <div className="admin-users-mobile-card__meta">{user.email}</div>
                <div className="admin-users-mobile-card__meta">{formatDate(user.date_joined)}</div>
                <div className="admin-users-mobile-card__footer">
                  <button
                    onClick={() => setSelectedUser(user)}
                    className="btn-view"
                  >
                    <i className="fas fa-eye" />
                    Détails
                  </button>
                  <button
                    onClick={() => toggleUserStatus(user.id, user.is_active)}
                    className={`btn-toggle ${user.is_active ? 'btn-toggle--deactivate' : ''}`}
                  >
                    {user.is_active ? (
                      <>
                        <i className="fas fa-user-slash" />
                        Désactiver
                      </>
                    ) : (
                      <>
                        <i className="fas fa-user-check" />
                        Activer
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {selectedUser && (
        <div
          className="admin-users-modal-overlay"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="admin-users-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-users-modal__header">
              <h2>Utilisateur #{selectedUser.id}</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="admin-users-modal__close"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="admin-users-modal__body">
              <div className="admin-users-modal__section">
                <h3>Informations personnelles</h3>
                <div className="admin-users-modal__grid">
                  <div className="admin-users-modal__item">
                    <strong>Nom d&apos;utilisateur</strong>
                    <span>{selectedUser.username}</span>
                  </div>
                  <div className="admin-users-modal__item">
                    <strong>Nom complet</strong>
                    <span>{fullName(selectedUser) || '—'}</span>
                  </div>
                  <div className="admin-users-modal__item">
                    <strong>Email</strong>
                    <span>{selectedUser.email}</span>
                  </div>
                  <div className="admin-users-modal__item">
                    <strong>Date d&apos;inscription</strong>
                    <span>{formatDate(selectedUser.date_joined)}</span>
                  </div>
                </div>
              </div>

              <div className="admin-users-modal__section">
                <h3>Statut et rôles</h3>
                <div className="admin-users-modal__grid">
                  <div className="admin-users-modal__item">
                    <strong>Statut</strong>
                    <span>
                      <span className={`admin-users-status-badge ${selectedUser.is_active ? 'admin-users-status-badge--active' : 'admin-users-status-badge--inactive'}`}>
                        {selectedUser.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </span>
                  </div>
                  <div className="admin-users-modal__item">
                    <strong>Staff</strong>
                    <span>
                      {selectedUser.is_staff ? (
                        <span className="admin-users-modal__role-badge">Staff</span>
                      ) : (
                        'Non-staff'
                      )}
                    </span>
                  </div>
                  <div className="admin-users-modal__item">
                    <strong>Superuser</strong>
                    <span>
                      {selectedUser.is_superuser ? (
                        <span className="admin-users-modal__role-badge">Superuser</span>
                      ) : (
                        'Non-superuser'
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="admin-users-modal__actions">
                <button
                  onClick={() => toggleUserStatus(selectedUser.id, selectedUser.is_active)}
                  className={`admin-users-modal__btn-toggle ${selectedUser.is_active ? 'admin-users-modal__btn-toggle--deactivate' : 'admin-users-modal__btn-toggle--activate'}`}
                >
                  {selectedUser.is_active ? (
                    <>
                      <i className="fas fa-user-slash" />
                      Désactiver cet utilisateur
                    </>
                  ) : (
                    <>
                      <i className="fas fa-user-check" />
                      Activer cet utilisateur
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
