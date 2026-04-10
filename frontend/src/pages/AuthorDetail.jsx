import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BookCard from '../components/BookCard';
import ShareButtons from '../components/ShareButtons';
import LoadingSpinner from '../components/LoadingSpinner';
import bookService from '../services/bookService';
import '../styles/AuthorDetail.css';
import '../styles/Home.css';
import PageHero from '../components/PageHero';

const AuthorDetail = () => {
  const { id } = useParams();
  const { t } = useTranslation();
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
        setError(t('pages.authorDetail.notFound'));
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
        <PageHero
          title={t('pages.authorDetail.notFound')}
          subtitle={error || t('pages.authorDetail.notFoundDesc')}
        >
          <Link to="/authors" className="authd-btn authd-btn--primary">
            <i className="fas fa-arrow-left" /> {t('pages.authorDetail.backToAuthors')}
          </Link>
        </PageHero>
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
        <div className="page-hero__grid-bg" />
        <div className="page-hero__orb page-hero__orb--1" />
        <div className="page-hero__orb page-hero__orb--2" />
        <div className="authd-hero__inner">
          <Link to="/authors" className="authd-back">
            <i className="fas fa-arrow-left" /> {t('pages.authorDetail.backToAuthors')}
          </Link>
          <div className="authd-hero__profile">
            <div className="authd-hero__avatar">
              {(author.display_photo || author.photo) ? (
                <img src={author.display_photo || author.photo} alt={author.display_name || author.full_name} loading="lazy" onError={handleAvatarError} />
              ) : null}
              <div className="authd-hero__initials" style={(author.display_photo || author.photo) ? { display: 'none' } : undefined}>
                {((author.display_name || author.full_name || '?').charAt(0)).toUpperCase()}
              </div>
            </div>
            <div className="authd-hero__info">
              <div className="authd-hero__line" />
              <h1 className="authd-hero__title">{author.display_name || author.full_name || t('pages.authorDetail.unknownAuthor')}</h1>
              <div className="authd-hero__meta-row">
                {(author.books_count || 0) > 0 && (
                  <p className="authd-hero__count">
                    <i className="fas fa-book" /> {author.books_count} {t((author.books_count || 0) > 1 ? 'pages.authorDetail.works' : 'pages.authorDetail.work')} {t((author.books_count || 0) > 1 ? 'pages.authorDetail.publishedPlural' : 'pages.authorDetail.published')}
                  </p>
                )}
                {author.is_registered && (
                  <span className="authd-hero__registered"><i className="fas fa-check-circle" /> Auteur inscrit sur Frollot</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="authd-hero-fade" />

      <ShareButtons book={{ title: author.display_name || author.full_name, description: author.display_bio || author.biography }} />

      {(author.display_bio || author.biography) && (
        <div className="authd-content">
          <div className="authd-bio">
            <h2>{t('pages.authorDetail.biography')}</h2>
            <p>{author.display_bio || author.biography}</p>
          </div>
        </div>
      )}

      <section className="home-books">
        <div className="home-books-inner">
          <div className="home-books-heading">
            <span className="home-books-label">{t('pages.authorDetail.publications')}</span>
            <h2 className="home-books-title">
              {books.length > 0 ? `${t('pages.authorDetail.booksBy')} ${author.display_name || author.full_name || t('pages.authorDetail.unknownAuthor')}` : t('pages.authorDetail.noBooks')}
            </h2>
          </div>
          {books.length === 0 ? (
            <p className="authd-books__empty">{t('pages.authorDetail.noBooksDesc')}</p>
          ) : (
            <>
              <div className="home-books-grid">
                {books.map((book) => (
                  <BookCard key={book.id} book={book} />
                ))}
              </div>
              <div className="home-books-more">
                <Link to={`/catalog?author=${author.id}`} className="home-books-more-link">
                  {t('pages.authorDetail.viewInCatalog')}
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
