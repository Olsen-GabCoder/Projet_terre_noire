import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import socialService from '../services/socialService';
import bookService from '../services/bookService';
import { handleApiError } from '../services/api';
import SEO from '../components/SEO';
import toast from 'react-hot-toast';
import '../styles/BookClubs.css';

const CATEGORIES = [
  { value: 'GENERAL', label: 'Général', icon: 'fas fa-book-open' },
  { value: 'ROMAN', label: 'Romans', icon: 'fas fa-feather-alt' },
  { value: 'POESIE', label: 'Poésie', icon: 'fas fa-pen-fancy' },
  { value: 'ESSAI', label: 'Essais & Non-fiction', icon: 'fas fa-graduation-cap' },
  { value: 'JEUNESSE', label: 'Littérature jeunesse', icon: 'fas fa-child' },
  { value: 'SF_FANTASY', label: 'Science-fiction & Fantasy', icon: 'fas fa-rocket' },
  { value: 'POLAR', label: 'Policier & Thriller', icon: 'fas fa-user-secret' },
  { value: 'BD_MANGA', label: 'BD & Manga', icon: 'fas fa-icons' },
  { value: 'CLASSIQUES', label: 'Classiques', icon: 'fas fa-landmark' },
  { value: 'AFRICAIN', label: 'Littérature africaine', icon: 'fas fa-globe-africa' },
  { value: 'DEVELOPPEMENT', label: 'Développement personnel', icon: 'fas fa-brain' },
  { value: 'AUTRE', label: 'Autre', icon: 'fas fa-ellipsis-h' },
];

const FREQUENCIES = [
  { value: 'WEEKLY', label: 'Hebdomadaire', desc: 'Un échange chaque semaine' },
  { value: 'BIWEEKLY', label: 'Bimensuel', desc: 'Tous les 15 jours' },
  { value: 'MONTHLY', label: 'Mensuel', desc: 'Un livre par mois' },
  { value: 'FLEXIBLE', label: 'Flexible', desc: 'À votre rythme' },
];

const LANGUAGES = [
  { value: 'FR', label: 'Français' },
  { value: 'EN', label: 'Anglais' },
  { value: 'AR', label: 'Arabe' },
  { value: 'PT', label: 'Portugais' },
  { value: 'ES', label: 'Espagnol' },
];

