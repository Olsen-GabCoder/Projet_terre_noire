import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import bookService from '../../../services/bookService';
import { pickContent } from '../../../data/sidebarContent';
import SideBlock from '../SideBlock';
import SideBookCard from '../SideBookCard';
import SideQuote from '../SideQuote';
import SideAnecdote from '../SideAnecdote';

const BookDetailSidebar = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const [related, setRelated] = useState([]);

  useEffect(() => {
    if (!id) return;
    bookService.getRelatedBooks?.(id)
      .then(r => {
        const list = Array.isArray(r.data) ? r.data : r.data?.results || [];
        setRelated(list.filter(b => String(b.id) !== String(id)).slice(0, 4));
      })
      .catch(() => {});
  }, [id]);

  const { stories, quotes } = useMemo(() => pickContent('catalog', 2, 2), []);

  return (
    <>
      {related.length > 0 && (
        <SideBlock title={t('sidebar.youMayAlsoLike', 'Vous aimerez aussi')} icon="fas fa-heart">
          {related.map(b => (
            <SideBookCard key={b.id} id={b.id} title={b.title} author={b.author?.full_name || b.author_name} cover={b.cover_image} price={b.price} />
          ))}
        </SideBlock>
      )}

      {quotes[0] && <SideQuote text={quotes[0].text} author={quotes[0].author} source={quotes[0].source} />}
      {stories[0] && <SideAnecdote title={stories[0].title} text={stories[0].text} icon={stories[0].icon} />}
      {quotes[1] && <SideQuote text={quotes[1].text} author={quotes[1].author} source={quotes[1].source} />}
      {stories[1] && <SideAnecdote title={stories[1].title} text={stories[1].text} icon={stories[1].icon} />}
    </>
  );
};

export default BookDetailSidebar;
