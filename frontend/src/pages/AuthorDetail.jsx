import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import BookCard from '../components/BookCard';
import LoadingSpinner from '../components/LoadingSpinner';
import bookService from '../services/bookService';
import '../styles/AuthorDetail.css';
import '../styles/Home.css';

const AuthorDetail = () => {
  const { id } = useParams();
  const [author, setAuthor] = useState(null);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        const [authorData, booksData] = await Promise.all([
          bookService.getAuthorById(id),
          bookService.getAuthorBooks(id),
        ]);
        setAuthor(authorData);
        setBooks(Array.isArray(booksData) ? booksData : booksData.results || []);
      } catch (err) {
        setError('Auteur non trouvé');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) return <LoadingSpinner fullPage />;

  if (error || !author) {
    return (
      <div className="authd-page">
        <section className="authd-hero authd-hero--error">
          <div className="authd-hero__inner">
            <h1 className="authd-hero__title">Auteur non trouvé</h1>
            <p className="authd-hero__sub">{error || 'Cet auteur n\'existe pas.'}</p>
            <Link to="/authors" className="authd-btn authd-btn--primary">
              <i className="fas fa-arrow-left" /> Retour aux auteurs
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const handleAvatarError = (e) => {
    e.target.style.display = 'none';
    const next = e.target.nextElementSibling;
    if (next) next.style.display = 'flex';
  };

  return (
    <div className="authd-page">
      <section className="authd-hero">
        <div className="authd-hero__orb authd-hero__orb--1" />
        <div className="authd-hero__grid-bg" />
        <div className="authd-hero__inner">
          <Link to="/authors" className="authd-back">
            <i className="fas fa-arrow-left" /> Retour aux auteurs
          </Link>
          <div className="authd-hero__profile">
            <div className="authd-hero__avatar">
              {author.photo ? (
                <img src={author.photo} alt={author.full_name} loading="lazy" onError={handleAvatarError} />
              ) : null}
              <div className="authd-hero__initials" style={author.photo ? { display: 'none' } : undefined}>
                {(author.full_name || '?').charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="authd-hero__info">
              <div className="authd-hero__line" />
              <h1 className="authd-hero__title">{author.full_name || 'Auteur inconnu'}</h1>
              {(author.books_count || 0) > 0 && (
                <p className="authd-hero__count">
                  <i className="fas fa-book" /> {author.books_count} ouvrage{(author.books_count || 0) > 1 ? 's' : ''} publié{(author.books_count || 0) > 1 ? 's' : ''}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="authd-hero-fade" />

      {author.biography && (
        <div className="authd-content">
          <div className="authd-bio">
            <h2>Biographie</h2>
            <p>{author.biography}</p>
          </div>
        </div>
      )}

      <section className="home-books">
        <div className="home-books-inner">
          <div className="home-books-heading">
            <span className="home-books-label">Publications</span>
            <h2 className="home-books-title">
              {books.length > 0 ? `Livres de ${author.full_name || 'cet auteur'}` : 'Aucun ouvrage'}
            </h2>
          </div>
          {books.length === 0 ? (
            <p className="authd-books__empty">Aucun ouvrage disponible pour le moment.</p>
          ) : (
            <>
              <div className="home-books-grid">
                {books.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
              <div className="home-books-more">
                <Link to={`/catalog?author=${author.id}`} className="home-books-more-link">
                  Voir tous ses livres dans le catalogue
                </Link>
              </div>
            </>
          )}
        </div>
      </section>
      <div className="home-footer-fade" />
    </div>
  );
};

export default AuthorDetail;
