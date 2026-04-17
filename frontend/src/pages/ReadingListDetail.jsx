import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import socialService from '../services/socialService';
import { handleApiError } from '../services/api';
import ShareButtons from '../components/ShareButtons';
import '../styles/Social.css';

const ReadingListDetail = () => {
  const { t } = useTranslation();
  const { slug } = useParams();
  const [list, setList] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchList = async () => {
      try {
        const res = await socialService.getList(slug);
        setList(res.data);
      } catch (err) {
        setError(handleApiError(err));
      }
      setLoading(false);
    };
    fetchList();
  }, [slug]);

  const handleRemoveBook = async (bookId) => {
    try {
      await socialService.removeBookFromList(list.slug, bookId);
      setList({
        ...list,
        items: list.items.filter((i) => i.book?.id !== bookId),
      });
    } catch { /* */ }
  };

  if (loading) return <div className="dashboard-loading"><div className="admin-spinner" /></div>;
  if (error) return <div className="dashboard-alert dashboard-alert--error">{error}</div>;
  if (!list) return null;

  return (
    <div className="reading-list-detail">
      <div className="feed-page__container">
        <Link to="/lists" style={{ color: '#64748b', textDecoration: 'none', fontSize: '0.85rem' }}>
          <i className="fas fa-arrow-left" /> {t('pages.readingListDetail.backToLists')}
        </Link>

        <div style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
          <h1 className="feed-page__title">{list.title}</h1>
          {list.description && <p className="text-muted">{list.description}</p>}
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.25rem' }}>
            {t('pages.readingLists.bookCount', { count: list.items?.length || 0 })} — {list.is_public ? t('pages.readingLists.public') : t('pages.readingLists.private')}
            {list.user_name && ` — ${t('pages.readingListDetail.by', { name: list.user_name })}`}
          </p>
        </div>

        <ShareButtons book={{ title: list.title, description: list.description }} />

        {(!list.items || list.items.length === 0) ? (
          <div className="feed-page__empty">
            <i className="fas fa-book-open" />
            <p>{t('pages.readingListDetail.empty')}</p>
          </div>
        ) : (
          <div className="reading-list__books">
            {list.items.map((item) => (
              <div key={item.id} className="dashboard-card" style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
                {item.book?.cover_image && (
                  <Link to={`/books/${item.book.id}`}>
                    <img src={item.book.cover_image} alt="" style={{ width: 60, height: 85, objectFit: 'cover', borderRadius: 4 }} />
                  </Link>
                )}
                <div style={{ flex: 1 }}>
                  <Link to={`/books/${item.book?.id}`} style={{ textDecoration: 'none', color: '#1e293b' }}>
                    <strong>{item.book?.title}</strong>
                  </Link>
                  {item.book?.author?.full_name && (
                    <p style={{ fontSize: '0.85rem', color: '#64748b' }}>{item.book.author.full_name}</p>
                  )}
                  {item.note && <p style={{ fontSize: '0.85rem', fontStyle: 'italic', marginTop: '0.25rem' }}>"{item.note}"</p>}
                </div>
                <button className="dashboard-btn" style={{ alignSelf: 'center', fontSize: '0.75rem' }} onClick={() => handleRemoveBook(item.book?.id)}>
                  <i className="fas fa-times" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReadingListDetail;
