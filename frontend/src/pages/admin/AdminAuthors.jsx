import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/AdminAuthors.css';

const AdminAuthors = () => {
  const [authors, setAuthors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingAuthor, setEditingAuthor] = useState(null);
  const [formData, setFormData] = useState({
    full_name: '',
    biography: '',
    photo: null,
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchAuthors();
  }, []);

  const fetchAuthors = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.get('/authors/');
      setAuthors(response.data.results || response.data);
    } catch (err) {
      console.error('Erreur chargement auteurs:', err);
      setError('Impossible de charger la liste des auteurs');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFormData(prev => ({ ...prev, photo: file }));

    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewImage(reader.result);
      reader.readAsDataURL(file);
    } else {
      setPreviewImage(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.full_name.trim()) {
      alert('Le nom de l\'auteur est obligatoire');
      return;
    }

    const data = new FormData();
    if (formData.full_name) data.append('full_name', formData.full_name);
    if (formData.biography) data.append('biography', formData.biography);
    if (formData.photo) data.append('photo', formData.photo);

    try {
      if (editingAuthor) {
        await api.patch(`/authors/${editingAuthor.id}/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/authors/', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      fetchAuthors();
      resetForm();
    } catch (err) {
      console.error('Erreur sauvegarde auteur:', err);
      const errorMsg = err.response?.data?.detail ||
        err.response?.data?.message ||
        'Erreur lors de la sauvegarde';
      alert(`Erreur: ${errorMsg}`);
    }
  };

  const handleEdit = (author) => {
    setEditingAuthor(author);
    setFormData({
      full_name: author.full_name || '',
      biography: author.biography || '',
      photo: null,
    });
    setPreviewImage(author.photo || null);
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet auteur ?')) return;
    try {
      await api.delete(`/authors/${id}/`);
      fetchAuthors();
    } catch (err) {
      console.error('Erreur suppression:', err);
      alert('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingAuthor(null);
    setFormData({ full_name: '', biography: '', photo: null });
    setPreviewImage(null);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="admin-authors-loading">
        Chargement des auteurs...
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-authors-error">
        {error}
      </div>
    );
  }

  return (
    <div className="admin-authors-page">
      <section className="admin-authors-hero">
        <div className="admin-authors-hero__orb admin-authors-hero__orb--1" />
        <div className="admin-authors-hero__orb admin-authors-hero__orb--2" />
        <div className="admin-authors-hero__grid-bg" />
        <div className="admin-authors-hero__inner">
          <div className="admin-authors-hero__line" />
          <h1 className="admin-authors-hero__title">Gestion des Auteurs</h1>
          <p className="admin-authors-hero__sub">
            Créez et modifiez les auteurs de votre catalogue. Chaque auteur peut être associé à plusieurs ouvrages.
          </p>
          <div className="admin-authors-hero__actions">
            <Link to="/admin-dashboard" className="admin-authors-hero__back">
              <i className="fas fa-arrow-left" />
              Retour
            </Link>
            <button
              type="button"
              className={`admin-authors-hero__btn admin-authors-hero__btn--primary ${showForm ? 'outline' : ''}`}
              onClick={() => setShowForm(!showForm)}
            >
              <i className="fas fa-plus" />
              {showForm ? 'Annuler' : 'Ajouter un auteur'}
            </button>
          </div>
        </div>
      </section>

      <div className="admin-authors-hero-fade" />

      <section className="admin-authors-content">
        <div className="admin-authors-inner">
          {showForm && (
            <form className="admin-authors-form" onSubmit={handleSubmit}>
              <h2>{editingAuthor ? 'Modifier l\'auteur' : 'Nouvel auteur'}</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nom complet *</label>
                  <input
                    type="text"
                    name="full_name"
                    value={formData.full_name}
                    onChange={handleInputChange}
                    placeholder="Ex: Victor Hugo"
                    required
                  />
                </div>
                <div className="form-group full-width">
                  <label>Biographie</label>
                  <textarea
                    name="biography"
                    value={formData.biography}
                    onChange={handleInputChange}
                    placeholder="Biographie de l'auteur..."
                    rows="5"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Photo de l'auteur</label>
                  <div className="image-upload-section">
                    <div className="image-preview">
                      {previewImage ? (
                        <img src={previewImage} alt="Prévisualisation" />
                      ) : (
                        <div className="default-avatar">
                          {(formData.full_name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <label className="file-upload-area">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                      />
                      <div className="upload-icon">📷</div>
                      <div className="upload-text">
                        {editingAuthor ? 'Changer la photo' : 'Ajouter une photo'}
                      </div>
                      <div className="upload-subtext">
                        Cliquez pour téléverser (JPG, PNG, max 5MB)
                      </div>
                    </label>
                    {editingAuthor?.photo && !formData.photo && (
                      <div className="upload-subtext">
                        Photo actuelle conservée
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {editingAuthor ? 'Mettre à jour' : 'Créer l\'auteur'}
                </button>
              </div>
            </form>
          )}

          {/* Vue tableau — desktop */}
          <div className="admin-authors-table admin-authors-table--desktop">
            <table>
              <thead>
                <tr>
                  <th>Photo</th>
                  <th>Nom</th>
                  <th>Biographie</th>
                  <th>Livres</th>
                  <th>Date d'ajout</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {authors.map(author => (
                  <tr key={author.id}>
                    <td>
                      {author.photo ? (
                        <img
                          src={author.photo}
                          alt={author.full_name}
                          className="author-photo"
                        />
                      ) : (
                        <div className="author-photo-placeholder">
                          {(author.full_name || '?').charAt(0).toUpperCase()}
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{author.full_name}</strong>
                      {author.slug && (
                        <div className="author-slug">{author.slug}</div>
                      )}
                    </td>
                    <td>
                      <div className="bio-excerpt">
                        {author.biography || 'Aucune biographie'}
                      </div>
                    </td>
                    <td>
                      <span className="books-badge">
                        <i className="fas fa-book" />
                        {author.books_count || 0} livre{(author.books_count || 0) !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td>{formatDate(author.created_at)}</td>
                    <td className="actions">
                      <button
                        onClick={() => handleEdit(author)}
                        className="btn-edit"
                        title="Modifier"
                      >
                        <i className="fas fa-pen" />
                      </button>
                      <button
                        onClick={() => handleDelete(author.id)}
                        className="btn-delete"
                        title="Supprimer"
                      >
                        <i className="fas fa-trash-alt" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vue cartes — mobile */}
          <div className="admin-authors-mobile">
            {authors.map(author => (
              <div key={author.id} className="admin-authors-mobile-card">
                <div className="admin-authors-mobile-card__top">
                  <div className="admin-authors-mobile-card__avatar">
                    {author.photo ? (
                      <img src={author.photo} alt={author.full_name} />
                    ) : (
                      <span>{(author.full_name || '?').charAt(0).toUpperCase()}</span>
                    )}
                  </div>
                  <div className="admin-authors-mobile-card__info">
                    <strong>{author.full_name}</strong>
                    <span className="admin-authors-mobile-card__books">
                      <i className="fas fa-book" />
                      {author.books_count || 0} livre{(author.books_count || 0) !== 1 ? 's' : ''}
                    </span>
                    <span className="admin-authors-mobile-card__date">{formatDate(author.created_at)}</span>
                  </div>
                </div>
                {(author.biography || '').trim() && (
                  <p className="admin-authors-mobile-card__bio">
                    {author.biography}
                  </p>
                )}
                <div className="admin-authors-mobile-card__actions">
                  <button
                    type="button"
                    onClick={() => handleEdit(author)}
                    className="admin-authors-mobile-card__btn admin-authors-mobile-card__btn--edit"
                  >
                    <i className="fas fa-pen" />
                    Modifier
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(author.id)}
                    className="admin-authors-mobile-card__btn admin-authors-mobile-card__btn--delete"
                  >
                    <i className="fas fa-trash-alt" />
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminAuthors;
