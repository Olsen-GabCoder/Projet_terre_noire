import { useMemo } from 'react';
import { pickContent } from '../../../data/sidebarContent';
import SideQuote from '../SideQuote';
import SideAnecdote from '../SideAnecdote';

const UserSidebar = ({ pathname }) => {
  // Thème contextuel selon la page
  const theme = pathname === '/submit-manuscript' ? 'authors'
    : pathname === '/orders' ? 'shop'
    : pathname === '/wishlist' ? 'catalog'
    : 'catalog';

  const { stories, quotes } = useMemo(() => pickContent(theme, 3, 3), [theme]);

  return (
    <>
      {quotes[0] && <SideQuote text={quotes[0].text} author={quotes[0].author} source={quotes[0].source} />}
      {stories[0] && <SideAnecdote title={stories[0].title} text={stories[0].text} icon={stories[0].icon} />}
      {quotes[1] && <SideQuote text={quotes[1].text} author={quotes[1].author} source={quotes[1].source} />}
      {stories[1] && <SideAnecdote title={stories[1].title} text={stories[1].text} icon={stories[1].icon} />}
      {quotes[2] && <SideQuote text={quotes[2].text} author={quotes[2].author} source={quotes[2].source} />}
      {stories[2] && <SideAnecdote title={stories[2].title} text={stories[2].text} icon={stories[2].icon} />}
    </>
  );
};

export default UserSidebar;
