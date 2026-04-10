/**
 * Anecdote / saviez-vous que pour sidebar.
 * Contenu éditorial long pour les pages légères.
 */
const SideAnecdote = ({ title, text, icon = 'fas fa-lightbulb' }) => (
  <div className="sb-anecdote">
    <div className="sb-anecdote__header">
      <i className={icon} />
      <h4>{title || 'Le saviez-vous ?'}</h4>
    </div>
    <p className="sb-anecdote__text">{text}</p>
  </div>
);

export default SideAnecdote;
