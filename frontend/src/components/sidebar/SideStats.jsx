/**
 * Bloc de statistiques compactes pour sidebar.
 * @param {Array} stats - [{icon, value, label}]
 */
const SideStats = ({ stats }) => (
  <div className="sb-stats">
    {stats.map((s, i) => (
      <div key={i} className="sb-stats__item">
        {s.icon && <i className={s.icon} />}
        <span className="sb-stats__value">{s.value}</span>
        <span className="sb-stats__label">{s.label}</span>
      </div>
    ))}
  </div>
);

export default SideStats;
