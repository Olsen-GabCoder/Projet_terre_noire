import { Link } from 'react-router-dom';

/**
 * Carte utilisateur/auteur compacte pour sidebar.
 */
const SideUserCard = ({ to, name, subtitle, avatar }) => (
  <Link to={to} className="sb-usercard">
    <div className="sb-usercard__avatar">
      {avatar ? <img src={avatar} alt={name} /> : <span>{(name || '?')[0]}</span>}
    </div>
    <div className="sb-usercard__info">
      <strong>{name}</strong>
      {subtitle && <span>{subtitle}</span>}
    </div>
  </Link>
);

export default SideUserCard;
