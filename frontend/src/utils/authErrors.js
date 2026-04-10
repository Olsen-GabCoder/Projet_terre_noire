/**
 * Traduction et mapping des erreurs d'authentification serveur
 * vers des messages utilisateur professionnels.
 */

const ERROR_TRANSLATIONS = {
  // Login
  'No active account found with the given credentials': 'Email ou mot de passe incorrect.',
  'no_active_account': 'Email ou mot de passe incorrect.',
  'Unable to log in with provided credentials.': 'Email ou mot de passe incorrect.',
  // Lockout
  'Request was throttled.': 'Trop de tentatives. Veuillez patienter avant de réessayer.',
  // Registration
  'Un compte avec cet email existe déjà.': 'Cette adresse email est déjà utilisée.',
  'Ce nom d\'utilisateur est déjà pris.': 'Ce nom d\'utilisateur est déjà pris. Essayez-en un autre.',
  'Ce numéro de téléphone est déjà associé à un compte.': 'Ce numéro est déjà utilisé.',
  // Password
  'This password is too common.': 'Ce mot de passe est trop courant.',
  'This password is entirely numeric.': 'Le mot de passe ne peut pas être uniquement des chiffres.',
  'L\'ancien mot de passe est incorrect.': 'L\'ancien mot de passe est incorrect.',
};

const FIELD_NAME_MAP = {
  username: 'Nom d\'utilisateur',
  email: 'Email',
  password: 'Mot de passe',
  password_confirm: 'Confirmation du mot de passe',
  new_password: 'Nouveau mot de passe',
  old_password: 'Ancien mot de passe',
  phone_number: 'Tél��phone',
  first_name: 'Prénom',
  last_name: 'Nom',
  non_field_errors: '',
  detail: '',
};

/**
 * Parse une erreur Axios d'authentification et retourne un objet structuré.
 * @param {Error} error - Erreur Axios
 * @returns {{ message: string, fieldErrors: Object, action: { label: string, link: string } | null }}
 */
export function parseAuthError(error) {
  const result = {
    message: '',
    fieldErrors: {},
    action: null,
  };

  if (!error.response) {
    result.message = 'Impossible de contacter le serveur. Vérifiez votre connexion.';
    return result;
  }

  const { status, data } = error.response;

  // Rate limit / lockout
  if (status === 429) {
    const wait = data?.wait || data?.detail?.match(/(\d+)/)?.[1];
    result.message = wait
      ? `Trop de tentatives. Réessayez dans ${Math.ceil(wait / 60)} minutes.`
      : 'Trop de tentatives. Veuillez patienter.';
    return result;
  }

  // Compte non vérifié
  if (status === 403 && (data?.code === 'email_not_verified' || data?.detail?.includes?.('non vérifié'))) {
    result.message = 'Votre email n\'est pas encore vérifié.';
    result.action = { label: 'Renvoyer l\'email de vérification', link: '/verify-email' };
    return result;
  }

  // Erreur serveur
  if (status >= 500) {
    result.message = 'Erreur serveur. Veuillez réessayer plus tard.';
    return result;
  }

  // Erreur de validation (400/401)
  if (typeof data === 'string') {
    result.message = ERROR_TRANSLATIONS[data] || data;
    return result;
  }

  if (data?.detail) {
    const detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    result.message = ERROR_TRANSLATIONS[detail] || detail;
    return result;
  }

  // Erreurs par champ
  if (typeof data === 'object') {
    const messages = [];
    for (const [field, errors] of Object.entries(data)) {
      if (field === 'message') {
        result.message = errors;
        continue;
      }
      const errorList = Array.isArray(errors) ? errors : [errors];
      const fieldLabel = FIELD_NAME_MAP[field] || field;
      const translatedErrors = errorList.map(e => ERROR_TRANSLATIONS[e] || e);
      result.fieldErrors[field] = translatedErrors;
      if (fieldLabel) {
        messages.push(...translatedErrors);
      } else {
        messages.push(...translatedErrors);
      }
    }
    if (!result.message && messages.length) {
      result.message = messages[0]; // Premier message comme message principal
    }
  }

  if (!result.message) {
    result.message = 'Une erreur est survenue. Veuillez réessayer.';
  }

  return result;
}

export default parseAuthError;
