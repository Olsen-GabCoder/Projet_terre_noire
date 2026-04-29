import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import fr from './locales/fr.json';
import en from './locales/en.json';

// Pays francophones pour auto-détection
const FRANCOPHONE_ISO = [
  'GA','CM','SN','CI','CG','CD','ML','BF','BJ','TG','NE','TD',
  'GN','GQ','CF','MG','KM','DJ','MR','BI','RW','FR','BE','CH','LU','MC','HT','CA',
];

function detectLang() {
  if (typeof window === 'undefined') return 'fr';
  // 1. Choix explicite de l'utilisateur
  const saved = localStorage.getItem('frollot-lang');
  if (saved) return saved;
  // 2. Géolocalisation IP (si déjà en cache)
  try {
    const geo = localStorage.getItem('frollot_geoip');
    if (geo) {
      const { data } = JSON.parse(geo);
      if (data?.country) {
        return FRANCOPHONE_ISO.includes(data.country) ? 'fr' : 'en';
      }
    }
  } catch {}
  // 3. Langue du navigateur
  const browserLang = navigator.language?.slice(0, 2);
  if (browserLang === 'en') return 'en';
  return 'fr';
}

const savedLang = detectLang();

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: fr },
      en: { translation: en },
    },
    lng: savedLang,
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false, // React gère l'échappement
    },
  });

// Persister le choix de langue
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('frollot-lang', lng);
  document.documentElement.setAttribute('lang', lng);
});

export default i18n;
