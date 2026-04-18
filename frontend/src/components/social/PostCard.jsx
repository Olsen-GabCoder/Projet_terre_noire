import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import socialService from '../../services/socialService';
import { useAuth } from '../../context/AuthContext';

const PostCard = ({ post }) => {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();

  const TYPE_ICONS = {
    RECOMMENDATION: { icon: 'fas fa-thumbs-up', label: t('pages.feed.recommendation', 'Recommandation'), color: 'var(--color-success)' },
    REVIEW: { icon: 'fas fa-star', label: t('pages.feed.review', 'Avis'), color: 'var(--color-warning)' },
    PLATFORM_REVIEW: { icon: 'fas fa-award', label: t('pages.feed.platformReview', 'Avis Frollot'), color: 'var(--color-primary)' },
    NEWS: { icon: 'fas fa-newspaper', label: t('pages.feed.news', 'Actualité'), color: 'var(--color-info)' },
  };
  const [liked, setLiked] = useState(post.user_has_liked);
  const [likesCount, setLikesCount] = useState(post.likes_count || 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);

  const handleLike = async () => {
    try {
      if (liked) { await socialService.unlikePost(post.id); setLikesCount(c => c - 1); }
      else { await socialService.likePost(post.id); setLikesCount(c => c + 1); }
      setLiked(!liked);
    } catch {}
  };

  const loadComments = async () => {
    if (comments.length > 0) { setShowComments(!showComments); return; }
    setLoadingComments(true);
    try {
      const res = await socialService.getPostComments(post.id);
      setComments(Array.isArray(res.data) ? res.data : res.data.results || []);
      setShowComments(true);
    } catch {}
    setLoadingComments(false);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      const res = await socialService.addPostComment(post.id, { content: commentText });
      setComments([...comments, res.data]);
      setCommentText('');
    } catch {}
  };

  const timeAgo = (dateStr) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return t('pages.feed.justNow', 'À l\'instant');
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}j`;
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const typeInfo = TYPE_ICONS[post.post_type];

  return (
    <article className="pcard">
      {/* Header */}
      <div className="pcard__head">
        <div className="pcard__avatar">
          {post.author_image || post.author?.profile_image ? (
            <img src={post.author_image || post.author?.profile_image} alt="" />
          ) : (
            <span>{(post.author_name || post.author?.full_name || '?')[0]}</span>
          )}
        </div>
        <div className="pcard__meta">
          <strong>{post.author_name || post.author?.full_name || 'Member'}</strong>
          <div className="pcard__meta-row">
            <time>{timeAgo(post.created_at)}</time>
            {typeInfo && (
              <span className="pcard__type-badge" style={{ color: typeInfo.color }}>
                <i className={typeInfo.icon} /> {typeInfo.label}
              </span>
            )}
            {post.rating && (
              <span className="pcard__stars">
                {Array.from({ length: 5 }, (_, i) => (
                  <i key={i} className={i < post.rating ? 'fas fa-star' : 'far fa-star'} />
                ))}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="pcard__body-text">
        <p>{post.content}</p>
      </div>

      {/* Image */}
      {post.image && (
        <div className="pcard__image">
          <img src={post.image} alt="" loading="lazy" />
        </div>
      )}

      {/* Book reference */}
      {post.book && (
        <Link to={`/books/${post.book.id}`} className="pcard__book">
          {post.book.cover_image && <img src={post.book.cover_image} alt="" />}
          <div>
            <strong>{post.book.title}</strong>
            {post.book.author?.full_name && <span>{post.book.author.full_name}</span>}
          </div>
          <i className="fas fa-chevron-right" />
        </Link>
      )}

      {/* Actions */}
      {isAuthenticated && (
        <div className="pcard__actions">
          <button className={`pcard__action ${liked ? 'pcard__action--liked' : ''}`} onClick={handleLike} aria-label={t('social.like', "J'aime")}>
            <i className={liked ? 'fas fa-heart' : 'far fa-heart'} />
            <span>{likesCount}</span>
          </button>
          <button className="pcard__action" onClick={loadComments} aria-label={t('social.comments', 'Commentaires')}>
            <i className="far fa-comment" />
            <span>{post.comments_count || 0}</span>
            {loadingComments && <i className="fas fa-spinner fa-spin" style={{ marginLeft: 4, fontSize: '0.7rem' }} />}
          </button>
          <button className="pcard__action" onClick={() => { navigator.clipboard.writeText(window.location.origin + `/feed#post-${post.id}`); }}>
            <i className="fas fa-share" />
            <span>{t('pages.feed.share', 'Partager')}</span>
          </button>
        </div>
      )}

      {/* Comments */}
      {showComments && (
        <div className="pcard__comments">
          {comments.length === 0 && <p className="pcard__comments-empty">{t('pages.feed.noComments', 'Aucun commentaire. Soyez le premier !')}</p>}
          {comments.map(c => (
            <div key={c.id} className="pcard__comment">
              <div className="pcard__comment-avatar">
                {c.user_image ? <img src={c.user_image} alt="" /> : <span>{(c.user_name || '?')[0]}</span>}
              </div>
              <div className="pcard__comment-body">
                <div className="pcard__comment-head">
                  <strong>{c.user_name || 'Member'}</strong>
                  <time>{timeAgo(c.created_at)}</time>
                </div>
                <p>{c.content}</p>
              </div>
            </div>
          ))}
          <form onSubmit={handleComment} className="pcard__comment-form">
            <input value={commentText} onChange={e => setCommentText(e.target.value)} placeholder={t('pages.feed.writeComment', 'Écrire un commentaire...')} />
            <button type="submit" disabled={!commentText.trim()} aria-label={t('social.sendComment', 'Envoyer')}><i className="fas fa-paper-plane" /></button>
          </form>
        </div>
      )}
      {/* TODO Phase 7: add Report button — requires backend Report model + moderation workflow */}
    </article>
  );
};

export default PostCard;
