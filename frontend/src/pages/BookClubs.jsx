import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import socialService from '../services/socialService';
import aiService from '../services/aiService';
import { useAuth } from '../context/AuthContext';
import { CAT_KEYS } from '../components/club/clubUtils';
import SEO from '../components/SEO';
import '../styles/BookClubs.css';

const CATEGORY_LIST = Object.keys(CAT_KEYS).filter(c => c !== 'GENERAL');

function ClubRecommendations({ t }) {
  const [recs, setRecs] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const load = async () => {
    if (recs) { setOpen(o => !o); return; }
    setLoading(true);
    try {
      const { recommendations } = await aiService.recommendClubs(5);
      setRecs(recommendations || []);
      setOpen(true);
    } catch { /* silently fail — non-critical */ }
    setLoading(false);
  };

  return (
    <div className="clubs-recs">
      <button className="clubs-recs__btn" onClick={load} disabled={loading}>
        {loading
          ? <><i className="fas fa-spinner fa-spin" /> {t('pages.bookClubs.loadingRecs', 'Analyse...')}</>
          : open
            ? <><i className="fas fa-chevron-up" /> {t('pages.bookClubs.hideRecs', 'Masquer les suggestions')}</>
            : <><i className="fas fa-robot" /> {t('pages.bookClubs.aiRecs', 'Clubs suggérés pour vous')}</>
        }
      </button>
      {open && recs?.length > 0 && (
        <div className="clubs-recs__grid">
          {recs.map((r, i) => (
            <Link key={i} to={`/clubs/${r.club?.slug || r.club_id}`} className="clubs-recs__card">
              {r.club?.cover_image && <img src={r.club.cover_image} alt="" className="clubs-recs__cover" />}
              <div className="clubs-recs__info">
                <strong>{r.club?.name || `Club #${r.club_id}`}</strong>
                {r.club?.current_book?.title && (
                  <span className="clubs-recs__book"><i className="fas fa-book" /> {r.club.current_book.title}</span>
                )}
                {r.club?.members_count != null && (
                  <span className="clubs-recs__members"><i className="fas fa-users" /> {r.club.members_count}</span>
                )}
                <p className="clubs-recs__reason">{r.reason}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
      {open && recs?.length === 0 && (
        <p className="clubs-recs__empty">{t('pages.bookClubs.noRecs', 'Aucune suggestion pour le moment. Achetez ou empruntez des livres pour affiner les recommandations.')}</p>
      )}
    </div>
  );
}

const BookClubs = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('all'); // 'all' | 'mine'
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const searchTimer = useRef(null);

  const fetchClubs = useCallback(async (filter, searchQuery, category) => {
    setLoading(true);
    setError('');
    try {
      const params = filter === 'mine' ? { my_clubs: true } : {};
      if (searchQuery) params.search = searchQuery;
      if (category) params.category = category;
      const res = await socialService.getClubs(params);
      const data = res.data;
      setClubs(Array.isArray(data) ? data : data?.results || []);
    } catch (err) {
      setError(t('pages.bookClubs.errorLoad'));
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    fetchClubs(tab, search, activeCategory);
  }, [tab, activeCategory, fetchClubs]);

  // Debounced search
  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      fetchClubs(tab, search, activeCategory);
    }, 400);
    return () => clearTimeout(searchTimer.current);
  }, [search]);

  const switchTab = (newTab) => {
    if (newTab !== tab) setTab(newTab);
  };

  return (
    <div className="clubs-page">
      <SEO title={t('pages.bookClubs.seoTitle')} description={t('pages.bookClubs.seoDescription')} />

      {/* Header */}
      <div className="clubs-page__header">
        <div className="clubs-page__header-text">
          <h1>{t('pages.bookClubs.title')}</h1>
          <p>{t('pages.bookClubs.subtitle')}</p>
        </div>
        {user && (
          <Link to="/clubs/create" className="clubs-page__create-btn">
            <i className="fas fa-plus-circle" /> {t('pages.bookClubs.createClub')}
          </Link>
        )}
      </div>

      {/* AI Club Recommendations */}
      {user && <ClubRecommendations t={t} />}

      {/* Tabs — Tous / Mes clubs */}
      {user && (
        <div className="clubs-page__tabs">
          <button
            className={`clubs-page__tab ${tab === 'all' ? 'active' : ''}`}
            onClick={() => switchTab('all')}
          >
            <i className="fas fa-globe" /> {t('pages.bookClubs.allClubs', 'Tous les clubs')}
          </button>
          <button
            className={`clubs-page__tab ${tab === 'mine' ? 'active' : ''}`}
            onClick={() => switchTab('mine')}
          >
            <i className="fas fa-bookmark" /> {t('pages.bookClubs.myClubs', 'Mes clubs')}
          </button>
        </div>
      )}

      {/* Search + Category filters */}
      <div className="clubs-page__filters">
        <div className="clubs-page__search">
          <i className="fas fa-search" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('pages.bookClubs.searchPlaceholder', 'Rechercher un club...')}
          />
          {search && (
            <button className="clubs-page__search-clear" onClick={() => setSearch('')} aria-label="Clear">
              <i className="fas fa-times" />
            </button>
          )}
        </div>
        <div className="clubs-page__categories">
          {CATEGORY_LIST.map(cat => (
            <button
              key={cat}
              className={`clubs-page__cat${activeCategory === cat ? ' clubs-page__cat--active' : ''}`}
              onClick={() => setActiveCategory(prev => prev === cat ? '' : cat)}
            >
              {t(CAT_KEYS[cat])}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="dashboard-loading"><div className="admin-spinner" /></div>
      )}

      {/* Error */}
      {!loading && error && (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--fl-muted)' }}>
          <p>{error}</p>
          <Link to="/">{t('common.back')}</Link>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && clubs.length === 0 && (
        <div className="clubs-page__empty">
          <div className="clubs-page__empty-icon"><i className="fas fa-users" /></div>
          <h2>{tab === 'mine' ? t('pages.bookClubs.noMyClubs', "Vous n'avez rejoint aucun club") : t('pages.bookClubs.emptyTitle')}</h2>
          <p>{tab === 'mine' ? t('pages.bookClubs.noMyClubsDesc', 'Explorez les clubs et rejoignez ceux qui vous intéressent.') : t('pages.bookClubs.emptyText')}</p>
          {tab === 'mine' ? (
            <button className="clubs-page__create-btn" onClick={() => switchTab('all')}>
              <i className="fas fa-compass" /> {t('pages.bookClubs.exploreClubs', 'Explorer les clubs')}
            </button>
          ) : user && (
            <Link to="/clubs/create" className="clubs-page__create-btn">
              <i className="fas fa-plus-circle" /> {t('pages.bookClubs.createFirst')}
            </Link>
          )}
        </div>
      )}

      {/* Grid */}
      {!loading && !error && clubs.length > 0 && (
        <div className="clubs-page__grid">
          {clubs.map((club) => (
            <Link key={club.id} to={`/clubs/${club.slug || club.id}`} className="club-card">
              <div className="club-card__top-row">
                <div className="club-card__avatar">
                  {club.cover_image ? (
                    <img src={club.cover_image} alt={club.name} />
                  ) : (
                    <div className="club-card__avatar-placeholder"><i className="fas fa-users" /></div>
                  )}
                </div>
                <div className="club-card__badges">
                  {/* Badge non-lus */}
                  {club.unread_count > 0 && (
                    <span className="club-card__badge club-card__badge--unread">
                      {club.unread_count > 99 ? '99+' : club.unread_count}
                    </span>
                  )}
                  <span className={`club-card__badge ${club.is_public ? 'club-card__badge--public' : 'club-card__badge--private'}`}>
                    <i className={`fas ${club.is_public ? 'fa-globe' : 'fa-lock'}`} />
                    {club.is_public ? t('pages.bookClubs.public') : t('pages.bookClubs.private')}
                  </span>
                  {club.category?.length > 0 && club.category.filter(c => c !== 'GENERAL').slice(0, 2).map((cat, i) => (
                    <span key={i} className="club-card__badge club-card__badge--category">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
              <div className="club-card__body">
                <h3>{club.name}</h3>
                {club.current_book && (
                  <p className="club-card__book">
                    <i className="fas fa-book" /> {t('pages.bookClubs.currentlyReading')} {club.current_book.title || club.current_book_title}
                  </p>
                )}
                {club.description && (
                  <p className="club-card__desc">{club.description.slice(0, 120)}{club.description.length > 120 ? '...' : ''}</p>
                )}
                {club.tags?.length > 0 && (
                  <div className="club-card__tags">
                    {club.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="club-card__tag">#{tag}</span>
                    ))}
                  </div>
                )}
                <div className="club-card__footer">
                  <span className={`club-card__members${club.max_members && club.members_count >= club.max_members ? ' club-card__members--full' : ''}`}>
                    <i className="fas fa-users" /> {club.members_count}{club.max_members ? ` / ${club.max_members}` : ''}
                  </span>
                  {club.max_members && club.members_count >= club.max_members && (
                    <span className="club-card__badge club-card__badge--full">
                      {t('pages.bookClubs.clubFull', 'Complet')}
                    </span>
                  )}
                  <span className="club-card__freq">
                    <i className="fas fa-calendar-alt" /> {club.frequency_display}
                  </span>
                  <button
                    className="club-card__share"
                    title={t('pages.bookClubs.shareWhatsApp', 'Partager sur WhatsApp')}
                    onClick={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      const url = `${window.location.origin}/clubs/${club.slug || club.id}`;
                      const text = encodeURIComponent(`${t('pages.bookClubs.shareText', { clubName: club.name, defaultValue: `Découvre le club "${club.name}" sur Frollot !` })}\n${url}`);
                      window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
                    }}
                  >
                    <i className="fab fa-whatsapp" />
                  </button>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default BookClubs;
