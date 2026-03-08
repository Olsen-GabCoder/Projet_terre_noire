// frontend/src/pages/Home.jsx
import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import bookService from '../services/bookService';
import BookCard from '../components/BookCard';
import '../styles/Home.css';

const TAGLINES = [
  'Là où chaque page ouvre un monde',
  'Des histoires qui inspirent, des auteurs qui marquent',
  'L\'édition au service de la littérature',
];

const Home = () => {
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [taglineIdx, setTaglineIdx] = useState(0);
  const [taglinePhase, setTaglinePhase] = useState('in');
  const [heroReady, setHeroReady] = useState(false);

  useEffect(() => {
    loadHomeData();
    requestAnimationFrame(() => setHeroReady(true));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setTaglinePhase('out');
      setTimeout(() => {
        setTaglineIdx((prev) => (prev + 1) % TAGLINES.length);
        setTaglinePhase('in');
      }, 500);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadHomeData = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await bookService.getBooks({ page_size: 24 });
      setBooks(res.results || res);
    } catch (err) {
      console.error('Erreur chargement:', err);
      setError('Impossible de charger les données. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const authorIds = new Set(books.map(b => typeof b.author === 'object' ? b.author?.id : b.author));
    const categoryIds = new Set(books.map(b => typeof b.category === 'object' ? b.category?.id : b.category));
    return {
      books: books.length,
      authors: authorIds.size,
      categories: categoryIds.size,
    };
  }, [books]);

  // Toujours afficher le hero et la structure ; loading/erreur uniquement dans la section livres
  const heroSection = (
    <section className="home-hero">
      <div className="home-hero-orb home-hero-orb--1" />
      <div className="home-hero-orb home-hero-orb--2" />
      <div className="home-hero-orb home-hero-orb--3" />
      <div className="home-hero-grid-bg" />

      <div className={`home-hero-inner ${heroReady ? 'is-ready' : ''}`}>
        <div className="home-hero-line" />
        <h1 className={`home-hero-tagline phase-${taglinePhase}`}>
          {TAGLINES[taglineIdx]}
        </h1>
        <p className="home-hero-sub">
          Romans, essais, poésie et bien plus — nous publions des voix singulières
          et les portons au-delà des frontières.
        </p>
        <div className="home-hero-actions">
          <Link to="/catalog" className="home-hero-cta">
            <i className="fas fa-book-open" />
            <span>Explorer le catalogue</span>
          </Link>
          <Link to="/submit-manuscript" className="home-hero-cta home-hero-cta--outline">
            <i className="fas fa-pen-nib" />
            <span>Soumettre un manuscrit</span>
          </Link>
        </div>
        <div className="home-hero-stats">
          {[
            { value: `${stats.books}+`, label: 'Ouvrages' },
            { value: `${stats.authors}+`, label: 'Auteurs' },
            { value: `${stats.categories}`, label: 'Genres' },
          ].map((s, i) => (
            <div className="home-hero-stat" key={s.label} style={{ animationDelay: `${0.9 + i * 0.12}s` }}>
              <span className="home-hero-stat__value">{s.value}</span>
              <span className="home-hero-stat__label">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );

  const booksSection = loading ? (
    <section className="home-books">
      <div className="home-books-inner">
        <div className="home-books-heading">
          <span className="home-books-label">Nos publications</span>
          <h2 className="home-books-title">Découvrez nos livres</h2>
        </div>
        <div className="home-loading home-loading--inline">
          <div className="spinner" />
          <p>Chargement des livres...</p>
        </div>
      </div>
    </section>
  ) : error ? (
    <section className="home-books">
      <div className="home-books-inner">
        <div className="home-books-heading">
          <span className="home-books-label">Nos publications</span>
          <h2 className="home-books-title">Découvrez nos livres</h2>
        </div>
        <div className="home-error home-error--inline">
          <p>{error}</p>
          <button type="button" onClick={loadHomeData} className="btn-retry">Réessayer</button>
        </div>
      </div>
    </section>
  ) : (
    <section className="home-books">
      <div className="home-books-inner">
        <div className="home-books-heading">
          <span className="home-books-label">Nos publications</span>
          <h2 className="home-books-title">Découvrez nos livres</h2>
        </div>
        <div className="home-books-grid">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
        {books.length >= 24 && (
          <div className="home-books-more">
            <Link to="/catalog" className="home-books-more-link">Voir tout le catalogue</Link>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div className="home-page">
      {heroSection}
      {booksSection}
      <div className="home-footer-fade" />
    </div>
  );
};

export default Home;
