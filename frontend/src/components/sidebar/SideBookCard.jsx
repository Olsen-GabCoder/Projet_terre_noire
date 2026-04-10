import { Link } from 'react-router-dom';

/**
 * Carte livre compacte pour sidebar.
 */
const SideBookCard = ({ id, title, author, cover, price }) => (
  <Link to={`/books/${id}`} className="sb-bookcard">
    <div className="sb-bookcard__cover">
      {cover ? <img src={cover} alt={title} /> : <i className="fas fa-book" />}
    </div>
    <div className="sb-bookcard__info">
      <strong>{title}</strong>
      {author && <span>{author}</span>}
      {price && <span className="sb-bookcard__price">{parseInt(price).toLocaleString()} FCFA</span>}
    </div>
  </Link>
);

export default SideBookCard;
