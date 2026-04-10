import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import bookService from '../../../services/bookService';
import { pickContent } from '../../../data/sidebarContent';
import SideBlock from '../SideBlock';
import SideBookCard from '../SideBookCard';
import SideQuote from '../SideQuote';
import SideAnecdote from '../SideAnecdote';

const CatalogSidebar = () => {
  const { t } = useTranslation();
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    bookService.getFeaturedBooks?.()
      .then(r => setFeatured((Array.isArray(r.data) ? r.data : r.data?.results || []).slice(0, 4)))
      .catch(() => {});
  }, []);

  const { stories, quotes } = useMemo(() => pickContent('catalog', 3, 3), []);

  return (
    <>
      {featured.length > 0 && (
        <SideBlock title={t('sidebar.featured', 'En vedette')} icon="fas fa-star">
          {featured.map(b => (
            <SideBookCard key={b.id} id={b.id} title={b.title} author={b.author?.full_name || b.author_name} cover={b.cover_image} price={b.price} />
          ))}
        </SideBlock>
      )}

      {quotes[0] && <SideQuote text={quotes[0].text} author={quotes[0].author} source={quotes[0].source} />}
      {stories[0] && <SideAnecdote title={stories[0].title} text={stories[0].text} icon={stories[0].icon} />}
      {quotes[1] && <SideQuote text={quotes[1].text} author={quotes[1].author} source={quotes[1].source} />}
      {stories[1] && <SideAnecdote title={stories[1].title} text={stories[1].text} icon={stories[1].icon} />}
      {quotes[2] && <SideQuote text={quotes[2].text} author={quotes[2].author} source={quotes[2].source} />}
      {stories[2] && <SideAnecdote title={stories[2].title} text={stories[2].text} icon={stories[2].icon} />}
    </>
  );
};

export default CatalogSidebar;
