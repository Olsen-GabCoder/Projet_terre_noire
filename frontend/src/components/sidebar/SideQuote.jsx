/**
 * Citation / anecdote littéraire pour sidebar.
 * Utilisé sur les pages légères (auth, transactionnelles).
 */
const SideQuote = ({ text, author, source }) => (
  <div className="sb-quote">
    <i className="fas fa-quote-left sb-quote__icon" />
    <p className="sb-quote__text">{text}</p>
    <div className="sb-quote__attr">
      <strong>{author}</strong>
      {source && <span>{source}</span>}
    </div>
  </div>
);

export default SideQuote;