const BookClubCreate = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const coverInputRef = useRef(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    categories: [],
    rules: '',
    meeting_frequency: 'MONTHLY',
    languages: ['FR'],
    tags: '',
    is_public: true,
    max_members: 50,
  });

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  // Recherche de livre (optionnel)
  const [bookSearch, setBookSearch] = useState('');
  const [bookResults, setBookResults] = useState([]);
  const [searchingBooks, setSearchingBooks] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);

  // Recherche livres avec debounce
  useEffect(() => {
    if (bookSearch.length < 2) { setBookResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchingBooks(true);
      try {
        const res = await bookService.searchBooks(bookSearch);
        const books = Array.isArray(res.data) ? res.data : res.data.results || [];
        setBookResults(books.slice(0, 6));
      } catch { setBookResults([]); }
      setSearchingBooks(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [bookSearch]);

  const handleCoverChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('pages.bookClubCreate.imageTooLarge'));
      return;
    }
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const toggleCategory = (cat) => {
    setForm(prev => ({
      ...prev,
      categories: prev.categories.includes(cat)
        ? prev.categories.filter(c => c !== cat)
        : [...prev.categories, cat],
    }));
  };

  const toggleLanguage = (lang) => {
    setForm(prev => ({
      ...prev,
      languages: prev.languages.includes(lang)
        ? prev.languages.filter(l => l !== lang)
        : [...prev.languages, lang],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.name.trim()) { setError('Le nom du club est requis.'); return; }
    if (form.description.trim().length < 20) { setError('La description doit contenir au moins 20 caractères.'); return; }

    setCreating(true);
    try {
      const data = new FormData();
      data.append('name', form.name);
      data.append('description', form.description);
      if (form.categories.length) data.append('category', JSON.stringify(form.categories));
      data.append('meeting_frequency', form.meeting_frequency);
      data.append('is_public', form.is_public);
      data.append('max_members', form.max_members);
      if (form.rules.trim()) data.append('rules', form.rules);
      if (form.languages.length) data.append('languages', JSON.stringify(form.languages));
      if (form.tags.trim()) {
        const tagsList = form.tags.split(',').map(t => t.trim()).filter(Boolean);
        data.append('tags', JSON.stringify(tagsList));
      }
      if (selectedBook) data.append('current_book', selectedBook.id);
      if (coverFile) data.append('cover_image', coverFile);

      await socialService.createClub(data);
      toast.success('Club créé avec succès !');
      navigate('/clubs');
    } catch (err) {
      setError(handleApiError(err));
    }
    setCreating(false);
  };

  return (
    <div className="club-create">
      <SEO title="Créer un Club de Lecture" />

      <div className="club-create__top">
        <Link to="/clubs" className="club-create__back">
          <i className="fas fa-arrow-left" /> Retour aux clubs
        </Link>
        <h1>Créer un club de lecture</h1>
        <p>Rassemblez des lecteurs passionnés autour de vos thèmes favoris.</p>
      </div>

      <form onSubmit={handleSubmit} className="club-create__form">
        {error && (
          <div className="club-create__error">
            <i className="fas fa-exclamation-circle" /> {error}
          </div>
        )}

        {/* ── Section 1 : Identité ── */}
        <section className="club-create__section">
          <h2><span className="club-create__step">1</span> Identité du club</h2>

          {/* Photo de profil circulaire */}
          <div className="club-create__avatar-wrapper">
            <div className="club-create__avatar" onClick={() => coverInputRef.current?.click()}>
              {coverPreview ? (
                <img src={coverPreview} alt="Photo du club" />
              ) : (
                <div className="club-create__avatar-placeholder">
                  <i className="fas fa-camera" />
                </div>
              )}
              <div className="club-create__avatar-overlay">
                <i className="fas fa-pen" />
              </div>
            </div>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              style={{ display: 'none' }}
            />
            <div className="club-create__avatar-text">
              <span>Photo du club</span>
              <small>JPG, PNG — max 5 MB</small>
            </div>
          </div>

          {/* Nom */}
          <div className="club-create__field">
            <label htmlFor="club-name">Nom du club <span className="required">*</span></label>
            <input
              id="club-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Ex: Les Lecteurs de Libreville, Club Polar du Golfe..."
              maxLength={200}
              required
            />
            <div className="club-create__field-footer">
              <span>Choisissez un nom qui reflète l'esprit de votre communauté</span>
              <span>{form.name.length}/200</span>
            </div>
          </div>

          {/* Description */}
          <div className="club-create__field">
            <label htmlFor="club-desc">Description <span className="required">*</span></label>
            <textarea
              id="club-desc"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Présentez votre club : quels sont ses objectifs ? Quel type de lecteurs cherchez-vous ? Quels thèmes allez-vous explorer ?"
              rows={5}
              required
            />
            <div className="club-create__field-footer">
              <span>Minimum 20 caractères</span>
              <span>{form.description.length} caractères</span>
            </div>
          </div>
        </section>

        {/* ── Section 2 : Thème & Catégorie ── */}
        <section className="club-create__section">
          <h2><span className="club-create__step">2</span> Thème & Préférences</h2>

          {/* Catégories (multi-sélection) */}
          <div className="club-create__field">
            <label>Thèmes du club <span className="optional">(sélectionnez un ou plusieurs)</span></label>
            <div className="club-create__categories">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  className={`club-create__cat-btn ${form.categories.includes(cat.value) ? 'active' : ''}`}
                  onClick={() => toggleCategory(cat.value)}
                >
                  <i className={cat.icon} />
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
            {form.categories.length > 0 && (
              <div className="club-create__field-footer">
                <span>{form.categories.length} thème{form.categories.length > 1 ? 's' : ''} sélectionné{form.categories.length > 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="club-create__field">
            <label htmlFor="club-tags">Tags / Mots-clés</label>
            <input
              id="club-tags"
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              placeholder="Ex: afrique, femmes-auteurs, poésie (séparés par des virgules)"
            />
            <div className="club-create__field-footer">
              <span>Aidez les lecteurs à trouver votre club</span>
            </div>
          </div>

          {/* Langues */}
          <div className="club-create__field">
            <label>Langues du club</label>
            <div className="club-create__lang-pills">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.value}
                  type="button"
                  className={`club-create__lang-pill ${form.languages.includes(lang.value) ? 'active' : ''}`}
                  onClick={() => toggleLanguage(lang.value)}
                >
                  {lang.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 3 : Fonctionnement ── */}
        <section className="club-create__section">
          <h2><span className="club-create__step">3</span> Fonctionnement</h2>

          {/* Fréquence */}
          <div className="club-create__field">
            <label>Rythme des échanges</label>
            <div className="club-create__freq-grid">
              {FREQUENCIES.map(freq => (
                <button
                  key={freq.value}
                  type="button"
                  className={`club-create__freq-btn ${form.meeting_frequency === freq.value ? 'active' : ''}`}
                  onClick={() => setForm({ ...form, meeting_frequency: freq.value })}
                >
                  <strong>{freq.label}</strong>
                  <span>{freq.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="club-create__row">
            {/* Visibilité */}
            <div className="club-create__field club-create__field--half">
              <label htmlFor="club-visibility">Visibilité</label>
              <select
                id="club-visibility"
                value={form.is_public ? 'public' : 'private'}
                onChange={(e) => setForm({ ...form, is_public: e.target.value === 'public' })}
              >
                <option value="public">Public — ouvert à tous</option>
                <option value="private">Privé — sur invitation</option>
              </select>
            </div>

            {/* Max membres */}
            <div className="club-create__field club-create__field--half">
              <label htmlFor="club-max">Nombre max de membres</label>
              <input
                id="club-max"
                type="number"
                value={form.max_members}
                onChange={(e) => setForm({ ...form, max_members: parseInt(e.target.value) || 10 })}
                min={2}
                max={500}
              />
            </div>
          </div>

          {/* Règles */}
          <div className="club-create__field">
            <label htmlFor="club-rules">Règles du club <span className="optional">(optionnel)</span></label>
            <textarea
              id="club-rules"
              value={form.rules}
              onChange={(e) => setForm({ ...form, rules: e.target.value })}
              placeholder="Ex: Respecter les avis de chacun, pas de spoilers sans prévenir, un livre minimum par mois..."
              rows={3}
            />
          </div>
        </section>

        {/* ── Section 4 : Livre en cours (optionnel) ── */}
        <section className="club-create__section">
          <h2><span className="club-create__step">4</span> Premier livre en discussion <span className="optional">(optionnel)</span></h2>
          <p className="club-create__section-desc">
            Vous pourrez toujours changer le livre en cours de discussion plus tard.
          </p>

          {selectedBook ? (
            <div className="club-create__selected-book">
              <div className="club-create__book-cover">
                {selectedBook.cover_image ? (
                  <img src={selectedBook.cover_image} alt={selectedBook.title} />
                ) : (
                  <i className="fas fa-book" />
                )}
              </div>
              <div className="club-create__book-info">
                <strong>{selectedBook.title}</strong>
                <span>{selectedBook.author?.full_name || selectedBook.author_name || ''}</span>
              </div>
              <button type="button" className="club-create__book-remove" onClick={() => { setSelectedBook(null); setBookSearch(''); }}>
                <i className="fas fa-times" /> Retirer
              </button>
            </div>
          ) : (
            <div className="club-create__book-search">
              <div className="club-create__search-input">
                <i className="fas fa-search" />
                <input
                  type="text"
                  value={bookSearch}
                  onChange={(e) => setBookSearch(e.target.value)}
                  placeholder="Rechercher un livre par titre..."
                />
                {searchingBooks && <div className="club-create__search-spinner" />}
              </div>
              {bookResults.length > 0 && (
                <div className="club-create__search-results">
                  {bookResults.map(book => (
                    <button key={book.id} type="button" className="club-create__search-item" onClick={() => { setSelectedBook(book); setBookSearch(''); setBookResults([]); }}>
                      <div className="club-create__search-cover">
                        {book.cover_image ? <img src={book.cover_image} alt={book.title} /> : <i className="fas fa-book" />}
                      </div>
                      <div>
                        <strong>{book.title}</strong>
                        <span>{book.author?.full_name || book.author_name || ''}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Actions ── */}
        <div className="club-create__actions">
          <button type="button" className="club-create__cancel" onClick={() => navigate('/clubs')}>
            Annuler
          </button>
          <button type="submit" className="club-create__submit" disabled={creating}>
            {creating ? (
              <><span className="club-create__spinner" /> Création en cours...</>
            ) : (
              <><i className="fas fa-rocket" /> Créer le club</>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default BookClubCreate;
