import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import socialService from '../services/socialService';
import { handleApiError } from '../services/api';
import PostCard from '../components/social/PostCard';

const UserSocialProfile = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [lists, setLists] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [followStatus, setFollowStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [followLoading, setFollowLoading] = useState(false);

  const userId = Number(id);
  const isSelf = currentUser && currentUser.id === userId;

  useEffect(() => {
    fetchProfile();
  }, [id]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError('');
      const [postsRes, listsRes, followersRes] = await Promise.all([
        socialService.getUserPosts(userId).catch(() => ({ data: [] })),
        socialService.getLists({ user: userId }).catch(() => ({ data: [] })),
        socialService.getUserFollowers(userId).catch(() => ({ data: [] })),
      ]);
      setPosts(postsRes.data.results || postsRes.data);
      setLists((listsRes.data.results || listsRes.data).filter((l) => l.is_public));
      setFollowers(followersRes.data.results || followersRes.data);

      // Follow status
      if (currentUser && !isSelf) {
        try {
          const statusRes = await socialService.getFollowStatus({ user_id: userId });
          setFollowStatus(statusRes.data);
        } catch {
          setFollowStatus(null);
        }
      }
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async () => {
    try {
      setFollowLoading(true);
      await socialService.followUser(userId);
      // Re-fetch status
      const statusRes = await socialService.getFollowStatus({ user_id: userId });
      setFollowStatus(statusRes.data);
      const followersRes = await socialService.getUserFollowers(userId);
      setFollowers(followersRes.data.results || followersRes.data);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setFollowLoading(false);
    }
  };

  // Extract profile info from the first post's author or fallback
  const profileInfo = posts.length > 0 ? {
    username: posts[0].author_username || posts[0].author_name,
    fullName: posts[0].author_name || posts[0].author_username,
    avatar: posts[0].author_avatar,
  } : {
    username: `#${userId}`,
    fullName: t('userProfile.user', 'Utilisateur'),
    avatar: null,
  };

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>{t('common.loading')}</div>;
  }

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem 1rem' }}>
      {error && (
        <div style={{ padding: '0.75rem 1rem', backgroundColor: '#fef2f2', color: '#991b1b', borderRadius: '6px', marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      {/* En-tête profil */}
      <div style={{
        display: 'flex',
        gap: '1.5rem',
        alignItems: 'center',
        marginBottom: '2rem',
        padding: '1.5rem',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        backgroundColor: 'white',
        flexWrap: 'wrap',
      }}>
        <div style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          backgroundColor: '#e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}>
          {profileInfo.avatar ? (
            <img src={profileInfo.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <i className="fas fa-user" style={{ fontSize: '2rem', color: '#9ca3af' }} />
          )}
        </div>

        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>{profileInfo.fullName}</h1>
          <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>@{profileInfo.username}</p>

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.9rem' }}>
            <span>
              <strong>{followers.length}</strong> {t('userProfile.followers', 'abonnés')}
            </span>
            <span>
              <strong>{posts.length}</strong> {t('userProfile.posts', 'publications')}
            </span>
            <span>
              <strong>{lists.length}</strong> {t('userProfile.lists', 'listes')}
            </span>
          </div>
        </div>

        {currentUser && !isSelf && (
          <button
            onClick={handleFollow}
            disabled={followLoading}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: followStatus?.is_following ? 'transparent' : '#2563eb',
              color: followStatus?.is_following ? '#2563eb' : 'white',
              border: followStatus?.is_following ? '1px solid #2563eb' : 'none',
              borderRadius: '999px',
              cursor: 'pointer',
              fontSize: '0.9rem',
              fontWeight: 600,
              opacity: followLoading ? 0.6 : 1,
            }}
          >
            {followLoading
              ? t('common.loading')
              : followStatus?.is_following
                ? t('userProfile.unfollow', 'Ne plus suivre')
                : t('userProfile.follow', 'Suivre')
            }
          </button>
        )}
      </div>

      {/* Listes de lecture publiques */}
      {lists.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
            <i className="fas fa-bookmark" style={{ marginRight: '0.5rem' }} />
            {t('userProfile.publicLists', 'Listes de lecture')}
          </h2>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {lists.map((list) => (
              <div key={list.id} style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                padding: '0.75rem 1rem',
                backgroundColor: 'white',
                fontSize: '0.9rem',
              }}>
                <strong>{list.name}</strong>
                {list.books_count !== undefined && (
                  <span style={{ color: '#6b7280', marginLeft: '0.5rem' }}>
                    ({list.books_count} {t('userProfile.books', 'livres')})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publications récentes */}
      <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
        <i className="fas fa-pen-nib" style={{ marginRight: '0.5rem' }} />
        {t('userProfile.recentPosts', 'Publications récentes')}
      </h2>

      {posts.length === 0 ? (
        <p style={{ color: '#6b7280' }}>
          {t('userProfile.noPosts', 'Aucune publication pour le moment.')}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}
    </div>
  );
};

export default UserSocialProfile;
