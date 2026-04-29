/**
 * CountryFlag — Affiche le drapeau d'un pays à partir de son nom français ou anglais.
 * Props:
 *   country — nom du pays ("Gabon", "Cameroun", "France", etc.)
 *   size — taille en px (défaut 20)
 *   className — classe CSS additionnelle
 */

const COUNTRY_MAP = {
  // Afrique francophone (cible principale Frollot)
  'gabon': 'ga', 'cameroun': 'cm', 'cameroon': 'cm',
  'sénégal': 'sn', 'senegal': 'sn',
  'côte d\'ivoire': 'ci', 'cote d\'ivoire': 'ci', 'ivory coast': 'ci',
  'congo': 'cg', 'république du congo': 'cg', 'republic of the congo': 'cg',
  'rdc': 'cd', 'rd congo': 'cd', 'république démocratique du congo': 'cd', 'democratic republic of the congo': 'cd',
  'mali': 'ml', 'burkina faso': 'bf', 'bénin': 'bj', 'benin': 'bj',
  'togo': 'tg', 'niger': 'ne', 'tchad': 'td', 'chad': 'td',
  'guinée': 'gn', 'guinea': 'gn', 'guinée équatoriale': 'gq', 'equatorial guinea': 'gq',
  'centrafrique': 'cf', 'république centrafricaine': 'cf', 'central african republic': 'cf',
  'madagascar': 'mg', 'comores': 'km', 'comoros': 'km',
  'djibouti': 'dj', 'mauritanie': 'mr', 'mauritania': 'mr',
  'burundi': 'bi', 'rwanda': 'rw',
  // Afrique anglophone / lusophone
  'nigeria': 'ng', 'nigéria': 'ng',
  'ghana': 'gh', 'kenya': 'ke', 'tanzanie': 'tz', 'tanzania': 'tz',
  'afrique du sud': 'za', 'south africa': 'za',
  'éthiopie': 'et', 'ethiopia': 'et', 'ouganda': 'ug', 'uganda': 'ug',
  'mozambique': 'mz', 'angola': 'ao', 'cap-vert': 'cv', 'cape verde': 'cv',
  'guinée-bissau': 'gw', 'guinea-bissau': 'gw',
  'são tomé-et-príncipe': 'st',
  // Maghreb
  'maroc': 'ma', 'morocco': 'ma', 'algérie': 'dz', 'algeria': 'dz',
  'tunisie': 'tn', 'tunisia': 'tn', 'libye': 'ly', 'libya': 'ly',
  'égypte': 'eg', 'egypt': 'eg',
  // Europe
  'france': 'fr', 'belgique': 'be', 'belgium': 'be',
  'suisse': 'ch', 'switzerland': 'ch',
  'canada': 'ca', 'luxembourg': 'lu',
  'allemagne': 'de', 'germany': 'de',
  'espagne': 'es', 'spain': 'es',
  'italie': 'it', 'italy': 'it',
  'portugal': 'pt', 'royaume-uni': 'gb', 'united kingdom': 'gb',
  // Amériques
  'états-unis': 'us', 'united states': 'us', 'usa': 'us',
  'brésil': 'br', 'brazil': 'br', 'haïti': 'ht', 'haiti': 'ht',
  // Autres
  'chine': 'cn', 'china': 'cn', 'japon': 'jp', 'japan': 'jp',
  'inde': 'in', 'india': 'in', 'russie': 'ru', 'russia': 'ru',
  'liban': 'lb', 'lebanon': 'lb',
  'île maurice': 'mu', 'mauritius': 'mu',
};

const getCountryCode = (country) => {
  if (!country) return null;
  const key = country.toLowerCase().trim();
  return COUNTRY_MAP[key] || null;
};

const CountryFlag = ({ country, size = 20, className = '' }) => {
  const code = getCountryCode(country);
  if (!code) return null;

  return (
    <img
      src={`https://flagcdn.com/w${Math.min(size * 2, 80)}/${code}.png`}
      srcSet={`https://flagcdn.com/w${Math.min(size * 3, 120)}/${code}.png 2x`}
      alt={country}
      title={country}
      width={size}
      height={Math.round(size * 0.75)}
      className={`country-flag ${className}`}
      style={{ display: 'inline-block', verticalAlign: 'middle', borderRadius: 2 }}
      loading="lazy"
    />
  );
};

export default CountryFlag;
