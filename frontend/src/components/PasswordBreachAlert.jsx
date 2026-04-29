/**
 * PasswordBreachAlert — Affiche une alerte si le mot de passe a fuité.
 * Props: breachCount (number|null), checking (boolean)
 */
import '../styles/PasswordBreach.css';

const PasswordBreachAlert = ({ breachCount, checking }) => {
  if (checking) {
    return (
      <div className="pwd-breach pwd-breach--checking">
        <i className="fas fa-circle-notch fa-spin" /> Vérification de la sécurité...
      </div>
    );
  }

  if (breachCount === null) return null;

  if (breachCount === 0) {
    return (
      <div className="pwd-breach pwd-breach--safe">
        <i className="fas fa-shield-alt" /> Ce mot de passe n'apparaît dans aucune fuite de données connue.
      </div>
    );
  }

  return (
    <div className="pwd-breach pwd-breach--danger">
      <i className="fas fa-exclamation-triangle" />
      <div>
        <strong>Mot de passe compromis !</strong>
        <span> Ce mot de passe est apparu dans {breachCount.toLocaleString('fr-FR')} fuite{breachCount > 1 ? 's' : ''} de données. Choisissez-en un autre.</span>
      </div>
    </div>
  );
};

export default PasswordBreachAlert;
