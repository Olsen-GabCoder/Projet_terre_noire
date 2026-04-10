import { Link, useLocation } from 'react-router-dom';

/**
 * Liens de navigation rapide pour sidebar.
 * @param {Array} links - [{to, icon, label}]
 */
const SideNavLinks = ({ links }) => {
  const { pathname } = useLocation();
  return (
    <nav className="sb-nav">
      {links.map((l, i) => (
        <Link
          key={i}
          to={l.to}
          className={`sb-nav__link ${pathname === l.to ? 'sb-nav__link--active' : ''}`}
        >
          {l.icon && <i className={l.icon} />}
          <span>{l.label}</span>
          {l.badge && <span className="sb-nav__badge">{l.badge}</span>}
        </Link>
      ))}
    </nav>
  );
};

export default SideNavLinks;
