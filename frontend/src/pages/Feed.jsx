import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import socialService from '../services/socialService';
import PostCard from '../components/social/PostCard';
import PostComposer from '../components/social/PostComposer';
import { handleApiError } from '../services/api';
import SEO from '../components/SEO';
import PageHero from '../components/PageHero';
import '../styles/Feed.css';

const Feed = () => {
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [scope, setScope] = useState('public');

  const fetchPosts = useCallback(async (p = 1, s = scope) => {
    try {
      if (p > 1) setLoadingMore(true);
      else setLoading(true);
      const params = { page: p };
      if (s === 'public') params.scope = 'public';
      const res = await socialService.getFeed(params);
      const results = res.data.results || res.data;
      const arr = Array.isArray(results) ? results : [];
      if (p === 1) setPosts(arr);
      else setPosts(prev => [...prev, ...arr]);
      setHasMore(!!res.data.next);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [scope]);

  useEffect(() => { setPage(1); fetchPosts(1, scope); }, [scope, fetchPosts]);

  const handlePostCreated = () => { setPage(1); fetchPosts(1, scope); };
  const loadMore = () => { const next = page + 1; setPage(next); fetchPosts(next, scope); };

  const switchScope = (s) => {
    if (s === scope) return;
    setScope(s);
    setPosts([]);
    setError('');
  };

  return (
    <div className="feed">
      <SEO title={t('pages.feed.title', 'Feed')} description={t('pages.feed.heroDesc')} />

      {/* Hero */}
      <PageHero
        title={t('pages.feed.title', "Fil d'actualité")}
        subtitle={scope === 'public'
          ? t('pages.feed.heroDescPublic', "Découvrez les dernières publications de toute la communauté Frollot.")
          : t('pages.feed.heroDesc', "Recommandations, avis et actualités des auteurs, éditeurs et lecteurs que vous suivez.")
        }
        icon="fas fa-rss"
        className="feed__hero"
      />

      <div className="feed__body">
        {/* Scope toggle */}
        <div className="feed__scope">
          <button
            className={`feed__scope-btn ${scope === 'public' ? 'active' : ''}`}
            onClick={() => switchScope('public')}
          >
            <i className="fas fa-globe" aria-hidden="true" /> {t('pages.feed.scopePublic', 'Communauté')}
          </button>
          {isAuthenticated && (
            <button
              className={`feed__scope-btn ${scope === 'personal' ? 'active' : ''}`}
              onClick={() => switchScope('personal')}
            >
              <i className="fas fa-user-group" aria-hidden="true" /> {t('pages.feed.scopePersonal', 'Mes abonnements')}
            </button>
          )}
        </div>

        {/* Composer */}
        {isAuthenticated && <PostComposer onPostCreated={handlePostCreated} />}

        {/* Erreur */}
        {error && (
          <div className="feed__alert">
            <i className="fas fa-exclamation-circle" /> {error}
          </div>
        )}

        {/* Loading */}
        {loading ? (
          <div className="feed__loading">
            <div className="admin-spinner" />
            <p>{t('pages.feed.loading', 'Chargement...')}</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="feed__empty">
            <div className="feed__empty-icon"><i className="fas fa-book-reader" /></div>
            <h2>{scope === 'personal'
              ? t('pages.feed.emptyTitle', 'Votre fil est vide')
              : t('pages.feed.emptyPublicTitle', 'Aucune publication pour le moment')
            }</h2>
            <p>{scope === 'personal'
              ? t('pages.feed.emptyDesc', "Suivez des auteurs, des éditeurs et d'autres lecteurs pour voir leurs publications ici.")
              : t('pages.feed.emptyPublicDesc', "Soyez le premier à publier ! Partagez un avis, une recommandation ou une actualité.")
            }</p>
            <div className="feed__empty-actions">
              <Link to="/authors" className="feed__empty-btn feed__empty-btn--primary">
                <i className="fas fa-feather-alt" /> {t('pages.feed.discoverAuthors', 'Découvrir les auteurs')}
              </Link>
              <Link to="/organizations" className="feed__empty-btn">
                <i className="fas fa-building" /> {t('pages.feed.browsePublishers', 'Parcourir les éditeurs')}
              </Link>
              <Link to="/clubs" className="feed__empty-btn">
                <i className="fas fa-users" /> {t('pages.feed.joinClub', 'Rejoindre un club')}
              </Link>
            </div>
          </div>
        ) : (
          <div className="feed__posts">
            {posts.map(post => (
              <PostCard key={post.id} post={post} />
            ))}
            {hasMore && (
              <button className="feed__load-more" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? (
                  <><i className="fas fa-spinner fa-spin" /> {t('common.loading', 'Chargement...')}</>
                ) : (
                  <><i className="fas fa-arrow-down" /> {t('pages.feed.loadMore', 'Charger plus')}</>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;
