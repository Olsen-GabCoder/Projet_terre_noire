import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { organizationAPI, handleApiError } from '../services/api';
import libraryService from '../services/libraryService';
import '../styles/Social.css';

const LibraryPage = () => {
  const { t } = useTranslation();
  const { slug } = useParams();
  const { user } = useAuth();
  const [library, setLibrary] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [membership, setMembership] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [registering, setRegistering] = useState(false);
  const [borrowing, setBorrowing] = useState(null);

  useEffect(() => {
    fetchLibrary();
  }, [slug]);

  const fetchLibrary = async () => {
    try {
      setLoading(true);
      // Trouver la bibliothèque par slug via les organisations
      const orgRes = await organizationAPI.list();
      const lib = orgRes.data.find
        ? orgRes.data.find((o) => o.slug === slug && o.org_type === 'BIBLIOTHEQUE')
        : null;

      if (!lib) {
        setError(t('pages.library.notFound'));
        return;
      }
      setLibrary(lib);

      // Charger le catalogue
      const catalogRes = await libraryService.catalog.list(lib.id);
      setCatalog(catalogRes.data.results || catalogRes.data);

      // Vérifier l'adhésion si connecté
      if (user) {
        try {
          const membRes = await libraryService.members.myMemberships();
          const data = membRes.data.results || membRes.data;
          const myMembership = data.find((m) => m.library === lib.id && m.is_active);
          setMembership(myMembership || null);
        } catch {
          // Pas d'adhésion
        }
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!user) return;
    try {
      setRegistering(true);
      await libraryService.members.register(library.id, {});
      await fetchLibrary();
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setRegistering(false);
    }
  };

  const handleBorrow = async (catalogItemId, loanType = 'PHYSICAL') => {
    try {
      setBorrowing(catalogItemId);
      await libraryService.loans.create(library.id, {
        catalog_item: catalogItemId,
        loan_type: loanType,
      });
      // Recharger le catalogue pour MAJ la dispo
      const catalogRes = await libraryService.catalog.list(library.id);
      setCatalog(catalogRes.data.results || catalogRes.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setBorrowing(null);
    }
  };

  const filteredCatalog = catalog.filter((item) =>
    !search || item.book_title?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="social-page" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="social-loading">{t('common.loading')}</div>
      </div>
    );
  }

  if (error && !library) {
    return (
      <div className="social-page" style={{ padding: '2rem' }}>
        <div className="social-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="social-page" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* En-tête bibliothèque */}
      <div style={{ marginBottom: '2rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{library.name}</h1>
        {library.description && (
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>{library.description}</p>
        )}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {library.city && (
            <span style={{ color: '#6b7280' }}>
              <i className="fas fa-map-marker-alt" /> {library.city}
            </span>
          )}
          {library.email && (
            <span style={{ color: '#6b7280' }}>
              <i className="fas fa-envelope" /> {library.email}
            </span>
          )}
        </div>

        {/* Bouton inscription */}
        {user && !membership && (
          <button
            onClick={handleRegister}
            disabled={registering}
            style={{
              marginTop: '1rem',
              padding: '0.6rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '0.95rem',
            }}
          >
            {registering ? t('pages.library.registering') : t('pages.library.registerButton')}
          </button>
        )}
        {!user && (
          <Link
            to="/login"
            style={{
              display: 'inline-block',
              marginTop: '1rem',
              padding: '0.6rem 1.5rem',
              backgroundColor: '#2563eb',
              color: 'white',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.95rem',
            }}
          >
            {t('pages.library.loginToRegister')}
          </Link>
        )}
        {membership && (
          <div style={{
            marginTop: '1rem',
            padding: '0.5rem 1rem',
            backgroundColor: '#ecfdf5',
            color: '#065f46',
            borderRadius: '6px',
            display: 'inline-block',
          }}>
            <i className="fas fa-check-circle" /> {t('pages.library.member')} — N° {membership.membership_number}
          </div>
        )}
      </div>

      {error && <div className="social-error" style={{ marginBottom: '1rem' }}>{error}</div>}

      {/* Recherche */}
      <div style={{ marginBottom: '1.5rem' }}>
        <input
          type="text"
          placeholder={t('pages.library.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '0.6rem 1rem',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '0.95rem',
          }}
        />
      </div>

      {/* Catalogue */}
      <h2 style={{ fontSize: '1.4rem', marginBottom: '1rem' }}>
        {t('pages.library.catalogCount', { count: filteredCatalog.length })}
      </h2>

      {filteredCatalog.length === 0 ? (
        <p style={{ color: '#6b7280' }}>{t('pages.library.emptycatalog')}</p>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '1.5rem',
        }}>
          {filteredCatalog.map((item) => (
            <div
              key={item.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden',
                backgroundColor: 'white',
              }}
            >
              {item.book_cover_image && (
                <img
                  src={item.book_cover_image}
                  alt={item.book_title}
                  style={{ width: '100%', height: '200px', objectFit: 'cover' }}
                />
              )}
              <div style={{ padding: '1rem' }}>
                <h3 style={{ fontSize: '1.1rem', marginBottom: '0.3rem' }}>
                  <Link to={`/books/${item.book}`} style={{ color: '#111827', textDecoration: 'none' }}>
                    {item.book_title}
                  </Link>
                </h3>
                {item.book_author && (
                  <p style={{ color: '#6b7280', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                    {item.book_author}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: '999px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: item.in_stock ? '#ecfdf5' : '#fef2f2',
                    color: item.in_stock ? '#065f46' : '#991b1b',
                  }}>
                    {item.in_stock ? t('pages.library.available', { count: item.available_copies }) : t('pages.library.unavailable')}
                  </span>
                  {item.allows_digital_loan && (
                    <span style={{
                      padding: '0.2rem 0.6rem',
                      borderRadius: '999px',
                      fontSize: '0.8rem',
                      backgroundColor: '#eff6ff',
                      color: '#1e40af',
                    }}>
                      {t('pages.library.digital')}
                    </span>
                  )}
                </div>
                <p style={{ color: '#6b7280', fontSize: '0.85rem', marginBottom: '0.75rem' }}>
                  {t('pages.library.maxLoan', { days: item.max_loan_days })}
                </p>

                {membership && item.in_stock && (
                  <button
                    onClick={() => handleBorrow(item.id)}
                    disabled={borrowing === item.id}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      backgroundColor: '#2563eb',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {borrowing === item.id ? t('pages.library.borrowing') : t('pages.library.borrow')}
                  </button>
                )}
                {membership && !item.in_stock && (
                  <button
                    onClick={async () => {
                      try {
                        await libraryService.reservations.create(library.id, { catalog_item: item.id });
                      } catch (err) {
                        setError(handleApiError(err));
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      backgroundColor: '#f59e0b',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                    }}
                  >
                    {t('pages.library.reserve')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LibraryPage;
