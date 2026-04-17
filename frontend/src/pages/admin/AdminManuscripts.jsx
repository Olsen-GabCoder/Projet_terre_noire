import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/AdminManuscripts.css';
import { useTranslation } from 'react-i18next';
import toast from 'react-hot-toast';

const AdminManuscripts = () => {
  const [manuscripts, setManuscripts] = useState([]);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedManuscript, setSelectedManuscript] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchManuscripts();
  }, []);

  const fetchManuscripts = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/manuscripts/');
      setManuscripts(response.data.results || response.data);
    } catch (err) {
      setError('Impossible de charger la liste des manuscrits');
    } finally {
      setLoading(false);
    }
  };

  const updateManuscriptStatus = async (id, newStatus) => {
    try {
      await api.patch(`/manuscripts/${id}/update-status/`, { status: newStatus });
      fetchManuscripts();
      setSelectedManuscript(null);
    } catch (err) {
      toast.error('Erreur lors de la mise à jour du statut');
    }
  };

  const deleteManuscript = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce manuscrit ?')) return;
    try {
      await api.delete(`/manuscripts/${id}/`);
      fetchManuscripts();
      setSelectedManuscript(null);
    } catch (err) {
      toast.error('Erreur lors de la suppression');
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

  const getStatusConfig = (status) => {
    const s = (status || '').toUpperCase();
    const configs = {
      PENDING: { label: 'En attente', class: 'admin-manuscripts-status-badge--pending' },
      UNDER_REVIEW: { label: 'En lecture', class: 'admin-manuscripts-status-badge--review' },
      REVIEWING: { label: 'En examen', class: 'admin-manuscripts-status-badge--review' },
      ACCEPTED: { label: 'Accepté', class: 'admin-manuscripts-status-badge--accepted' },
      REJECTED: { label: 'Refusé', class: 'admin-manuscripts-status-badge--rejected' },
    };
    return configs[s] || { label: status || '—', class: 'admin-manuscripts-status-badge--unknown' };
  };

  const GENRE_LABELS = {
    ROMAN: 'Roman',
    NOUVELLE: 'Nouvelle / Recueil',
    POESIE: 'Poésie',
    ESSAI: 'Essai',
    THEATRE: 'Théâtre',
    JEUNESSE: 'Jeunesse',
    BD: 'Bande dessinée',
    AUTRE: 'Autre',
  };

  const LANGUAGE_LABELS = {
    FR: 'Français',
    EN: 'Anglais',
    AR: 'Arabe',
    PT: 'Portugais',
    ES: 'Espagnol',
    AUTRE: 'Autre',
  };

  const getGenreLabel = (genre) => GENRE_LABELS[genre] || genre || '—';
  const getLanguageLabel = (lang) => LANGUAGE_LABELS[lang] || lang || '—';
  const getFileUrl = (m) => m.file_url || m.file;

  const handleDownloadFile = async (manuscript) => {
    const url = getFileUrl(manuscript);
    if (!url) return;
    try {
      const res = await api.get(url, { responseType: 'blob' });
      const blobUrl = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `manuscrit-${manuscript.id}.pdf`;
      a.click();
      URL.revokeObjectURL(blobUrl);
    } catch (err) {
      const msg = err.response?.status === 403
        ? "Vous n'avez pas accès à ce manuscrit."
        : 'Erreur lors du téléchargement.';
      toast.error(msg);
    }
  };

  const getFilteredManuscripts = () => {
    if (filter === 'all') return manuscripts;
    return manuscripts.filter(m => m.status === filter);
  };

  const pendingCount = manuscripts.filter(m => m.status === 'PENDING').length;
  const reviewCount = manuscripts.filter(m => m.status === 'REVIEWING').length;
  const acceptedCount = manuscripts.filter(m => m.status === 'ACCEPTED').length;
  const rejectedCount = manuscripts.filter(m => m.status === 'REJECTED').length;

  if (loading) {
    return (
      <div className="admin-manuscripts-loading">
        Chargement des manuscrits...
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-manuscripts-error">
        {error}
      </div>
    );
  }

  const filteredManuscripts = getFilteredManuscripts();

  return (
    <div className="admin-manuscripts-page">
      <section className="admin-manuscripts-hero">
        <div className="admin-manuscripts-hero__orb admin-manuscripts-hero__orb--1" />
        <div className="admin-manuscripts-hero__orb admin-manuscripts-hero__orb--2" />
        <div className="admin-manuscripts-hero__grid-bg" />
        <div className="admin-manuscripts-hero__inner">
          <div className="admin-manuscripts-hero__line" />
          <h1 className="admin-manuscripts-hero__title">Gestion des Manuscrits</h1>
          <p className="admin-manuscripts-hero__sub">
            Consultez et gérez les manuscrits soumis par les auteurs. Changez les statuts et téléchargez les fichiers.
          </p>
          <Link to="/admin-dashboard" className="admin-manuscripts-hero__back">
            <i className="fas fa-arrow-left" />
            Retour
          </Link>
        </div>
      </section>

      <div className="admin-manuscripts-hero-fade" />

      <section className="admin-manuscripts-content">
        <div className="admin-manuscripts-inner">
          {/* Statistiques */}
          <div className="admin-manuscripts-stats">
            <div className="admin-manuscripts-stat">
              <div className="admin-manuscripts-stat__number admin-manuscripts-stat__number--pending">{pendingCount}</div>
              <div className="admin-manuscripts-stat__label">En attente</div>
            </div>
            <div className="admin-manuscripts-stat">
              <div className="admin-manuscripts-stat__number admin-manuscripts-stat__number--review">{reviewCount}</div>
              <div className="admin-manuscripts-stat__label">En lecture</div>
            </div>
            <div className="admin-manuscripts-stat">
              <div className="admin-manuscripts-stat__number admin-manuscripts-stat__number--accepted">{acceptedCount}</div>
              <div className="admin-manuscripts-stat__label">Acceptés</div>
            </div>
            <div className="admin-manuscripts-stat">
              <div className="admin-manuscripts-stat__number admin-manuscripts-stat__number--rejected">{rejectedCount}</div>
              <div className="admin-manuscripts-stat__label">Refusés</div>
            </div>
          </div>

          {/* Filtres */}
          <div className="admin-manuscripts-filter">
            <span className="admin-manuscripts-filter__label">Filtrer par statut :</span>
            <div className="admin-manuscripts-filter__btns">
              <button
                className={`admin-manuscripts-filter__btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                Tous ({manuscripts.length})
              </button>
              <button
                className={`admin-manuscripts-filter__btn ${filter === 'PENDING' ? 'active' : ''}`}
                onClick={() => setFilter('PENDING')}
              >
                En attente ({pendingCount})
              </button>
              <button
                className={`admin-manuscripts-filter__btn ${filter === 'REVIEWING' ? 'active' : ''}`}
                onClick={() => setFilter('REVIEWING')}
              >
                En examen ({reviewCount})
              </button>
              <button
                className={`admin-manuscripts-filter__btn ${filter === 'ACCEPTED' ? 'active' : ''}`}
                onClick={() => setFilter('ACCEPTED')}
              >
                Acceptés ({acceptedCount})
              </button>
              <button
                className={`admin-manuscripts-filter__btn ${filter === 'REJECTED' ? 'active' : ''}`}
                onClick={() => setFilter('REJECTED')}
              >
                Refusés ({rejectedCount})
              </button>
            </div>
          </div>

          {/* Vue tableau — desktop */}
          <div className="admin-manuscripts-table admin-manuscripts-table--desktop">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Titre</th>
                  <th>Genre</th>
                  <th>Auteur</th>
                  <th>Email</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredManuscripts.map(manuscript => {
                  const statusConfig = getStatusConfig(manuscript.status);
                  return (
                    <tr key={manuscript.id}>
                      <td><strong>#{manuscript.id}</strong></td>
                      <td className="manuscript-title-cell">
                        <strong>{manuscript.title}</strong>
                      </td>
                      <td>{getGenreLabel(manuscript.genre)}</td>
                      <td className="manuscript-author-cell">
                        {manuscript.author_name}
                        {manuscript.pen_name && (
                          <small> ({manuscript.pen_name})</small>
                        )}
                      </td>
                      <td>{manuscript.email}</td>
                      <td>{formatDate(manuscript.submitted_at)}</td>
                      <td>
                        <span className={`admin-manuscripts-status-badge ${statusConfig.class}`}>
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="actions">
                        <button
                          onClick={() => setSelectedManuscript(manuscript)}
                          className="btn-view"
                        >
                          <i className="fas fa-eye" />
                          Détails
                        </button>
                        {getFileUrl(manuscript) && (
                          <button
                            onClick={() => handleDownloadFile(manuscript)}
                            className="btn-download"
                          >
                            <i className="fas fa-download" />
                            Télécharger
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Vue cartes — mobile */}
          <div className="admin-manuscripts-mobile">
            {filteredManuscripts.map(manuscript => {
              const statusConfig = getStatusConfig(manuscript.status);
              return (
                <div key={manuscript.id} className="admin-manuscripts-mobile-card">
                  <div className="admin-manuscripts-mobile-card__header">
                    <span className="admin-manuscripts-mobile-card__id">#{manuscript.id}</span>
                    <span className={`admin-manuscripts-status-badge ${statusConfig.class}`}>
                      {statusConfig.label}
                    </span>
                  </div>
                  <div className="admin-manuscripts-mobile-card__title">{manuscript.title}</div>
                  {manuscript.genre && (
                    <div className="admin-manuscripts-mobile-card__genre">{getGenreLabel(manuscript.genre)}</div>
                  )}
                  <div className="admin-manuscripts-mobile-card__meta">
                    {manuscript.author_name}
                    {manuscript.pen_name && ` (${manuscript.pen_name})`}
                  </div>
                  <div className="admin-manuscripts-mobile-card__meta">{formatDate(manuscript.submitted_at)}</div>
                  <div className="admin-manuscripts-mobile-card__footer">
                    <div className="admin-manuscripts-mobile-card__btns">
                      <button
                        onClick={() => setSelectedManuscript(manuscript)}
                        className="btn-view"
                      >
                        <i className="fas fa-eye" />
                        Détails
                      </button>
                      {getFileUrl(manuscript) && (
                        <button
                          onClick={() => handleDownloadFile(manuscript)}
                          className="btn-download"
                        >
                          <i className="fas fa-download" />
                          Télécharger
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Modal de détails */}
      {selectedManuscript && (
        <div
          className="admin-manuscripts-modal-overlay"
          onClick={() => setSelectedManuscript(null)}
        >
          <div
            className="admin-manuscripts-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-manuscripts-modal__header">
              <h2>Manuscrit #{selectedManuscript.id}</h2>
              <button
                onClick={() => setSelectedManuscript(null)}
                className="admin-manuscripts-modal__close"
                aria-label="Fermer"
              >
                ×
              </button>
            </div>

            <div className="admin-manuscripts-modal__body">
              <div className="admin-manuscripts-modal__section">
                <h3>Informations générales</h3>
                <div className="admin-manuscripts-modal__grid">
                  <div className="admin-manuscripts-modal__item">
                    <strong>Titre</strong>
                    <span>{selectedManuscript.title}</span>
                  </div>
                  <div className="admin-manuscripts-modal__item">
                    <strong>Genre</strong>
                    <span>{getGenreLabel(selectedManuscript.genre)}</span>
                  </div>
                  <div className="admin-manuscripts-modal__item">
                    <strong>Langue</strong>
                    <span>{getLanguageLabel(selectedManuscript.language)}</span>
                  </div>
                  <div className="admin-manuscripts-modal__item">
                    <strong>Nombre de pages</strong>
                    <span>{selectedManuscript.page_count ?? '—'}</span>
                  </div>
                  <div className="admin-manuscripts-modal__item">
                    <strong>Date de soumission</strong>
                    <span>{formatDate(selectedManuscript.submitted_at)}</span>
                  </div>
                  <div className="admin-manuscripts-modal__item">
                    <strong>Statut</strong>
                    <span>
                      <span className={`admin-manuscripts-status-badge ${getStatusConfig(selectedManuscript.status).class}`}>
                        {getStatusConfig(selectedManuscript.status).label}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="admin-manuscripts-modal__section">
                <h3>Informations auteur</h3>
                <div className="admin-manuscripts-modal__grid">
                  <div className="admin-manuscripts-modal__item">
                    <strong>Nom</strong>
                    <span>{selectedManuscript.author_name}</span>
                  </div>
                  <div className="admin-manuscripts-modal__item">
                    <strong>Pseudonyme</strong>
                    <span>{selectedManuscript.pen_name || '—'}</span>
                  </div>
                  <div className="admin-manuscripts-modal__item">
                    <strong>Email</strong>
                    <span>{selectedManuscript.email}</span>
                  </div>
                  <div className="admin-manuscripts-modal__item">
                    <strong>Téléphone</strong>
                    <span>{selectedManuscript.phone_number || '—'}</span>
                  </div>
                  <div className="admin-manuscripts-modal__item">
                    <strong>Pays / Nationalité</strong>
                    <span>{selectedManuscript.country || '—'}</span>
                  </div>
                  <div className="admin-manuscripts-modal__item">
                    <strong>Conditions acceptées</strong>
                    <span>{selectedManuscript.terms_accepted ? 'Oui' : 'Non'}</span>
                  </div>
                </div>
              </div>

              {getFileUrl(selectedManuscript) && (
                <div className="admin-manuscripts-modal__section">
                  <h3>Fichier du manuscrit</h3>
                  <div className="admin-manuscripts-modal__file-info">
                    <i className="fas fa-file-pdf" />
                    <div className="admin-manuscripts-modal__file-details">
                      <h4>{(selectedManuscript.file_url || selectedManuscript.file || '').split('/').pop() || 'Fichier manuscrit'}</h4>
                      <p>Soumis le {formatDate(selectedManuscript.submitted_at)}</p>
                    </div>
                    <div className="admin-manuscripts-modal__file-download">
                      <button
                        onClick={() => handleDownloadFile(selectedManuscript)}
                        className="btn-download"
                      >
                        <i className="fas fa-download" />
                        Télécharger
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="admin-manuscripts-modal__section">
                <h3>Description</h3>
                <div className="admin-manuscripts-modal__description">
                  <p>{selectedManuscript.description || 'Aucune description fournie.'}</p>
                </div>
              </div>

              <div className="admin-manuscripts-modal__section">
                <h3>Changer le statut</h3>
                <div className="admin-manuscripts-modal__status-actions">
                  <button
                    onClick={() => updateManuscriptStatus(selectedManuscript.id, 'PENDING')}
                    className="admin-manuscripts-modal__status-btn pending"
                  >
                    En attente
                  </button>
                  <button
                    onClick={() => updateManuscriptStatus(selectedManuscript.id, 'REVIEWING')}
                    className="admin-manuscripts-modal__status-btn review"
                  >
                    En examen
                  </button>
                  <button
                    onClick={() => updateManuscriptStatus(selectedManuscript.id, 'ACCEPTED')}
                    className="admin-manuscripts-modal__status-btn accepted"
                  >
                    Accepter
                  </button>
                  <button
                    onClick={() => updateManuscriptStatus(selectedManuscript.id, 'REJECTED')}
                    className="admin-manuscripts-modal__status-btn rejected"
                  >
                    Refuser
                  </button>
                </div>
              </div>

              <div className="admin-manuscripts-modal__actions">
                <button
                  onClick={() => deleteManuscript(selectedManuscript.id)}
                  className="admin-manuscripts-modal__btn-delete"
                >
                  <i className="fas fa-trash-alt" />
                  Supprimer ce manuscrit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManuscripts;
