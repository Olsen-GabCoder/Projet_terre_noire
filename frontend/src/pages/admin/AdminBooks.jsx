import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import '../../styles/AdminBooks.css';

const AdminBooks = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [authors, setAuthors] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingAuthors, setLoadingAuthors] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [addingCategory, setAddingCategory] = useState(false);
  const [addCategoryError, setAddCategoryError] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    author: '',
    description: '',
    price: '',
    original_price: '',
    reference: '',
    format: 'PAPIER',
    available: true,
    is_bestseller: false,
    category: '',
    cover_image: null,
  });

  useEffect(() => {
    fetchBooks();
    fetchAuthors();
    fetchCategories();
  }, []);

  const fetchBooks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/books/');
      setBooks(res.data.results || res.data);
    } catch (err) {
      console.error('Erreur chargement livres:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuthors = async () => {
    try {
      setLoadingAuthors(true);
      const res = await api.get('/authors/');
      setAuthors(res.data.results || res.data);
    } catch (err) {
      console.error('Erreur chargement auteurs:', err);
    } finally {
      setLoadingAuthors(false);
    }
  };

  const fetchCategories = async () => {
    try {
      setLoadingCategories(true);
      const res = await api.get('/categories/', { params: { page_size: 100 } });
      setCategories(res.data.results || res.data || []);
    } catch (err) {
      console.error('Erreur chargement catégories:', err);
      setCategories([]);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileChange = (e) => {
    setFormData(prev => ({
      ...prev,
      cover_image: e.target.files[0]
    }));
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setAddCategoryError(null);
    setAddingCategory(true);
    try {
      const res = await api.post('/categories/', { name });
      const created = res.data;
      await fetchCategories();
      setFormData(prev => ({ ...prev, category: String(created.id) }));
      setNewCategoryName('');
    } catch (err) {
      const msg = err.response?.data?.name?.[0] || err.response?.data?.detail || err.message;
      setAddCategoryError(msg || 'Erreur lors de l\'ajout de la catégorie.');
    } finally {
      setAddingCategory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const data = new FormData();
    Object.keys(formData).forEach(key => {
      const value = formData[key];
      if (key === 'cover_image' && value === null) return;
      if (typeof value === 'boolean') {
        data.append(key, value.toString());
      } else if (value !== '' && value !== null && value !== undefined) {
        data.append(key, value);
      }
    });

    try {
      if (editingBook) {
        await api.patch(`/books/${editingBook.id}/`, data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/books/', data, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      fetchBooks();
      resetForm();
    } catch (err) {
      console.error('Erreur sauvegarde livre:', err);
      alert(`Erreur lors de la sauvegarde: ${err.response?.data?.detail || err.message}`);
    }
  };

  const handleEdit = (book) => {
    setEditingBook(book);
    setFormData({
      title: book.title || '',
      author: book.author?.id || book.author || '',
      description: book.description || '',
      price: book.price || '',
      original_price: book.original_price || '',
      reference: book.reference || '',
      format: book.format || 'PAPIER',
      available: book.available ?? true,
      is_bestseller: book.is_bestseller || false,
      category: book.category?.id || book.category || '',
      cover_image: null,
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce livre ?')) return;
    try {
      await api.delete(`/books/${id}/`);
      fetchBooks();
    } catch (err) {
      console.error('Erreur suppression:', err);
      alert('Erreur lors de la suppression');
    }
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingBook(null);
    setFormData({
      title: '',
      author: '',
      description: '',
      price: '',
      original_price: '',
      reference: '',
      format: 'PAPIER',
      available: true,
      is_bestseller: false,
      category: '',
      cover_image: null,
    });
  };

  const formatPrice = (price) => {
    return Number(price || 0).toLocaleString('fr-FR') + ' FCFA';
  };

  const getAuthorName = (book) => {
    return book.author?.full_name || book.author?.name || 'N/A';
  };

  const getCategoryName = (book) => {
    return book.category?.name || 'N/A';
  };

  if (loading || loadingAuthors || loadingCategories) {
    return (
      <div className="admin-books-loading">
        Chargement...
      </div>
    );
  }

  return (
    <div className="admin-books-page">
      <section className="admin-books-hero">
        <div className="admin-books-hero__orb admin-books-hero__orb--1" />
        <div className="admin-books-hero__orb admin-books-hero__orb--2" />
        <div className="admin-books-hero__grid-bg" />
        <div className="admin-books-hero__inner">
          <div className="admin-books-hero__line" />
          <h1 className="admin-books-hero__title">Gestion des Livres</h1>
          <p className="admin-books-hero__sub">
            Créez et modifiez les ouvrages de votre catalogue. Gérez les prix, promotions et disponibilités.
          </p>
          <div className="admin-books-hero__actions">
            <Link to="/admin-dashboard" className="admin-books-hero__back">
              <i className="fas fa-arrow-left" />
              Retour
            </Link>
            <button
              type="button"
              className={`admin-books-hero__btn admin-books-hero__btn--primary ${showForm ? 'outline' : ''}`}
              onClick={() => setShowForm(!showForm)}
            >
              <i className="fas fa-plus" />
              {showForm ? 'Annuler' : 'Ajouter un livre'}
            </button>
          </div>
        </div>
      </section>

      <div className="admin-books-hero-fade" />

      <section className="admin-books-content">
        <div className="admin-books-inner">
          {showForm && (
            <form className="admin-books-form" onSubmit={handleSubmit}>
              <h2>{editingBook ? 'Modifier le livre' : 'Nouveau livre'}</h2>
              <div className="form-grid">
                <div className="form-group">
                  <label>Titre *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Auteur *</label>
                  <select
                    name="author"
                    value={formData.author}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Sélectionner un auteur</option>
                    {authors.map(author => (
                      <option key={author.id} value={author.id}>
                        {author.full_name || `${author.first_name || ''} ${author.last_name || ''}`.trim() || author.id}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Catégorie *</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="">Sélectionner une catégorie</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <div className="form-add-category">
                    <span className="form-add-category-label">Ou ajouter une catégorie :</span>
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => { setNewCategoryName(e.target.value); setAddCategoryError(null); }}
                      placeholder="Ex: Roman graphique"
                      className="form-add-category-input"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      disabled={addingCategory || !newCategoryName.trim()}
                      className="form-add-category-btn"
                    >
                      {addingCategory ? 'Ajout…' : 'Ajouter'}
                    </button>
                  </div>
                  {addCategoryError && <p className="form-hint form-hint--error">{addCategoryError}</p>}
                  {!loadingCategories && categories.length === 0 && (
                    <p className="form-hint">Aucune catégorie. Créez-en une dans l’admin Django (Catégories) ou via l’API.</p>
                  )}
                </div>
                <div className="form-group">
                  <label>Format</label>
                  <select name="format" value={formData.format} onChange={handleInputChange}>
                    <option value="PAPIER">Papier</option>
                    <option value="EBOOK">Ebook</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Prix (FCFA) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="price"
                    value={formData.price}
                    onChange={handleInputChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Référence (ISBN)</label>
                  <input
                    type="text"
                    name="reference"
                    value={formData.reference}
                    onChange={handleInputChange}
                    placeholder="Ex: 978-2-1234-5678-9"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="4"
                    placeholder="Description du livre..."
                  />
                </div>
                <div className="form-group full-width">
                  <div className="promo-section">
                    <h4>Options de promotion et disponibilité</h4>
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        name="available"
                        id="available"
                        checked={formData.available}
                        onChange={handleInputChange}
                      />
                      <label htmlFor="available">Disponible à la vente</label>
                    </div>
                    <div className="checkbox-group">
                      <input
                        type="checkbox"
                        name="is_bestseller"
                        id="is_bestseller"
                        checked={formData.is_bestseller}
                        onChange={handleInputChange}
                      />
                      <label htmlFor="is_bestseller">Marquer comme Best-seller</label>
                    </div>
                    <div className="form-group form-group--promo-price">
                      <label>Prix original (pour promotion)</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        name="original_price"
                        value={formData.original_price}
                        onChange={handleInputChange}
                        placeholder="Laisser vide si pas de promotion"
                      />
                      <span className="form-hint">
                        Si rempli, ce prix barré sera affiché à côté du prix actuel
                      </span>
                    </div>
                  </div>
                </div>
                <div className="form-group full-width">
                  <label>Image de couverture</label>
                  <input type="file" accept="image/*" onChange={handleFileChange} />
                  <span className="form-hint">
                    {editingBook ? "Laisser vide pour conserver l'image actuelle" : 'Image recommandée: 400x600px, JPG ou PNG'}
                  </span>
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={resetForm} className="btn-secondary">
                  Annuler
                </button>
                <button type="submit" className="btn-primary">
                  {editingBook ? 'Mettre à jour' : 'Créer le livre'}
                </button>
              </div>
            </form>
          )}

          {/* Vue tableau — desktop */}
          <div className="admin-books-table admin-books-table--desktop">
            <table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Titre</th>
                  <th>Auteur</th>
                  <th>Catégorie</th>
                  <th>Prix</th>
                  <th>Disponible</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {books.map(book => (
                  <tr key={book.id}>
                    <td>
                      {book.cover_image ? (
                        <img src={book.cover_image} alt={book.title} className="book-thumb" />
                      ) : (
                        <div className="book-thumb-placeholder">
                          <i className="fas fa-book" />
                        </div>
                      )}
                    </td>
                    <td>
                      <strong>{book.title}</strong>
                      {book.is_bestseller && (
                        <div style={{ marginTop: '0.35rem' }}>
                          <span className="status-badge status-bestseller">Best-seller</span>
                        </div>
                      )}
                      {book.reference && (
                        <div className="admin-books-ref">
                          Ref: {book.reference}
                        </div>
                      )}
                    </td>
                    <td>{getAuthorName(book)}</td>
                    <td>{getCategoryName(book)}</td>
                    <td>
                      <div>
                        {book.original_price && Number(book.original_price) > 0 ? (
                          <>
                            <span className="price-original">{formatPrice(book.original_price)}</span>
                            <br />
                            <span className="price-current">{formatPrice(book.price)}</span>
                          </>
                        ) : (
                          <span>{formatPrice(book.price)}</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-badge ${book.available ? 'status-available' : 'status-unavailable'}`}>
                        {book.available ? 'Disponible' : 'Indisponible'}
                      </span>
                    </td>
                    <td>
                      {book.original_price && book.original_price > book.price && (
                        <span style={{ fontSize: '0.8125rem', color: 'var(--color-success)' }}>
                          Promo: -{Math.round((1 - book.price / book.original_price) * 100)}%
                        </span>
                      )}
                    </td>
                    <td className="actions">
                      <button onClick={() => handleEdit(book)} className="btn-edit" title="Modifier">
                        <i className="fas fa-pen" />
                      </button>
                      <button onClick={() => handleDelete(book.id)} className="btn-delete" title="Supprimer">
                        <i className="fas fa-trash-alt" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Vue cartes — mobile */}
          <div className="admin-books-mobile">
            {books.map(book => (
              <div key={book.id} className="admin-books-mobile-card">
                <div className="admin-books-mobile-card__top">
                  <div className="admin-books-mobile-card__cover">
                    {book.cover_image ? (
                      <img src={book.cover_image} alt={book.title} />
                    ) : (
                      <i className="fas fa-book" />
                    )}
                  </div>
                  <div className="admin-books-mobile-card__info">
                    <strong>{book.title}</strong>
                    <span className="admin-books-mobile-card__meta">{getAuthorName(book)} • {getCategoryName(book)}</span>
                    <span className="admin-books-mobile-card__price">
                      {book.original_price && Number(book.original_price) > 0 ? (
                        <>
                          <span className="admin-books-mobile-card__price-old">{formatPrice(book.original_price)}</span>
                          {' '}{formatPrice(book.price)}
                        </>
                      ) : (
                        formatPrice(book.price)
                      )}
                    </span>
                    <div className="admin-books-mobile-card__badges">
                      <span className={`status-badge ${book.available ? 'status-available' : 'status-unavailable'}`}>
                        {book.available ? 'Disponible' : 'Indisponible'}
                      </span>
                      {book.is_bestseller && (
                        <span className="status-badge status-bestseller">Best-seller</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="admin-books-mobile-card__actions">
                  <button type="button" onClick={() => handleEdit(book)} className="admin-books-mobile-card__btn admin-books-mobile-card__btn--edit">
                    <i className="fas fa-pen" />
                    Modifier
                  </button>
                  <button type="button" onClick={() => handleDelete(book.id)} className="admin-books-mobile-card__btn admin-books-mobile-card__btn--delete">
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

export default AdminBooks;
