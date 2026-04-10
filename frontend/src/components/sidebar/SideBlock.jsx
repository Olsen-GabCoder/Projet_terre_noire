/**
 * Bloc de section sidebar réutilisable.
 * @param {string} title - Titre de la section (optionnel)
 * @param {string} icon - Classe FontAwesome (optionnel)
 * @param {ReactNode} children - Contenu
 * @param {string} className - Classe CSS additionnelle
 */
const SideBlock = ({ title, icon, children, className = '' }) => (
  <div className={`sb-block ${className}`}>
    {title && (
      <h4 className="sb-block__title">
        {icon && <i className={icon} />}
        {title}
      </h4>
    )}
    <div className="sb-block__content">{children}</div>
  </div>
);

export default SideBlock;
