import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const ROUTE_LABEL_KEYS = {
  '/': null,
  '/catalog': 'breadcrumbs.catalog',
  '/books': 'breadcrumbs.books',
  '/authors': 'breadcrumbs.authors',
  '/cart': 'breadcrumbs.cart',
  '/wishlist': 'breadcrumbs.wishlist',
  '/checkout': 'breadcrumbs.checkout',
  '/order-success': 'breadcrumbs.orderSuccess',
  '/orders': 'breadcrumbs.orders',
  '/settings': 'breadcrumbs.settings',
  '/submit-manuscript': 'breadcrumbs.submitManuscript',
  '/login': 'breadcrumbs.login',
  '/register': 'breadcrumbs.register',
  '/forgot-password': 'breadcrumbs.forgotPassword',
  '/reset-password': 'breadcrumbs.resetPassword',
  '/verify-email': 'breadcrumbs.verifyEmail',
  '/feed': 'breadcrumbs.feed',
  '/clubs': 'breadcrumbs.clubs',
  '/lists': 'breadcrumbs.lists',
  '/services': 'breadcrumbs.services',
  '/about': 'breadcrumbs.about',
  '/contact': 'breadcrumbs.contact',
  '/delivery': 'breadcrumbs.delivery',
  '/faq': 'breadcrumbs.faq',
  '/support': 'breadcrumbs.support',
  '/privacy': 'breadcrumbs.privacy',
  '/terms': 'breadcrumbs.terms',
  '/cgv': 'breadcrumbs.cgv',
  '/cookies': 'breadcrumbs.cookies',
  '/library': 'breadcrumbs.library',
};

const HIDDEN_ON = ['/', '/login', '/register', '/admin-dashboard'];

const Breadcrumbs = React.memo(function Breadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();
  const path = location.pathname;

  // Ne pas afficher sur certaines pages
  if (HIDDEN_ON.some(p => path === p || path.startsWith('/admin-dashboard'))) return null;
  // Pas sur les pages reader
  if (path.match(/^\/books\/[^/]+\/read$/)) return null;
  // Pas sur les pages chat club (layout plein écran)
  if (path.match(/^\/clubs\/[^/]+$/) && !path.endsWith('/create')) return null;

  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  const crumbs = [{ label: t('breadcrumbs.home'), path: '/' }];

  let builtPath = '';
  for (const segment of segments) {
    builtPath += `/${segment}`;
    const labelKey = ROUTE_LABEL_KEYS[builtPath];
    if (labelKey) {
      crumbs.push({ label: t(labelKey), path: builtPath });
    } else if (!ROUTE_LABEL_KEYS.hasOwnProperty(builtPath)) {
      // Dynamic segment (ID, slug) — show as "..." or skip
      // For /books/:id, /authors/:id, etc., we use a generic label
      const parentPath = builtPath.replace(`/${segment}`, '');
      if (parentPath === '/books') {
        crumbs.push({ label: t('breadcrumbs.detail'), path: builtPath });
      } else if (parentPath === '/authors') {
        crumbs.push({ label: t('breadcrumbs.author'), path: builtPath });
      } else if (parentPath === '/clubs') {
        crumbs.push({ label: t('breadcrumbs.club'), path: builtPath });
      } else if (parentPath === '/lists') {
        crumbs.push({ label: t('breadcrumbs.list'), path: builtPath });
      } else if (parentPath === '/services') {
        crumbs.push({ label: t('breadcrumbs.service'), path: builtPath });
      }
    }
  }

  if (crumbs.length <= 1) return null;

  return (
    <nav className="breadcrumbs" aria-label={t('breadcrumbs.ariaLabel')}>
      <ol className="breadcrumbs__list">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={crumb.path} className="breadcrumbs__item">
              {!isLast ? (
                <>
                  <Link to={crumb.path} className="breadcrumbs__link">{crumb.label}</Link>
                  <i className="fas fa-chevron-right breadcrumbs__sep" />
                </>
              ) : (
                <span className="breadcrumbs__current" aria-current="page">{crumb.label}</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
});

export default Breadcrumbs;
